import os, io, math, re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
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
    allow_methods=["*"],
    allow_headers=["*"],
)

def _tolist(s: pd.Series) -> List[Optional[float]]:
    return [None if pd.isna(v) else float(v) for v in s.astype(float)]

def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()

def rsi_wilder(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100/(1+rs))
    return rsi.clip(0, 100)

def macd_tv(close: pd.Series, fast=12, slow=26, signal=9):
    macd_line = ema(close, fast) - ema(close, slow)
    macd_sig  = ema(macd_line, signal)
    macd_hist = macd_line - macd_sig
    return macd_line, macd_sig, macd_hist

def stochastic_full(h, l, c, k_period=14, k_smooth=3, d_period=3):
    hh = h.rolling(k_period, min_periods=k_period).max()
    ll = l.rolling(k_period, min_periods=k_period).min()
    denom = (hh - ll).replace(0, np.nan)
    raw_k = 100 * (c - ll) / denom
    k_slow = raw_k.rolling(k_smooth, min_periods=k_smooth).mean()
    d_slow = k_slow.rolling(d_period, min_periods=d_period).mean()
    return k_slow.clip(0, 100), d_slow.clip(0, 100)

def bollinger(c: pd.Series, n=20):
    sma = c.rolling(n, min_periods=n).mean()
    std = c.rolling(n, min_periods=n).std()
    return sma, sma + 2*std, sma - 2*std

def _pivot_indices(series: pd.Series, order: int = 8):
    from scipy.signal import argrelextrema
    p = pd.to_numeric(series, errors="coerce").values
    if len(p) < (2*order+1):
        return [], []
    lows  = argrelextrema(p, np.less_equal, order=order)[0].tolist()
    highs = argrelextrema(p, np.greater_equal, order=order)[0].tolist()
    return lows, highs

def _period_to_rows(period: str, interval: str) -> int:
    period = (period or "1y").lower()
    if interval == "1wk":
        mapping = {"6mo":26, "1y":52, "2y":104, "3y":156, "5y":260, "max":10000}
    else:
        mapping = {"6mo":126, "1y":252, "2y":504, "3y":756, "5y":1260, "max":100000}
    return mapping.get(period, 252)

def _stooq_candidates(ticker: str) -> List[str]:
    t = ticker.lower()
    cands = [t]
    if not t.endswith(".us") and re.fullmatch(r"[a-z\.]{1,10}", t):
        cands.append(f"{t}.us")
    return list(dict.fromkeys(cands))

def _fetch_stooq(ticker: str, interval: str, rows: int) -> Optional[pd.DataFrame]:
    if interval not in ("1d","1wk"): 
        return None
    i = "d" if interval=="1d" else "w"
    for sym in _stooq_candidates(ticker):
        url = f"https://stooq.com/q/d/l/?s={sym}&i={i}"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code != 200: 
                continue
            text = r.text.strip()
            if not text.lower().startswith("date,open,high,low,close,volume"):
                continue
            df = pd.read_csv(io.StringIO(text))
            df["Date"] = pd.to_datetime(df["Date"])
            df = df.sort_values("Date").set_index("Date")
            df = df.rename(columns=str.title)
            df = df.tail(rows).dropna()
            if len(df) >= 30:
                return df
        except Exception:
            continue
    return None

def _fetch_yf(ticker: str, interval: str, period: str) -> Optional[pd.DataFrame]:
    try:
        if interval not in ("1d", "1wk"):
            interval = "1d"
        df = yf.download(ticker, period=period, interval=interval, auto_adjust=False, progress=False, threads=False)
        if df is None or len(df)==0:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0] for c in df.columns]
        df = df.dropna().copy()
        df.index = pd.to_datetime(df.index)
        return df
    except Exception:
        return None

def _fmt_x(index: pd.Index, interval: str) -> List[str]:
    if interval == "1wk":
        return [pd.Timestamp(x).strftime("%Y-%m-%d") for x in index]
    else:
        return [pd.Timestamp(x).strftime("%Y-%m-%d") for x in index]

