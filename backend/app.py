from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import yfinance as yf

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def _yf_interval(iv: str) -> str:
    m = {"1h": "60m", "1d": "1d", "1wk": "1wk"}
    return m.get(iv, "1d")

def _yf_period(iv: str) -> str:
    if iv == "1h":
        return "730d"
    if iv == "1wk":
        return "10y"
    return "3y"

def ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()

def rsi_wilder(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    avg_gain = up.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = down.ewm(alpha=1/period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    return out.clip(0, 100)

def stoch(high, low, close, k_period=14, k_smooth=3, d_period=3):
    hh = high.rolling(k_period, min_periods=k_period).max()
    ll = low.rolling(k_period, min_periods=k_period).min()
    denom = (hh - ll).replace(0, np.nan)
    raw_k = 100 * (close - ll) / denom
    k = raw_k.rolling(k_smooth, min_periods=k_smooth).mean()
    d = k.rolling(d_period, min_periods=d_period).mean()
    return k.clip(0, 100), d.clip(0, 100)

def stoch_rsi(close, period=14, k=3, d=3):
    r = rsi_wilder(close, period)
    rmin = r.rolling(period, min_periods=period).min()
    rmax = r.rolling(period, min_periods=period).max()
    denom = (rmax - rmin).replace(0, np.nan)
    sr = 100 * (r - rmin) / denom
    kline = sr.rolling(k, min_periods=k).mean()
    dline = kline.rolling(d, min_periods=d).mean()
    return kline.clip(0, 100), dline.clip(0, 100)

def macd_tv(close, fast=12, slow=26, signal=9):
    macd_line = ema(close, fast) - ema(close, slow)
    macd_sig = ema(macd_line, signal)
    macd_hist = macd_line - macd_sig
    return macd_line, macd_sig, macd_hist

def bollinger(close, n=20, mult=2.0):
    sma = close.rolling(n, min_periods=n).mean()
    std = close.rolling(n, min_periods=n).std()
    upper = sma + mult * std
    lower = sma - mult * std
    return sma, upper, lower

def trend_strength(series: pd.Series, lookback=60):
    y = pd.to_numeric(series.dropna(), errors="coerce").values
    if len(y) < lookback + 2:
        return 0.0, 0.0
    y = y[-lookback:]
    x = np.arange(len(y), dtype=float)
    x_mean, y_mean = x.mean(), y.mean()
    cov = ((x - x_mean) * (y - y_mean)).sum()
    var = ((x - x_mean) ** 2).sum()
    if var == 0:
        return 0.0, 0.0
    slope = cov / var
    r = cov / (np.sqrt(var) * np.sqrt(((y - y_mean) ** 2).sum()) + 1e-9)
    r2 = float(r * r)
    norm_slope = float(abs(slope) / max(1e-9, y_mean))
    return norm_slope, r2

def fetch_df(ticker: str, interval: str) -> pd.DataFrame:
    iv = _yf_interval(interval)
    per = _yf_period(interval)
    df = yf.download(
        tickers=ticker,
        period=per,
        interval=iv,
        auto_adjust=True,
        progress=False,
        threads=False,
    )
    if df is None or len(df) == 0:
        return pd.DataFrame()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    df = df.dropna().copy()
    df.index = pd.to_datetime(df.index)
    return df

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/v1/indicators")
def indicators(ticker: str = Query("AAPL"), interval: str = Query("1d")):
    try:
        df = fetch_df(ticker.strip(), interval.strip())
        if df.empty or len(df) < 60:
            return {"ok": True, "ticker": ticker.upper(), "interval": interval, "boxes": [], "error": "no_data"}
        close = pd.to_numeric(df["Close"], errors="coerce")
        high = pd.to_numeric(df["High"], errors="coerce")
        low = pd.to_numeric(df["Low"], errors="coerce")

        ema9 = ema(close, 9)
        ema21 = ema(close, 21)
        ema50 = ema(close, 50)
        bb_mid, bb_up, bb_lo = bollinger(close, 20, 2.0)

        k, d = stoch(high, low, close, 14, 3, 3)
        srk, srd = stoch_rsi(close, 14, 3, 3)
        rsi = rsi_wilder(close, 14)
        macd_line, macd_sig, macd_hist = macd_tv(close, 12, 26, 9)

        ts, r2 = trend_strength(ema50, lookback=60)
        slope = float(np.sign((ema50.iloc[-1] - ema50.iloc[-10]) if len(ema50) >= 10 else 0.0))
        tdir = "up" if slope > 0 else ("down" if slope < 0 else "flat")
        tstr = float(ts * 60.0)

        boxes = [
            {
                "id": "box1",
                "label": "Price • BB • EMA(9/21/50)",
                "value": float(close.iloc[-1]),
                "extras": {
                    "ema9": float(ema9.iloc[-1]),
                    "ema21": float(ema21.iloc[-1]),
                    "ema50": float(ema50.iloc[-1]),
                    "bb_upper": float(bb_up.iloc[-1]),
                    "bb_lower": float(bb_lo.iloc[-1]),
                },
            },
            {
                "id": "box2",
                "label": "Stochastic (14,3,3)",
                "value": float(k.iloc[-1]),
                "extras": {"k": float(k.iloc[-1]), "d": float(d.iloc[-1])},
            },
            {
                "id": "box3",
                "label": "Stoch RSI (K/D)",
                "value": float(srk.iloc[-1]),
                "extras": {"k": float(srk.iloc[-1]), "d": float(srd.iloc[-1])},
            },
            {
                "id": "box4",
                "label": "RSI (14)",
                "value": float(rsi.iloc[-1]),
            },
            {
                "id": "box5",
                "label": "MACD (12,26,9)",
                "value": float(macd_hist.iloc[-1]),
                "extras": {"macd": float(macd_line.iloc[-1]), "signal": float(macd_sig.iloc[-1])},
            },
            {
                "id": "box6",
                "label": "Trend",
                "value": tdir,
                "extras": {"strength": tstr, "r2": float(r2)},
            },
        ]

        return {
            "ok": True,
            "ticker": ticker.upper(),
            "interval": interval,
            "boxes": boxes,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
