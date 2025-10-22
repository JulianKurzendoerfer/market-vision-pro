import Plotly from "plotly.js-dist-min";

const API_BASE = (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/,"") || "";

const els = {
  t: document.getElementById("ticker") as HTMLInputElement,
  interval: document.getElementById("interval") as HTMLSelectElement,
  period: document.getElementById("period") as HTMLSelectElement,
  refresh: document.getElementById("refresh") as HTMLButtonElement,

  cCandles: document.getElementById("chart-candles") as HTMLDivElement,
  cStoch:   document.getElementById("chart-stoch") as HTMLDivElement,
  cStochR:  document.getElementById("chart-stochrsi") as HTMLDivElement,
  cRSI:     document.getElementById("chart-rsi") as HTMLDivElement,
  cMACD:    document.getElementById("chart-macd") as HTMLDivElement,
  cTrend:   document.getElementById("chart-trend") as HTMLDivElement,
};

type ChartResp = {
  ok: boolean;
  ticker: string;
  interval: "1d"|"1h"|"1wk";
  ohlc: { x:string[]; open:number[]; high:number[]; low:number[]; close:number[] };
  indicators: {
    bb_basis:number[]; bb_upper:number[]; bb_lower:number[];
    ema9:number[]; ema21:number[]; ema50:number[];
    stoch_k:number[]; stoch_d:number[];
    stochrsi_k:number[]; stochrsi_d:number[];
    rsi:number[];
    macd: { line:number[]; signal:number[]; hist:number[] };
    pivots: { idx:number; type:"high"|"low" }[];
    trend: { dir:"up"|"down"; strength:number; r2:number };
  };
};

function fmtLayout(h:number, extra:any = {}) {
  return {
    margin: {l:48, r:16, t:10, b:20},
    height: h,
    xaxis: {showspikes:true, spikedash:"dot", spikethickness:1, showgrid:true, gridcolor:"rgba(0,0,0,0.1)"},
    yaxis: {showgrid:true, gridcolor:"rgba(0,0,0,0.1)"},
    showlegend:false,
    ...extra
  } as Partial<Plotly.Layout>;
}

