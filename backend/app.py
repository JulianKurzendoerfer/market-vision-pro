from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import requests
import yfinance as yf

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def _clean_ticker(s: str) -> str:
    return (s or "").strip()

def _period_to_days(period: str) -> int:
    m = {
        "3m": 90, "6m": 180, "1y": 365, "2y": 730, "5y": 1825,
        "max": 3650
    }
    return m.get(period, 365)

def _fetch_stooq_daily(ticker: str, days: int) -> pd.DataFrame:
    st = ticker.lower()
    url = f"https://stooq.com/q/d/l/?s={st}&i=d"
    r = requests.get(url, timeout=15)
    if r.status_code != 200 or "Date,Open,High,Low,Close" not in r.text:
        return pd.DataFrame()
    df = pd.read_csv(pd.compat.StringIO(r.text))
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.rename(columns={"Date":"Datetime","Open":"Open","High":"High","Low":"Low","Close":"Close"})
    df = df.dropna()
    df = df.tail(days+5)
    df["Volume"] = np.nan
    df = df.set_index("Datetime").sort_index()
    return df

def _fetch_yf(ticker: str, interval: str, period: str) -> pd.DataFrame:
    kwargs = dict(interval=interval, auto_adjust=True, progress=False)
    if period:
        kwargs["period"] = period
    df = yf.download(_clean_ticker(ticker), **kwargs)
    if df is None or len(df) == 0:
        return pd.DataFrame()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[0] for c in df.columns]
    df = df.dropna()
    df.index = pd.to_datetime(df.index)
    return df

def fetch_bars(ticker: str, interval: str, period: str) -> pd.DataFrame:
    if interval == "1d":
        d = _period_to_days(period or "1y")
        df = _fetch_stooq_daily(ticker, d)
        if len(df) >= 50:
            return df
    return _fetch_yf(ticker, interval or "1d", period or "1y")

def ema(s: pd.Series, span: int) -> pd.Series:
    return s.ewm(span=span, adjust=False).mean()

def macd(close: pd.Series, fast=12, slow=26, signal=9):
    line = ema(close, fast) - ema(close, slow)
    sig = ema(line, signal)
    hist = line - sig
    return line, sig, hist

def rsi_wilder(close: pd.Series, period=14):
    delta = close.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    avg_gain = up.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = down.ewm(alpha=1/period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + rs)
    return rsi.clip(0, 100)

def stochastic_full(high, low, close, k_period=14, k_smooth=3, d_period=3):
    hh = high.rolling(k_period, min_periods=k_period).max()
    ll = low.rolling(k_period, min_periods=k_period).min()
    raw_k = 100 * (close - ll) / (hh - ll).replace(0, np.nan)
    k = raw_k.rolling(k_smooth, min_periods=k_smooth).mean()
    d = k.rolling(d_period, min_periods=d_period).mean()
    return k.clip(0,100), d.clip(0,100)

def stoch_rsi(close, period=14, k=3, d=3):
    r = rsi_wilder(close, period)
    rmin = r.rolling(period, min_periods=period).min()
    rmax = r.rolling(period, min_periods=period).max()
    sr = 100 * (r - rmin) / (rmax - rmin).replace(0, np.nan)
    kline = sr.rolling(k, min_periods=k).mean()
    dline = kline.rolling(d, min_periods=d).mean()
    return kline.clip(0,100), dline.clip(0,100)

def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["EMA9"] = ema(out["Close"], 9)
    out["EMA21"] = ema(out["Close"], 21)
    out["EMA50"] = ema(out["Close"], 50)
    sma20 = out["Close"].rolling(20, min_periods=20).mean()
    std20 = out["Close"].rolling(20, min_periods=20).std()
    out["BB_basis"] = sma20
    out["BB_upper"] = sma20 + 2*std20
    out["BB_lower"] = sma20 - 2*std20
    out["RSI"] = rsi_wilder(out["Close"], 14)
    ml, ms, mh = macd(out["Close"], 12, 26, 9)
    out["MACD"], out["MACD_sig"], out["MACD_hist"] = ml, ms, mh
    k, d = stochastic_full(out["High"], out["Low"], out["Close"], 14, 3, 3)
    out["STO_K"], out["STO_D"] = k, d
    sk, sd = stoch_rsi(out["Close"], 14, 3, 3)
    out["STO_RSI_K"], out["STO_RSI_D"] = sk, sd
    return out

def pivots_close(df: pd.DataFrame, window: int = 8):
    c = df["Close"].values
    n = len(c)
    if n < 2*window+1:
        return []
    piv = []
    for i in range(window, n-window):
        seg = c[i-window:i+window+1]
        if np.argmax(seg) == window:
            piv.append({"i": i, "type": "high"})
        elif np.argmin(seg) == window:
            piv.append({"i": i, "type": "low"})
    return piv