def _chart_payload(df: pd.DataFrame, interval: str, ticker: str, period: str) -> Dict[str, Any]:
    close = df["Close"].astype(float)
    high  = df["High"].astype(float)
    low   = df["Low"].astype(float)

    ema9  = ema(close, 9)
    ema21 = ema(close, 21)
    ema50 = ema(close, 50)
    bb_mid, bb_up, bb_lo = bollinger(close, 20)
    rsi14 = rsi_wilder(close, 14)
    m_line, m_sig, m_hist = macd_tv(close, 12, 26, 9)
    k, d = stochastic_full(high, low, close, 14, 3, 3)

    lows, highs = _pivot_indices(close, order=8)
    trend_dir = "up" if ema50.iloc[-1] - ema50.iloc[max(0, len(ema50)-6)] >= 0 else "down"
    slope = (float(ema50.iloc[-1]) - float(ema50.iloc[max(0, len(ema50)-20)])) / max(1e-9, float(ema50.iloc[-1]))
    t_strength = max(0.0, min(1.0, abs(slope)*20))

    return {
        "ok": True,
        "ticker": ticker.upper(),
        "interval": interval,
        "period": period,
        "ohlc": {
            "x": _fmt_x(df.index, interval),
            "open": _tolist(df["Open"]),
            "high": _tolist(df["High"]),
            "low": _tolist(df["Low"]),
            "close": _tolist(df["Close"]),
            "volume": _tolist(df.get("Volume", pd.Series(index=df.index, dtype=float))),
        },
        "indicators": {
            "ema9": _tolist(ema9),
            "ema21": _tolist(ema21),
            "ema50": _tolist(ema50),
            "bb_upper": _tolist(bb_up),
            "bb_lower": _tolist(bb_lo),
            "bb_basis": _tolist(bb_mid),
            "rsi": _tolist(rsi14),
            "macd": {"hist": _tolist(m_hist), "line": _tolist(m_line), "signal": _tolist(m_sig)},
            "stoch": {"k": _tolist(k), "d": _tolist(d)},
            "trend": {"dir": trend_dir, "strength": float(t_strength)},
        },
        "pivots": {"lows": lows, "highs": highs},
    }

@app.get("/")
def root():
    return {"ok": True, "service": "mvp-api"}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/v1/indicators")
def indicators(ticker: str, interval: str = "1d"):
    try:
        df = _fetch_stooq(ticker, "1d", _period_to_rows("1y","1d")) or _fetch_yf(ticker, "1d", "1y")
        if df is None or len(df)==0:
            return {"ok": True, "ticker": ticker.upper(), "interval": interval, "boxes": [], "error": "no_data"}
        close = df["Close"]
        ema9  = ema(close, 9).iloc[-1]
        ema21 = ema(close, 21).iloc[-1]
        ema50 = ema(close, 50).iloc[-1]
        bb_mid, bb_up, bb_lo = bollinger(close, 20)
        boxes = [
            {"id":"box1","label":"Price + BB + EMA(9/21/50)","value": float(close.iloc[-1]),
             "extras":{"ema9":float(ema9), "ema21":float(ema21), "ema50":float(ema50),
                       "bb_upper":float(bb_up.iloc[-1]), "bb_lower":float(bb_lo.iloc[-1])}},
            {"id":"box2","label":"Stochastic (14,3,3)","value": float(stochastic_full(df["High"], df["Low"], close)[0].iloc[-1])},
            {"id":"box3","label":"Stoch RSI (14,3,3)","value": float(stochastic_full(df["High"], df["Low"], rsi_wilder(close,14))[0].iloc[-1])},
            {"id":"box4","label":"RSI (14)","value": float(rsi_wilder(close,14).iloc[-1])},
            {"id":"box5","label":"MACD (12,26,9)","value": float(macd_tv(close)[0].iloc[-1])},
            {"id":"box6","label":"Trend","value": "up" if ema50.iloc[-1] >= ema50.iloc[-5] else "down"},
        ]
        return {"ok": True, "ticker": ticker.upper(), "interval": interval, "boxes": boxes}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/v1/chart")
def chart(
    ticker: str,
    interval: str = Query("1d", pattern="^(1d|1wk)$"),
    period: str = Query("1y")
):
    try:
        rows = _period_to_rows(period, interval)
        df = _fetch_stooq(ticker, interval, rows) or _fetch_yf(ticker, interval, period)
        if df is None or len(df)==0:
            return {"ok": False, "error": "no_data", "ticker": ticker, "interval": interval, "period": period}
        df = df.tail(rows).dropna()
        return _chart_payload(df, interval, ticker, period)
    except Exception as e:
        return {"ok": False, "error": str(e), "ticker": ticker, "interval": interval, "period": period}