async function fetchChart(ticker:string, interval:string, period:string): Promise<ChartResp> {
  const url = `${API_BASE}/v1/chart?ticker=${encodeURIComponent(ticker)}&interval=${interval}&period=${period}`;
  const r = await fetch(url, {cache:"no-store"});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function loadChart() {
  try {
    const t = (els.t.value || "AAPL").trim().toUpperCase();
    const interval = els.interval.value || "1d";
    const period   = els.period.value || "1y";
    const data = await fetchChart(t, interval, period);

    const x = data.ohlc.x;
    const {open, high, low, close} = data.ohlc;

    // Candles + BB + EMAs
    const tracesTop: Partial<Plotly.PlotData>[] = [
      {type:"candlestick", x, open, high, low, close, name:"OHLC"},
      {type:"scatter", mode:"lines", x, y:data.indicators.bb_upper, name:"BB Upper", line:{width:1, dash:"dot"}},
      {type:"scatter", mode:"lines", x, y:data.indicators.bb_lower, name:"BB Lower", line:{width:1, dash:"dot"}},
      {type:"scatter", mode:"lines", x, y:data.indicators.bb_basis, name:"BB Basis", line:{width:1, dash:"dot"}},
      {type:"scatter", mode:"lines", x, y:data.indicators.ema9,  name:"EMA 9",  line:{width:1}},
      {type:"scatter", mode:"lines", x, y:data.indicators.ema21, name:"EMA 21", line:{width:1}},
      {type:"scatter", mode:"lines", x, y:data.indicators.ema50, name:"EMA 50", line:{width:1}},
    ];

    // Pivot-Marker
    if (Array.isArray(data.indicators.pivots) && data.indicators.pivots.length) {
      const highs = data.indicators.pivots.filter(p=>p.type==="high").map(p=>p.idx);
      const lows  = data.indicators.pivots.filter(p=>p.type==="low").map(p=>p.idx);
      if (highs.length) {
        tracesTop.push({
          type:"scatter", mode:"markers", x: highs.map(i=>x[i]), y: highs.map(i=>high[i]),
          marker:{symbol:"triangle-up", size:12, line:{width:1}}, name:"Highs"
        });
      }
      if (lows.length) {
        tracesTop.push({
          type:"scatter", mode:"markers", x: lows.map(i=>x[i]), y: lows.map(i=>low[i]),
          marker:{symbol:"triangle-down", size:12, line:{width:1}}, name:"Lows"
        });
      }
    }

    await Plotly.newPlot(els.cCandles, tracesTop as any, fmtLayout(420, {xaxis:{rangeslider:{visible:false}}}), {responsive:true});

    // Stochastic
    await Plotly.newPlot(els.cStoch, [
      {type:"scatter", mode:"lines", x, y:data.indicators.stoch_k, name:"%K"},
      {type:"scatter", mode:"lines", x, y:data.indicators.stoch_d, name:"%D"},
      {type:"scatter", mode:"lines", x:[x[0], x[x.length-1]], y:[80,80], line:{dash:"dot"}, showlegend:false},
      {type:"scatter", mode:"lines", x:[x[0], x[x.length-1]], y:[20,20], line:{dash:"dot"}, showlegend:false},
    ] as any, fmtLayout(220, {yaxis:{range:[0,100]}}), {responsive:true});

    // Stoch RSI
    await Plotly.newPlot(els.cStochR, [
      {type:"scatter", mode:"lines", x, y:data.indicators.stochrsi_k, name:"Stoch RSI %K"},
      {type:"scatter", mode:"lines", x, y:data.indicators.stochrsi_d, name:"Stoch RSI %D"},
      {type:"scatter", mode:"lines", x:[x[0], x[x.length-1]], y:[80,80], line:{dash:"dot"}, showlegend:false},
      {type:"scatter", mode:"lines", x:[x[0], x[x.length-1]], y:[20,20], line:{dash:"dot"}, showlegend:false},
    ] as any, fmtLayout(220, {yaxis:{range:[0,100]}}), {responsive:true});

    // RSI
    await Plotly.newPlot(els.cRSI, [
      {type:"scatter", mode:"lines", x, y:data.indicators.rsi, name:"RSI"},
      {type:"scatter", mode:"lines", x:[x[0], x[x.length-1]], y:[70,70], line:{dash:"dot"}, showlegend:false},
      {type:"scatter", mode:"lines", x:[x[0], x[x.length-1]], y:[30,30], line:{dash:"dot"}, showlegend:false},
    ] as any, fmtLayout(220, {yaxis:{range:[0,100]}}), {responsive:true});

    // MACD
    await Plotly.newPlot(els.cMACD, [
      {type:"bar", x, y:data.indicators.macd.hist, name:"Hist"},
      {type:"scatter", mode:"lines", x, y:data.indicators.macd.line, name:"MACD"},
      {type:"scatter", mode:"lines", x, y:data.indicators.macd.signal, name:"Signal"},
    ] as any, fmtLayout(220, {}), {responsive:true});

    // Trend (Close + Markierungen)
    await Plotly.newPlot(els.cTrend, [
      {type:"scatter", mode:"lines", x, y:close, name:"Close"},
    ] as any, fmtLayout(260, {}), {responsive:true});

  } catch (e) {
    console.error(e);
    [els.cCandles, els.cStoch, els.cStochR, els.cRSI, els.cMACD, els.cTrend].forEach(div=>{
      div.innerHTML = `<div style="padding:16px;color:#b00">Fehler beim Laden</div>`;
    });
  }
}

els.refresh?.addEventListener("click", loadChart);
window.addEventListener("load", loadChart);
