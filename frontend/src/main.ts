import Plotly from 'plotly.js-dist-min'

const apiBase = (import.meta as any).env?.VITE_API_BASE || (window as any).API_BASE || "https://market-vision-pro.onrender.com"

const elTicker = document.getElementById("ticker") as HTMLInputElement
const elInterval = document.getElementById("interval") as HTMLSelectElement
const elPeriod = document.getElementById("period") as HTMLSelectElement
const btn = document.getElementById("refresh") as HTMLButtonElement

function cleanTicker(s: string) {
  return (s || "").trim().toUpperCase()
}

async function getJSON(url: string, timeoutMs = 20000) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ac.signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function hasData(d: any): boolean {
  return !!(d && d.ok && d.ohlc && Array.isArray(d.ohlc.x) && d.ohlc.x.length > 10)
}

function nv(x: any[]): any[] {
  return Array.isArray(x) ? x.map(v => (v == null || Number.isNaN(v) ? null : v)) : []
}

async function load() {
  const q = new URLSearchParams({
    ticker: cleanTicker(elTicker.value || "AAPL"),
    interval: (elInterval.value || "1d"),
    period: (elPeriod.value || "1y")
  })
  const url = `${apiBase}/v1/chart?${q.toString()}`
  const data = await getJSON(url)
  if (!hasData(data)) return

  const x = data.ohlc.x
  const o = nv(data.ohlc.open)
  const h = nv(data.ohlc.high)
  const l = nv(data.ohlc.low)
  const c = nv(data.ohlc.close)

  const ema9  = nv(data.indicators?.ema?.ema9 || [])
  const ema21 = nv(data.indicators?.ema?.ema21 || [])
  const ema50 = nv(data.indicators?.ema?.ema50 || [])

  const bbU = nv(data.indicators?.bb?.upper || [])
  const bbB = nv(data.indicators?.bb?.basis || [])
  const bbL = nv(data.indicators?.bb?.lower || [])

  const stK = nv(data.indicators?.stoch?.k || [])
  const stD = nv(data.indicators?.stoch?.d || [])

  const srK = nv(data.indicators?.stochrsi?.k || [])
  const srD = nv(data.indicators?.stochrsi?.d || [])

  const rsi = nv(data.indicators?.rsi?.rsi || [])

  const mLine = nv(data.indicators?.macd?.line || [])
  const mSig  = nv(data.indicators?.macd?.signal || [])
  const mHist = nv(data.indicators?.macd?.hist || [])

  const pivL = (data.indicators?.pivots?.lows || []) as number[]
  const pivH = (data.indicators?.pivots?.highs || []) as number[]

  const candles = {
    type: "candlestick",
    x, open: o, high: h, low: l, close: c,
    name: "Candles"
  }

  const tE9  = { type: "scatter", mode: "lines", x, y: ema9,  name: "EMA9"  }
  const tE21 = { type: "scatter", mode: "lines", x, y: ema21, name: "EMA21" }
  const tE50 = { type: "scatter", mode: "lines", x, y: ema50, name: "EMA50" }

  const tBBU = { type: "scatter", mode: "lines", x, y: bbU, name: "BB Upper" }
  const tBBB = { type: "scatter", mode: "lines", x, y: bbB, name: "BB Basis" }
  const tBBL = { type: "scatter", mode: "lines", x, y: bbL, name: "BB Lower" }

  const shapes: any[] = []
  const hi = pivH || []
  const lo = pivL || []
  const traceHigh = { type: "scatter", mode: "markers", x: hi.map((i:number)=>x[i]), y: hi.map((i:number)=>c[i]), name: "High", marker: { symbol: "triangle-up", size: 10 } }
  const traceLow  = { type: "scatter", mode: "markers", x: lo.map((i:number)=>x[i]), y: lo.map((i:number)=>c[i]), name: "Low",  marker: { symbol: "triangle-down", size: 10 } }

  await Plotly.newPlot("panel0", [candles, tBBU, tBBB, tBBL, tE9, tE21, tE50, traceHigh, traceLow], {
    margin: { l: 30, r: 10, t: 30, b: 20 },
    xaxis: { rangeslider: { visible: false } },
    showlegend: true,
    responsive: true
  })

  await Plotly.newPlot("panel1", [
    { type: "scatter", mode: "lines", x, y: stK, name: "%K" },
    { type: "scatter", mode: "lines", x, y: stD, name: "%D" },
  ], { margin: { l:30, r:10, t:30, b:20 }, yaxis:{ range:[0,100] }, showlegend:true, responsive:true })

  await Plotly.newPlot("panel2", [
    { type: "scatter", mode: "lines", x, y: srK, name: "Stoch RSI %K" },
    { type: "scatter", mode: "lines", x, y: srD, name: "Stoch RSI %D" },
  ], { margin: { l:30, r:10, t:30, b:20 }, yaxis:{ range:[0,100] }, showlegend:true, responsive:true })

  await Plotly.newPlot("panel3", [
    { type: "scatter", mode: "lines", x, y: rsi, name: "RSI(14)" },
  ], { margin: { l:30, r:10, t:30, b:20 }, yaxis:{ range:[0,100] }, showlegend:false, responsive:true })

  await Plotly.newPlot("panel4", [
    { type: "bar", x, y: mHist, name: "Hist" },
    { type: "scatter", mode: "lines", x, y: mLine, name: "MACD" },
    { type: "scatter", mode: "lines", x, y: mSig,  name: "Signal" },
  ], { margin: { l:30, r:10, t:30, b:20 }, showlegend:true, responsive:true })

  await Plotly.newPlot("panel5", [
    { type: "scatter", mode: "lines", x, y: c, name: "Close" },
  ], { margin: { l:30, r:10, t:30, b:20 }, showlegend:false, responsive:true })
}

btn.addEventListener("click", load)
window.addEventListener("load", load)
window.addEventListener("resize", () => {
  ;["panel0","panel1","panel2","panel3","panel4","panel5"].forEach(id => {
    const el = document.getElementById(id)
    if (el) Plotly.Plots.resize(el as any)
  })
})
