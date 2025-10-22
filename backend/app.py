from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io, re, requests, datetime as dt
import yfinance as yf

app = FastAPI(title="Market Vision Pro API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ---------- helpers

def _clean_ticker(t: str) -> str:
    t = (t or "").strip()
    # TradingView-Stil in YF umbiegen (ein paar häufige Fälle)
    if ":" in t:
        exch, base = t.split(":", 1)
        exch = exch.upper(); base = base.upper()
        if exch in {"NASDAQ","NYSE","AMEX"}:
            return base
        mapping = {
            "TVC:SPX": "^GSPC",
            "TVC:NDQ": "^NDX",
            "TVC:DEU40": "^GDAXI",
            "TVC:DJI": "^DJI",
            "TVC:VIX": "^VIX",
            "FX:EURUSD": "EURUSD=X",
            "OANDA:XAUUSD": "XAUUSD=X",
            "NYMEX:CL1!": "CL=F",
        }
        return mapping.get(f"{exch}:{base}", base)
    return t.upper()

def _stooq_candidates(sym: str):
    s = sym.lower()
    cands = [s]
    if not s.endswith(".us") and re.fullmatch(r"[a-z0-9\.\-^]+", s):
        cands.append(f"{s}.us")
    if s.startswith("^"):
        cands.append(s[1:])       # ^spx -> spx
        cands.append(f"{s[1:]}.us")
    # dedupe, keep order
    out, seen = [], set()
    for x in cands:
        if x not in seen:
            out.append(x); seen.add(x)
    return out

def _fetch_stooq(ticker: str, interval: str) -> pd.DataFrame | None:
    itv_map = {"1d":"d", "1wk":"w", "1mo":"m"}
    if interval not in itv_map:
        return None  # Stooq liefert kein 1h
    i = itv_map[interval]
    for sym in _stooq_candidates(ticker):
        url = f"https://stooq.com/q/d/l/?s={sym}&i={i}"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code != 200 or "Date,Open,High,Low,Close,Volume" not in r.text:
                continue
            df = pd.read_csv(io.StringIO(r.text))
            if df.empty:
                continue
            df["Date"] = pd.to_datetime(df["Date"])
            df = df.rename(columns=str.title).rename(columns={"Date":"Datetime"})
            df = df.sort_values("Datetime").set_index("Datetime")
            df = df[["Open","High","Low","Close","Volume"]].dropna()
            if len(df) >= 50:
                return df
        except Exception:
            continue
    return None

def _fetch_yf(ticker: str, interval: str) -> pd.DataFrame | None:
    # kurze, robuste History je nach Intervall
    per = {"1h":"730d", "1d":"5y", "1wk":"20y"}.get(interval, "5y")
    try:
        df = yf.download(ticker, period=per, interval=interval, auto_adjust=True, progress=False)
        if df is None or df.empty: 
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0] for c in df.columns]
        df = df.rename_axis("Datetime").sort_index()
        # yfinance liefert manchmal ein letztes unvollständiges Bar – optional trimmen
        return df[["Open","High","Low","Close","Volume"]].dropna()
    except Exception:
        return None

def _fetch_ohlcv(ticker: str, interval: str) -> pd.DataFrame:
    t = _clean_ticker(ticker)
    df = _fetch_stooq(t, interval)
    if df is None:
        df = _fetch_yf(t, interval)
    if df is None or df.empty:
        raise RuntimeError("no_data")
    return df

# ---------- indicators (kompakt & schnell)

def _ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()

def _rsi_wilder(close: pd.Series, period=14) -> pd.Series:
    d = close.diff()
    up = d.clip(lower=0.0)
    dn = -d.clip(upper=0.0)
    au = up.ewm(alpha=1/period, adjust=False).mean()
    ad = dn.ewm(alpha=1/period, adjust=False).mean()
    rs = au / ad.replace(0, np.nan)
    rsi = 100 - 100/(1+rs)
    return rsi.clip(0, 100)

def _stoch(high, low, close, k=14, smooth=3, d=3):
    hh = high.rolling(k, min_periods=k).max()
    ll = low.rolling(k, min_periods=k).min()
    rawk = 100*(close-ll)/(hh-ll).replace(0, np.nan)
    kline = rawk.rolling(smooth, min_periods=smooth).mean()
    dline = kline.rolling(d, min_periods=d).mean()
    return kline.clip(0,100), dline.clip(0,100)

