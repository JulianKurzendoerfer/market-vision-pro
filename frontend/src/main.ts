declare const Plotly: any;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || window.location.origin;

const $ = (id: string) => document.getElementById(id)!;

async function loadChart() {
  const ticker = ( $("ticker") as HTMLInputElement ).value.trim() || "AAPL";
  const interval = ( $("interval") as HTMLSelectElement ).value;
  const period = ( $("period") as HTMLSelectElement ).value;

  $("status").textContent = "lädt…";
  const url = `${API_BASE}/v1/chart?ticker=${encodeURIComponent(ticker)}&interval=${encodeURIComponent(interval)}&period=${encodeURIComponent(period)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data?.ok) {
    $("status").textContent = data?.error || "Fehler";
    return;
  }
  $("status").textContent = `${data.ticker} • ${data.interval} • ${data.period}`;

  const t = data.ohlc.t.map((ms: number) => new Date(ms));
  const o = data.ohlc.open, h = data.ohlc.high, l = data.ohlc.low, c = data.ohlc.close;

  // ===== Main: Candles + BB + EMAs =====
  const candles = {type: "candlestick", x: t, open: o, high: h, low: l, close: c, name: "OHLC"};
  const ema9  = {type:"scatter", x:t, y:data.overlays.ema9,  name:"EMA 9",  line:{width:1.4}};
  const ema21 = {type:"scatter", x:t, y:data.overlays.ema21, name:"EMA 21", line:{width:1.2}};
  const ema50 = {type:"scatter", x:t, y:data.overlays.ema50, name:"EMA 50", line:{width:1.2}};
  const bbu   = {type:"scatter", x:t, y:data.overlays.bb_upper, name:"BB Upper", line:{dash:"dot", width:1}};
  const bbb   = {type:"scatter", x:t, y:data.overlays.bb_basis, name:"BB Basis", line:{dash:"dot", width:1}};
  const bbl   = {type:"scatter", x:t, y:data.overlays.bb_lower, name:"BB Lower", line:{dash:"dot", width:1}};
  Plotly.newPlot("chart-main", [candles, bbu, bbb, bbl, ema9, ema21, ema50], {
    margin:{l:30,r:10,t:6,b:20}, xaxis:{showspikes:true}, yaxis:{tickprefix:""},
    dragmode:"pan", showlegend:false
  }, {responsive:true});

  // ===== Stochastic =====
  Plotly.newPlot("chart-stoch", [
    {type:"scatter", x:t, y:data.indicators.stoch.k, name:"%K", line:{width:1.6}},
    {type:"scatter", x:t, y:data.indicators.stoch.d, name:"%D", line:{width:1.2}}
  ], {
    margin:{l:30,r:10,t:6,b:20}, yaxis:{range:[0,100], dtick:20},
    shapes:[
      {type:"line", xref:"paper", x0:0, x1:1, y0:80, y1:80, line:{dash:"dot", width:1}},
      {type:"line", xref:"paper", x0:0, x1:1, y0:20, y1:20, line:{dash:"dot", width:1}}
    ],
    showlegend:false
  }, {responsive:true});

  // ===== Stoch RSI =====
  Plotly.newPlot("chart-stochrsi", [
    {type:"scatter", x:t, y:data.indicators.stoch_rsi.k, name:"%K", line:{width:1.6}},
    {type:"scatter", x:t, y:data.indicators.stoch_rsi.d, name:"%D", line:{width:1.2}}
  ], {
    margin:{l:30,r:10,t:6,b:20}, yaxis:{range:[0,100], dtick:20},
    shapes:[
      {type:"line", xref:"paper", x0:0, x1:1, y0:80, y1:80, line:{dash:"dot", width:1}},
      {type:"line", xref:"paper", x0:0, x1:1, y0:20, y1:20, line:{dash:"dot", width:1}}
    ],
    showlegend:false
  }, {responsive:true});

  // ===== RSI =====
  Plotly.newPlot("chart-rsi", [
    {type:"scatter", x:t, y:data.indicators.rsi, name:"RSI", line:{width:1.6}}
  ], {
    margin:{l:30,r:10,t:6,b:20}, yaxis:{range:[0,100], dtick:10},
    shapes:[
      {type:"line", xref:"paper", x0:0, x1:1, y0:70, y1:70, line:{dash:"dot", width:1}},
      {type:"line", xref:"paper", x0:0, x1:1, y0:30, y1:30, line:{dash:"dot", width:1}}
    ],
    showlegend:false
  }, {responsive:true});

  // ===== MACD =====
  Plotly.newPlot("chart-macd", [
    {type:"bar", x:t, y:data.indicators.macd.hist, name:"Hist", opacity:0.5},
    {type:"scatter", x:t, y:data.indicators.macd.line, name:"MACD", line:{width:1.6}},
    {type:"scatter", x:t, y:data.indicators.macd.signal, name:"Signal", line:{width:1.2}}
  ], {
    margin:{l:30,r:10,t:6,b:20},
    shapes:[{type:"line", xref:"paper", x0:0, x1:1, y0:0, y1:0, line:{dash:"dot", width:1}}],
    showlegend:false
  }, {responsive:true});

  // ===== Trend & Wendepunkte =====
  const piv = (data.indicators.trend.pivots || []) as Array<{i:number,type:"high"|"low"}>;
  const highIdx = piv.filter(p=>p.type==="high").map(p=>p.i);
  const lowIdx  = piv.filter(p=>p.type==="low").map(p=>p.i);
  const highs = {type:"scatter", x: highIdx.map(i=>t[i]), y: highIdx.map(i=>c[i]), mode:"markers", name:"High",
                 marker:{symbol:"triangle-up", size:12, line:{width:1}}};
  const lows  = {type:"scatter", x: lowIdx.map(i=>t[i]), y: lowIdx.map(i=>c[i]), mode:"markers", name:"Low",
                 marker:{symbol:"triangle-down", size:12, line:{width:1}}};
  const closeLine = {type:"scatter", x:t, y:c, name:"Close", line:{width:1.4}};
  Plotly.newPlot("chart-trend", [closeLine, highs, lows], {
    margin:{l:30,r:10,t:6,b:20}, showlegend:false,
  }, {responsive:true});
}

$("refresh").addEventListener("click", loadChart);
window.addEventListener("load", loadChart);
