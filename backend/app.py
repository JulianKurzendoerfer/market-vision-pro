import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def _map_interval(iv: str):
    iv = (iv or "1d").lower()
    if iv == "1h":
        return dict(interval="60m", period="60d")
    if iv == "1wk":
        return dict(interval="1wk", period="5y")
    return dict(interval="1d", period="1y")

def ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()

def rsi_wilder(close: pd.Series, period=14) -> pd.Series:
    delta = close.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    roll_up = up.ewm(alpha=1/period, adjust=False).mean()
    roll_down = down.ewm(alpha=1/period, adjust=False).mean().replace(0, np.nan)
    rs = roll_up / roll_down
    return (100 - (100 / (1 + rs))).clip(0, 100)

def stochastic(high: pd.Series, low: pd.Series, close: pd.Series,
               k_period=14, k_smooth=3, d_period=3):
    hh = high.rolling(k_period, min_periods=k_period).max()
    ll = low.rolling(k_period, min_periods=k_period).min()
    denom = (hh - ll).replace(0, np.nan)
    raw_k = 100 * (close - ll) / denom
    k = raw_k.rolling(k_smooth, min_periods=k_smooth).mean()
    d = k.rolling(d_period, min_periods=d_period).mean()
    return k.clip(0, 100), d.clip(0, 100)

def stoch_rsi(close: pd.Series, period=14, k=3, d=3):
    r = rsi_wilder(close, period)
    rmin = r.rolling(period, min_periods=period).min()
    rmax = r.rolling(period, min_periods=period).max()
    denom = (rmax - rmin).replace(0, np.nan)
    sr = 100 * (r - rmin) / denom
    kline = sr.rolling(k, min_periods=k).mean()
    dline = kline.rolling(d, min_periods=d).mean()
    return kline.clip(0, 100), dline.clip(0, 100)

def macd_tv(close: pd.Series, fast=12, slow=26, signal=9):
    m = ema(close, fast) - ema(close, slow)
    sig = ema(m, signal)
    hist = m - sig
    return m, sig, hist

def trend_direction(close: pd.Series, lookback=60):
    s = close.dropna().astype(float)
    if len(s) < lookback + 2:
        return "unknown", 0.0
    y = s[-lookback:].values
    x = np.arange(len(y))
    x_mean, y_mean = x.mean(), y.mean()
    cov = ((x - x_mean) * (y - y_mean)).sum()
    var = ((x - x_mean) ** 2).sum() + 1e-9
    slope = cov / var
    dirn = "up" if slope > 0 else ("down" if slope < 0 else "flat")
    strength = float(abs(slope) / max(1e-9, y_mean))
    return dirn, strength

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/v1/indicators")
def indicators(
    ticker: str = Query(..., min_length=1),
    interval: str = Query("1d", regex="^(1h|1d|1wk)$")
):
    try:
        m = _map_interval(interval)
        df = yf.download(
            ticker.strip(), period=m["period"], interval=m["interval"],
            auto_adjust=True, progress=False
        )
        if df is None or df.empty:
            return {"ok": True, "ticker": ticker, "interval": interval,
                    "boxes": [], "error": "no_data"}
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0] for c in df.columns]
        df = df.dropna().copy()
        close = df["Close"]
        high = df["High"]
        low  = df["Low"]
        ema9  = ema(close, 9)
        ema21 = ema(close, 21)
        ema50 = ema(close, 50)
        sma20 = close.rolling(20, min_periods=20).mean()
        std20 = close.rolling(20, min_periods=20).std()
        bb_upper = sma20 + 2*std20
        bb_lower = sma20 - 2*std20
        rsi = rsi_wilder(close, 14)
        k, d = stochastic(high, low, close, 14, 3, 3)
        sr_k, sr_d = stoch_rsi(close, 14, 3, 3)
        macd, macd_sig, macd_hist = macd_tv(close, 12, 26, 9)
        tdir, tstr = trend_direction(ema50, lookback=60)
        last = lambda s: (None if s is None or len(s)==0 else float(s.iloc[-1]))
        payload = {
            "ok": True,
            "ticker": ticker.upper(),
            "interval": interval,
            "boxes": [
                {"id": "box1", "label": "Price • BB • EMA(9/21/50)",
                 "value": last(close),
                 "extras": {"ema9": last(ema9), "ema21": last(ema21), "ema50": last(ema50),
                            "bb_upper": last(bb_upper), "bb_lower": last(bb_lower)}},
                {"id": "box2", "label": "Stochastic (14,3,3)",
                 "value": last(k), "extras": {"k": last(k), "d": last(d)}},
                {"id": "box3", "label": "Stoch RSI (14,3,3)",
                 "value": last(sr_k), "extras": {"k": last(sr_k), "d": last(sr_d)}},
                {"id": "box4", "label": "RSI (14)", "value": last(rsi)},
                {"id": "box5", "label": "MACD (12,26,9)",
                 "value": last(macd_hist),
                 "extras": {"macd": last(macd), "signal": last(macd_sig), "hist": last(macd_hist)}},
                {"id": "box6", "label": "Trend (EMA50 slope)",
                 "value": tdir, "extras": {"strength": tstr}}
            ]
        }
        return payload
    except Exception as e:
        return {"ok": False, "error": str(e)}