@app.get("/")
def root():
    return {"ok": True, "service": "mvp-api"}

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/v1/indicators")
def indicators(ticker: str = Query("AAPL"), interval: str = Query("1d")):
    try:
        df = fetch_bars(ticker, interval, "1y")
        df = compute_indicators(df)
        last = df.iloc[-1]
        last_close = float(last["Close"])
        emap9 = float(df["EMA9"].iloc[-1]) if not np.isnan(df["EMA9"].iloc[-1]) else None
        emap21 = float(df["EMA21"].iloc[-1]) if not np.isnan(df["EMA21"].iloc[-1]) else None
        emap50 = float(df["EMA50"].iloc[-1]) if not np.isnan(df["EMA50"].iloc[-1]) else None
        bb_u = float(df["BB_upper"].iloc[-1]) if not np.isnan(df["BB_upper"].iloc[-1]) else None
        bb_l = float(df["BB_lower"].iloc[-1]) if not np.isnan(df["BB_lower"].iloc[-1]) else None
        rsi = float(last["RSI"]) if not np.isnan(last["RSI"]) else None
        k = float(last["STO_K"]) if not np.isnan(last["STO_K"]) else None
        d = float(last["STO_D"]) if not np.isnan(last["STO_D"]) else None
        srk = float(last["STO_RSI_K"]) if not np.isnan(last["STO_RSI_K"]) else None
        srd = float(last["STO_RSI_D"]) if not np.isnan(last["STO_RSI_D"]) else None
        mline = float(last["MACD"]) if not np.isnan(last["MACD"]) else None
        msig = float(last["MACD_sig"]) if not np.isnan(last["MACD_sig"]) else None
        trend_dir = "up" if (df["EMA50"].iloc[-1] - df["EMA50"].iloc[-20]) > 0 else "down"
        boxes = [
            {"id":"box1","label":"Price + BB + EMA(9/21/50)","value": last_close, "extras":{"ema9":emap9,"ema21":emap21,"ema50":emap50,"bb_upper":bb_u,"bb_lower":bb_l}},
            {"id":"box2","label":"Stochastic (14,3,3)","value": k, "extras":{"%D": d}},
            {"id":"box3","label":"Stoch RSI (14,3,3)","value": srk, "extras":{"%D": srd}},
            {"id":"box4","label":"RSI (14)","value": rsi},
            {"id":"box5","label":"MACD (12,26,9)","value": mline, "extras":{"signal": msig, "hist": float(last["MACD_hist"]) if not np.isnan(last["MACD_hist"]) else None}},
            {"id":"box6","label":"Trend","value": trend_dir}
        ]
        return {"ok": True, "ticker": _clean_ticker(ticker).upper(), "interval": interval, "boxes": boxes}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/v1/chart")
def chart(
    ticker: str = Query("AAPL"),
    interval: str = Query("1d"),
    period: str = Query("1y")
):
    try:
        df = fetch_bars(ticker, interval, period)
        df = compute_indicators(df)
        piv = pivots_close(df, window=8)

        t = (df.index.view("int64") // 10**6).astype(int).tolist()
        o = df["Open"].astype(float).round(6).tolist()
        h = df["High"].astype(float).round(6).tolist()
        l = df["Low"].astype(float).round(6).tolist()
        c = df["Close"].astype(float).round(6).tolist()
        v = (df["Volume"] if "Volume" in df.columns else pd.Series(index=df.index, data=np.nan)).astype(float).tolist()

        payload = {
            "ok": True,
            "ticker": _clean_ticker(ticker).upper(),
            "interval": interval,
            "period": period,
            "ohlc": {
                "t": t, "open": o, "high": h, "low": l, "close": c, "volume": v
            },
            "overlays": {
                "ema9": df["EMA9"].astype(float).round(6).where(pd.notna(df["EMA9"])).tolist(),
                "ema21": df["EMA21"].astype(float).round(6).where(pd.notna(df["EMA21"])).tolist(),
                "ema50": df["EMA50"].astype(float).round(6).where(pd.notna(df["EMA50"])).tolist(),
                "bb_upper": df["BB_upper"].astype(float).where(pd.notna(df["BB_upper"])).round(6).tolist(),
                "bb_basis": df["BB_basis"].astype(float).where(pd.notna(df["BB_basis"])).round(6).tolist(),
                "bb_lower": df["BB_lower"].astype(float).where(pd.notna(df["BB_lower"])).round(6).tolist()
            },
            "indicators": {
                "stoch": {"k": df["STO_K"].astype(float).where(pd.notna(df["STO_K"])).round(6).tolist(),
                          "d": df["STO_D"].astype(float).where(pd.notna(df["STO_D"])).round(6).tolist()},
                "stoch_rsi": {"k": df["STO_RSI_K"].astype(float).where(pd.notna(df["STO_RSI_K"])).round(6).tolist(),
                              "d": df["STO_RSI_D"].astype(float).where(pd.notna(df["STO_RSI_D"])).round(6).tolist()},
                "rsi": df["RSI"].astype(float).where(pd.notna(df["RSI"])).round(6).tolist(),
                "macd": {"line": df["MACD"].astype(float).where(pd.notna(df["MACD"])).round(6).tolist(),
                         "signal": df["MACD_sig"].astype(float).where(pd.notna(df["MACD_sig"])).round(6).tolist(),
                         "hist": df["MACD_hist"].astype(float).where(pd.notna(df["MACD_hist"])).round(6).tolist()},
                "trend": {"pivots": piv}
            }
        }
        return payload
    except Exception as e:
        return {"ok": False, "error": str(e)}
