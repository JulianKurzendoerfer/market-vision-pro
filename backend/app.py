import io, math, json, datetime as dt
from typing import List, Dict, Any
import numpy as np
import pandas as pd
import requests
import yfinance as yf
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

def _clean_symbol(s: str) -> str:
    return (s or "").strip().upper()

def _ensure_lists(d):
    if isinstance(d, dict):
        return {k: _ensure_lists(v) for k, v in d.items()}
    if isinstance(d, (list, tuple, np.ndarray, pd.Series)):
        arr = pd.Series(d, dtype="float64").replace([np.inf, -np.inf], np.nan).fillna(method="ffill").fillna(method="bfill")
        return arr.astype(float).tolist()
    return d

def _ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False).mean()

def _macd(close: pd.Series):
    line = _ema(close,12) - _ema(close,26)
    sig  = _ema(line,9)
    hist = line - sig
    return line, sig, hist

def _rsi(close: pd.Series, n: int = 14) -> pd.Series:
    d = close.diff()
    up = d.clip(lower=0)
    dn = -d.clip(upper=0)
    rs = up.ewm(alpha=1/n, adjust=False).mean() / (dn.ewm(alpha=1/n, adjust=False).mean().replace(0,np.nan))
    return (100 - 100/(1+rs)).clip(0,100)

def _stoch(high, low, close, k=14, smooth=3, d=3):
    hh = high.rolling(k, min_periods=k).max()
    ll = low.rolling(k, min_periods=k).min()
    raw = 100*(close-ll)/(hh-ll).replace(0,np.nan)
    K = raw.rolling(smooth, min_periods=smooth).mean().clip(0,100)
    D = K.rolling(d, min_periods=d).mean().clip(0,100)
    return K, D

def _stoch_rsi(close, n=14, k=3, d=3):
    r = _rsi(close, n)
    rmin = r.rolling(n, min_periods=n).min()
    rmax = r.rolling(n, min_periods=n).max()
    raw = 100*(r-rmin)/(rmax-rmin).replace(0,np.nan)
    K = raw.rolling(k, min_periods=k).mean().clip(0,100)
    D = K.rolling(d, min_periods=d).mean().clip(0,100)
    return K, D

def _pivots(close: pd.Series, w: int = 8):
    roll_min = close.rolling(w, center=True, min_periods=1).min()
    roll_max = close.rolling(w, center=True, min_periods=1).max()
    lows  = close.index[close.eq(roll_min)]
    highs = close.index[close.eq(roll_max)]
    lows_i  = [close.index.get_loc(i) for i in lows]
    highs_i = [close.index.get_loc(i) for i in highs]
    return lows_i, highs_i

def fetch_stooq_daily(sym: str) -> pd.DataFrame | None:
    url = f"https://stooq.com/q/d/l/?s={sym.lower()}&i=d"
    try:
        r = requests.get(url, timeout=12)
        if r.status_code != 200 or len(r.text) < 100:
            return None
        df = pd.read_csv(io.StringIO(r.text))
        if "Date" not in df.columns:
            return None
        df["Date"] = pd.to_datetime(df["Date"])
        df = df.rename(columns={"Open":"Open","High":"High","Low":"Low","Close":"Close","Volume":"Volume"})
        df = df.dropna().sort_values("Date").set_index("Date")
        return df
    except Exception:
        return None

def fetch_prices(ticker: str, interval: str, years: int, adj: bool) -> pd.DataFrame:
    if interval == "1d":
        df = fetch_stooq_daily(ticker)
        if df is not None:
            cutoff = pd.Timestamp.today(tz=None) - pd.DateOffset(years=int(years))
            df = df[df.index >= cutoff]
            if len(df) >= 60:
                return df
    end = pd.Timestamp.today().normalize()
    start = end - pd.DateOffset(years=int(years))
    yf_df = yf.download(ticker, start=start, end=end, interval=interval, auto_adjust=adj, progress=False)
    if yf_df is None or len(yf_df) == 0:
        raise ValueError("no_data")
    if isinstance(yf_df.columns, pd.MultiIndex):
        yf_df.columns = [c[0] for c in yf_df.columns]
    yf_df = yf_df.dropna().copy()
    yf_df.index = pd.to_datetime(yf_df.index)
    if interval == "1h" and len(yf_df) > 0:
        step = pd.Timedelta(hours=1)
        now = pd.Timestamp.utcnow().tz_localize(None)
        if (now - yf_df.index[-1].to_pydatetime()) < step:
            yf_df = yf_df.iloc[:-1]
    return yf_df

def make_payload(df: pd.DataFrame, interval: str) -> Dict[str, Any]:
    close, high, low, open_ = df["Close"], df["High"], df["Low"], df["Open"]
    ema9, ema21, ema50 = _ema(close,9), _ema(close,21), _ema(close,50)
    sma20 = close.rolling(20, min_periods=20).mean()
    std20 = close.rolling(20, min_periods=20).std()
    bb_u, bb_b, bb_l = sma20+2*std20, sma20, sma20-2*std20
    k, d = _stoch(high, low, close, 14,3,3)
    srk, srd = _stoch_rsi(close,14,3,3)
    rsi = _rsi(close,14)
    mline, msignal, mhist = _macd(close)
    lows_i, highs_i = _pivots(close, w=8)
    x = [ts.isoformat() for ts in df.index.to_pydatetime().tolist()]
    ohlc = dict(
        x=x,
        open=_ensure_lists(open_),
        high=_ensure_lists(high),
        low=_ensure_lists(low),
        close=_ensure_lists(close),
        bb_upper=_ensure_lists(bb_u),
        bb_lower=_ensure_lists(bb_l),
        bb_basis=_ensure_lists(bb_b),
        ema9=_ensure_lists(ema9),
        ema21=_ensure_lists(ema21),
        ema50=_ensure_lists(ema50),
    )
    indicators = dict(
        stoch=dict(k=_ensure_lists(k), d=_ensure_lists(d)),
        stochrsi=dict(k=_ensure_lists(srk), d=_ensure_lists(srd)),
        rsi=_ensure_lists(rsi),
        macd=dict(line=_ensure_lists(mline), signal=_ensure_lists(msignal), hist=_ensure_lists(mhist)),
    )
    pivots = dict(
        lows=lows_i,
        highs=highs_i,
    )
    return dict(ok=True, interval=interval, ohlc=ohlc, indicators=indicators, pivots=pivots)

@app.get("/")
def root():
    return {"ok": True, "service": "mvp-api"}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/v1/chart")
def chart(
    ticker: str = Query(...),
    interval: str = Query("1d"),
    period: str = Query("1y"),
    adj: bool = Query(True),
):
    t = _clean_symbol(ticker)
    years_map = {"1y":1, "2y":2, "3y":3, "4y":4, "5y":5}
    years = years_map.get(period, 1)
    try:
        df = fetch_prices(t, interval, years, adj)
        payload = make_payload(df, interval)
        payload["ticker"] = t
        return payload
    except Exception as e:
        return {"ok": False, "ticker": t, "error": str(e), "interval": interval, "ohlc": {"x":[], "open":[], "high":[], "low":[], "close":[]}, "indicators": {}, "pivots": {"lows":[], "highs":[]}}
