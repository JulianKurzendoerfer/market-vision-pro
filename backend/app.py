from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Market Vision Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

def payload(ticker: str, interval: str):
    return {
        "ticker": ticker.upper(),
        "interval": interval,
        "boxes": [
            {"id":"box1","label":"RSI","value":None},
            {"id":"box2","label":"MACD","value":None},
            {"id":"box3","label":"Stochastic","value":None},
            {"id":"box4","label":"Bollinger","value":None},
            {"id":"box5","label":"SMA200","value":None},
            {"id":"box6","label":"Trend","value":None}
        ]
    }

@app.get("/v1/indicators")
def v1_indicators(ticker: str, interval: str):
    return payload(ticker, interval)

@app.get("/api/v1/indicators")
def api_v1_indicators(ticker: str, interval: str):
    return payload(ticker, interval)