def _stoch_rsi(close, period=14, k=3, d=3):
    r = _rsi_wilder(close, period)
    rmin = r.rolling(period, min_periods=period).min()
    rmax = r.rolling(period, min_periods=period).max()
    sr = 100*(r - rmin)/(rmax-rmin).replace(0, np.nan)
    kline = sr.rolling(k, min_periods=k).mean()
    dline = kline.rolling(d, min_periods=d).mean()
    return kline.clip(0,100), dline.clip(0,100)

def _macd(close, f=12, s=26, sig=9):
    macd = _ema(close, f) - _ema(close, s)
    signal = _ema(macd, sig)
    hist = macd - signal
    return macd, signal, hist

def _bollinger(close, n=20, k=2.0):
    m = close.rolling(n, min_periods=n).mean()
    sd = close.rolling(n, min_periods=n).std()
    return m, m + k*sd, m - k*sd

def _trend_strength(close: pd.Series, lookback=60):
    if close.isna().sum() > 0:
        close = close.dropna()
    if len(close) < lookback+5:
        return "range", 0.0, 0.0
    y = close.tail(lookback).values.astype(float)
    x = np.arange(len(y))
    xm, ym = x.mean(), y.mean()
    cov = ((x-xm)*(y-ym)).sum()
    varx = ((x-xm)**2).sum()
    if varx == 0:
        return "range", 0.0, 0.0
    slope = cov/varx
    r = cov / (np.sqrt(varx) * np.sqrt(((y-ym)**2).sum()) + 1e-9)
    r2 = float(r*r)
    norm_slope = slope / max(1e-9, abs(ym))
    if norm_slope*lookback > 0.05 and r2 > 0.30:
        return ("up" if slope>0 else "down"), float(abs(norm_slope)*lookback), r2
    return "range", float(abs(norm_slope)*lookback), r2

# ---------- API

@app.get("/v1/indicators")
def indicators(
    ticker: str = Query(..., description="Symbol, z.B. AAPL"),
    interval: str = Query("1d", pattern="^(1h|1d|1wk)$")
):
    try:
        df = _fetch_ohlcv(ticker, interval)
        # kompaktes Window für die Kennzahlen
        tail = df.tail(300).copy()

        close = tail["Close"]; high = tail["High"]; low = tail["Low"]

        ema9  = _ema(close, 9);  ema21 = _ema(close, 21); ema50 = _ema(close, 50)
        bb_m, bb_u, bb_l = _bollinger(close, 20, 2.0)

        k, d = _stoch(high, low, close, 14, 3, 3)
        sr_k, sr_d = _stoch_rsi(close, 14, 3, 3)
        rsi = _rsi_wilder(close, 14)
        macd, macds, macdh = _macd(close, 12, 26, 9)

        tdir, tstr, r2 = _trend_strength(_ema(close, 50), 60)

        boxes = [
            {"id":"box1","label":"Price + BB + EMA(9/21/50)",
             "value": float(close.iloc[-1]),
             "extras":{
                 "ema9": float(ema9.iloc[-1]), "ema21": float(ema21.iloc[-1]), "ema50": float(ema50.iloc[-1]),
                 "bb_upper": float(bb_u.iloc[-1]), "bb_lower": float(bb_l.iloc[-1])
             }},
            {"id":"box2","label":"Stochastic (14,3,3)",
             "value": float(k.iloc[-1]),
             "extras":{"%K": float(k.iloc[-1]), "%D": float(d.iloc[-1])}},
            {"id":"box3","label":"Stoch RSI (14,3,3)",
             "value": float(sr_k.iloc[-1]),
             "extras":{"%K": float(sr_k.iloc[-1]), "%D": float(sr_d.iloc[-1])}},
            {"id":"box4","label":"RSI (14)","value": float(rsi.iloc[-1])},
            {"id":"box5","label":"MACD (12,26,9)",
             "value": float(macd.iloc[-1]),
             "extras":{"signal": float(macds.iloc[-1]), "hist": float(macdh.iloc[-1])}},
            {"id":"box6","label":"Trend",
             "value": tdir, "extras":{"strength": tstr, "r2": float(r2)}},
        ]

        return {"ok": True, "ticker": _clean_ticker(ticker).upper(), "interval": interval, "boxes": boxes}
    except Exception as e:
        return {"ok": False, "error": str(e), "ticker": ticker, "interval": interval}
