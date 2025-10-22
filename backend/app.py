from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import yfinance as yf
import io, requests

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _period_to_days(period: str) -> Optional[int]:
    p = (period or "1y").lower()
    if p == "max":
        return None
    table = {"1mo":31, "3mo":93, "6mo":186, "1y":365, "2y":730, "5y":1825}
    return table.get(p, 365)

def _ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()

def _rsi_wilder(close: pd.Series, period=14) -> pd.Series:
    d = close.diff()
    up = d.clip(lower=0.0)
    dn = -d.clip(upper=0.0)
    au = up.ewm(alpha=1/period, adjust=False).mean()
    ad = dn.ewm(alpha=1/period, adjust=False).mean()
    rs = au / ad.replace(0, np.nan)
    return (100 - 100/(1+rs)).clip(0,100)

def _macd(close: pd.Series, fast=12, slow=26, signal=9):
    line = _ema(close, fast) - _ema(close, slow)
    sig  = _ema(line, signal)
    hist = line - sig
    return line, sig, hist

def _stoch(high, low, close, k=14, smooth=3, d=3):
    hh = high.rolling(k, min_periods=k).max()
    ll = low.rolling(k, min_periods=k).min()
    rawk = 100*(close-ll)/(hh-ll).replace(0,np.nan)
    ks = rawk.rolling(smooth, min_periods=smooth).mean()
    ds = ks.rolling(d, min_periods=d).mean()
    return ks.clip(0,100), ds.clip(0,100)

def _stoch_series(series: pd.Series, k=14, smooth=3, d=3):
    hh = series.rolling(k, min_periods=k).max()
    ll = series.rolling(k, min_periods=k).min()
    rawk = 100*(series-ll)/(hh-ll).replace(0,np.nan)
    ks = rawk.rolling(smooth, min_periods=smooth).mean()
    ds = ks.rolling(d, min_periods=d).mean()
    return ks.clip(0,100), ds.clip(0,100)

def _pivots_close(close: pd.Series, window=8):
    c = close.values
    n = len(c)
    lows: List[int] = []
    highs: List[int] = []
    for i in range(window, n-window):
        seg = c[i-window:i+window+1]
        if np.nanargmin(seg) == window:
            lows.append(i)
        if np.nanargmax(seg) == window:
            highs.append(i)
    return lows, highs

def _stooq_symbol(sym: str) -> str:
    s = sym.strip().lower()
    if "." in s or ":" in s or s.startswith("^"):
        return s
    return f"{s}.us"

def _fetch_stooq(ticker: str, interval: str) -> Optional[pd.DataFrame]:
    if interval not in ("1d", "1wk"):
        return None
    i = "d" if interval == "1d" else "w"
    url = f"https://stooq.com/q/d/l/?s={_stooq_symbol(ticker)}&i={i}"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code != 200 or not r.text or r.text.startswith("<"):
            return None
        df = pd.read_csv(io.StringIO(r.text))
        if not {"Date","Open","High","Low","Close"}.issubset(df.columns):
            return None
        df["Date"] = pd.to_datetime(df["Date"])
        df = df.dropna().set_index("Date").sort_index()
        return df[["Open","High","Low","Close"]]
    except Exception:
        return None

def _fetch_yf(ticker: str, interval: str, period: str) -> Optional[pd.DataFrame]:
    try:
        df = yf.download(
            tickers=ticker,
            period=period,
            interval=interval,
            auto_adjust=False,
            progress=False,
            threads=False
        )
        if df is None or len(df) == 0:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0] for c in df.columns]
        df = df.dropna().copy()
        return df[["Open","High","Low","Close"]]
    except Exception:
        return None

def _lst(s: pd.Series) -> List[Optional[float]]:
    return [None if pd.isna(v) else float(v) for v in s.tolist()]

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
) -> Dict[str, Any]:
    try:
        per_days = _period_to_days(period)
        df = _fetch_stooq(ticker, interval)
        if df is not None and per_days is not None and len(df):
            last_date = df.index.max()
            df = df[df.index >= (last_date - pd.Timedelta(days=per_days+7))]
        if df is None or len(df) < 30:
            df = _fetch_yf(ticker, interval, period)
        if df is None or len(df) < 30:
            return {"ok": False, "ticker": ticker, "error": "no_data"}

        close = df["Close"].astype(float)
        high  = df["High"].astype(float)
        low   = df["Low"].astype(float)
        open_ = df["Open"].astype(float)

        try:
            idx = df.index.tz_localize(None)
        except Exception:
            try:
                idx = df.index.tz_convert(None)
            except Exception:
                idx = df.index
        x = pd.to_datetime(idx).strftime("%Y-%m-%d").tolist()

        ema9  = _ema(close, 9)
        ema21 = _ema(close, 21)
        ema50 = _ema(close, 50)

        basis = close.rolling(20, min_periods=20).mean()
        dev   = close.rolling(20, min_periods=20).std(ddof=0)
        bb_up = basis + 2*dev
        bb_lo = basis - 2*dev

        rsi = _rsi_wilder(close, 14)
        k, d = _stoch(high, low, close, 14, 3, 3)
        rsi_k, rsi_d = _stoch_series(rsi, 14, 3, 3)

        macd_line, macd_sig, macd_hist = _macd(close, 12, 26, 9)

        lows_idx, highs_idx = _pivots_close(close, window=8)

        trend = "flat"
        if len(close) > 0:
            c = close.iloc[-1]
            e9 = ema9.iloc[-1]
            e21 = ema21.iloc[-1]
            e50 = ema50.iloc[-1]
            if e9 > e21 > e50 and c > e50:
                trend = "up"
            elif e9 < e21 < e50 and c < e50:
                trend = "down"

        payload = {
            "ok": True,
            "ticker": ticker.upper(),
            "interval": interval,
            "period": period,
            "ohlc": {
                "x": x,
                "open": _lst(open_),
                "high": _lst(high),
                "low": _lst(low),
                "close": _lst(close),
            },
            "indicators": {
                "bb": {"basis": _lst(basis), "upper": _lst(bb_up), "lower": _lst(bb_lo)},
                "ema": {"ema9": _lst(ema9), "ema21": _lst(ema21), "ema50": _lst(ema50)},
                "rsi": {"rsi": _lst(rsi)},
                "stoch": {"k": _lst(k), "d": _lst(d)},
                "stochrsi": {"k": _lst(rsi_k), "d": _lst(rsi_d)},
                "macd": {"line": _lst(macd_line), "signal": _lst(macd_sig), "hist": _lst(macd_hist)},
                "pivots": {"lows": lows_idx, "highs": highs_idx},
                "trend": {"label": trend}
            },
        }
        return payload
    except Exception as e:
        return {"ok": False, "ticker": ticker, "error": str(e)}
