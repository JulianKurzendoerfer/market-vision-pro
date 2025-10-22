import Plotly from "plotly.js-dist-min";
type ChartResp = {
  ok: boolean;
  ticker: string;
  interval: "1d"|"1wk";
  period: string;
  ohlc?: { x:string[]; open:number[]; high:number[]; low:number[]; close:number[]; volume:(number|null)[] };
  indicators?: {
    ema9:number[]; ema21:number[]; ema50:number[];
    bb_upper:number[]; bb_lower:number[]; bb_basis:number[];
    rsi:number[];
    macd:{hist:number[]; line:number[]; signal:number[]};
    stoch:{k:number[]; d:number[]};
    trend:{dir:"up"|"down"; strength:number};
  };
  pivots?: { lows:number[]; highs:number[] };
  error?: string;
};

const API = (window as any).API || (import.meta as any).env?.VITE_API_BASE || "";
function apiBase(){ return API || ""; }

const el = {
  t:  document.getElementById("ticker") as HTMLInputElement,
  i:  document.getElementById("interval") as HTMLSelectElement,
  p:  document.getElementById("period") as HTMLSelectElement,
  btn:document.getElementById("refresh") as HTMLButtonElement,
  cm: document.getElementById("chart-main")!,
  cst:document.getElementById("chart-stoch")!,
  csr:document.getElementById("chart-stochrsi")!,
  rsi:document.getElementById("chart-rsi")!,
  macd:document.getElementById("chart-macd")!,
  tr: document.getElementById("chart-trend")!,
};

async function load(){
  const base = apiBase();
  if(!base){ console.warn("API base not set"); }
  const url = `${base}/v1/chart?ticker=${encodeURIComponent(el.t.value.trim())}&interval=${el.i.value}&period=${el.p.value}`;
  const res = await fetch(url, {cache:"no-store"});
  const data = await res.json() as ChartResp;
  if(!data.ok || !data.ohlc || !data.indicators){ 
    console.error("API error", data); 
    [el.cm,el.cst,el.csr,el.rsi,el.macd,el.tr].forEach(n=>n.innerHTML="");
    return;
  }

  const x = data.ohlc.x;
  const o = data.ohlc.open, h = data.ohlc.high, l = data.ohlc.low, c = data.ohlc.close;
  const ind = data.indicators!;
  const piv = data.pivots || {lows:[], highs:[]};

  // MAIN
  Plotly.newPlot(el.cm, [
    {type:"candlestick", x, open:o, high:h, low:l, close:c, name:"OHLC", increasing:{line:{width:1}}, decreasing:{line:{width:1}}},
    {type:"scatter", mode:"lines", x, y:ind.bb_upper, name:"BB Upper", line:{width:1, dash:"dot"}},
    {type:"scatter", mode:"lines", x, y:ind.bb_lower, name:"BB Lower", line:{width:1, dash:"dot"}},
    {type:"scatter", mode:"lines", x, y:ind.bb_basis, name:"BB Basis", line:{width:1, dash:"dot"}},
    {type:"scatter", mode:"lines", x, y:ind.ema9,  name:"EMA 9",  line:{width:1}},
    {type:"scatter", mode:"lines", x, y:ind.ema21, name:"EMA 21", line:{width:1}},
    {type:"scatter", mode:"lines", x, y:ind.ema50, name:"EMA 50", line:{width:1}},
  ], {margin:{l:30,r:10,t:10,b:20}, xaxis:{rangeslider:{visible:false}}, yaxis:{fixedrange:false}, showlegend:false, responsive:true});

  // STOCHASTIC
  Plotly.newPlot(el.cst, [
    {type:"scatter", mode:"lines", x, y:ind.stoch.k, name:"%K"},
    {type:"scatter", mode:"lines", x, y:ind.stoch.d, name:"%D"},
  ], {margin:{l:30,r:10,t:10,b:20}, yaxis:{range:[0,100]}, shapes:[
    {type:"line", x0:0, x1:1, y0:80, y1:80, xref:"paper", line:{dash:"dot"}},
    {type:"line", x0:0, x1:1, y0:20, y1:20, xref:"paper", line:{dash:"dot"}},
  ], showlegend:false, responsive:true});

  // STOCH RSI
  Plotly.newPlot(el.csr, [
    {type:"scatter", mode:"lines", x, y:ind.stoch.k, name:"%K (Stoch RSI)"},
    {type:"scatter", mode:"lines", x, y:ind.stoch.d, name:"%D (Stoch RSI)"},
  ], {margin:{l:30,r:10,t:10,b:20}, yaxis:{range:[0,100]}, shapes:[
    {type:"line", x0:0, x1:1, y0:80, y1:80, xref:"paper", line:{dash:"dot"}},
    {type:"line", x0:0, x1:1, y0:20, y1:20, xref:"paper", line:{dash:"dot"}},
  ], showlegend:false, responsive:true});

  // RSI
  Plotly.newPlot(el.rsi, [
    {type:"scatter", mode:"lines", x, y:ind.rsi, name:"RSI"},
  ], {margin:{l:30,r:10,t:10,b:20}, yaxis:{range:[0,100]}, shapes:[
    {type:"line", x0:0, x1:1, y0:70, y1:70, xref:"paper", line:{dash:"dot"}},
    {type:"line", x0:0, x1:1, y0:30, y1:30, xref:"paper", line:{dash:"dot"}},
  ], showlegend:false, responsive:true});

  // MACD
  Plotly.newPlot(el.macd, [
    {type:"bar", x, y:ind.macd.hist, name:"Hist", opacity:0.5},
    {type:"scatter", mode:"lines", x, y:ind.macd.line, name:"MACD"},
    {type:"scatter", mode:"lines", x, y:ind.macd.signal, name:"Signal"},
  ], {margin:{l:30,r:10,t:10,b:20}, shapes:[{type:"line", x0:0, x1:1, y0:0, y1:0, xref:"paper", line:{dash:"dot"}}], showlegend:false, responsive:true});

  // TREND + PIVOTS
  const highs = (piv.highs||[]).map(i=>({x:x[i], y:c[i]}));
  const lows  = (piv.lows||[] ).map(i=>({x:x[i], y:c[i]}));
  Plotly.newPlot(el.tr, [
    {type:"scatter", mode:"lines", x, y:c, name:"Close", line:{width:1}},
    {type:"scatter", mode:"markers", x:highs.map(v=>v.x), y:highs.map(v=>v.y), name:"Highs", marker:{symbol:"triangle-up", size:12}},
    {type:"scatter", mode:"markers", x:lows.map(v=>v.x),  y:lows.map(v=>v.y),  name:"Lows",  marker:{symbol:"triangle-down", size:12}},
  ], {margin:{l:30,r:10,t:10,b:20}, annotations:[
    {xref:"paper", yref:"paper", x:1.0, y:1.12, showarrow:false, text:`Trend: ${ind.trend.dir} • strength ${(ind.trend.strength*100).toFixed(0)}%`, font:{size:12, color:"#666"}}
  ], showlegend:false, responsive:true});

  setTimeout(()=>[el.cm,el.cst,el.csr,el.rsi,el.macd,el.tr].forEach(Plotly.Plots.resize), 50);
}

el.btn.addEventListener("click", load);
window.addEventListener("load", load);
window.addEventListener("resize", ()=>[el.cm,el.cst,el.csr,el.rsi,el.macd,el.tr].forEach(Plotly.Plots.resize));
