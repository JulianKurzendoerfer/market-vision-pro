import { applyTheme } from './theme';
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
  const traceHigh = { type: "scatter", mode: "markers", x: hi.map((i:number)=>x[i]), y: hi.map((i:number)=>c[i]), name: "High", marker:{ symbol:'circle', size: 10 } }
  const traceLow  = { type: "scatter", mode: "markers", x: lo.map((i:number)=>x[i]), y: lo.map((i:number)=>c[i]), name: "Low",  marker:{ symbol:'circle', size: 10 } }

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

function tunePlotly(): void {
  const H = 240
  document.querySelectorAll<HTMLElement>('.js-plotly-plot').forEach(el => {
    try { (window as any).Plotly.relayout(el, { showlegend: false, height: H }) } catch {}
  })
}
if (!(window as any).__mv_tunePlotly) {
  (window as any).__mv_tunePlotly = true
  new MutationObserver(() => tunePlotly()).observe(document.body, { childList: true, subtree: true })
  window.addEventListener('load', tunePlotly)
  window.addEventListener('resize', () => setTimeout(tunePlotly, 0))
  setInterval(tunePlotly, 1500)
}
const __FORCE_LAYOUT__={showlegend:false,height:260,margin:{l:40,r:10,t:10,b:28}};
declare const window:any;
const __origNew__:(...a:any[])=>any=(Plotly as any).newPlot;
(Plotly as any).newPlot=function(gd:any,data:any,layout:any,config:any){
  layout=Object.assign({},layout||{},__FORCE_LAYOUT__);
  config=Object.assign({displayModeBar:false,responsive:true},config||{});
  return __origNew__.call(this,gd,data,layout,config).then((g:any)=>{return (Plotly as any).relayout(g,__FORCE_LAYOUT__);});
};
const __origReact__:(...a:any[])=>any=(Plotly as any).react;
(Plotly as any).react=function(gd:any,data:any,layout:any,config:any){
  layout=Object.assign({},layout||{},__FORCE_LAYOUT__);
  config=Object.assign({displayModeBar:false,responsive:true},config||{});
  return __origReact__.call(this,gd,data,layout,config).then((g:any)=>{return (Plotly as any).relayout(g,__FORCE_LAYOUT__);});
};
if(!window.__mv_tune_once){
  window.__mv_tune_once=true;
  const tune=()=>{document.querySelectorAll('.js-plotly-plot').forEach((el:any)=>{try{(Plotly as any).relayout(el,__FORCE_LAYOUT__);}catch(_){}})}
  window.addEventListener('load',tune);
  window.addEventListener('resize',()=>setTimeout(tune,120));
  setInterval(tune,1500);
}
declare global { interface Window { Plotly:any; __mv_tune_once?:boolean } }

const __MV_FORCE__ = { showlegend:false, height:260, margin:{ l:40, r:10, t:10, b:28 } };

function __mv_hook(P:any){
  const _new = P.newPlot.bind(P);
  const _react = P.react.bind(P);
  P.newPlot = (gd:any, data:any, layout:any, config:any) => {
    layout = Object.assign({}, layout||{}, __MV_FORCE__);
    config = Object.assign({ displayModeBar:false, responsive:true }, config||{});
    return _new(gd, data, layout, config).then((g:any)=>P.relayout(g, __MV_FORCE__));
  };
  P.react = (gd:any, data:any, layout:any, config:any) => {
    layout = Object.assign({}, layout||{}, __MV_FORCE__);
    config = Object.assign({ displayModeBar:false, responsive:true }, config||{});
    return _react(gd, data, layout, config).then((g:any)=>P.relayout(g, __MV_FORCE__));
  };
  const tune = () => document.querySelectorAll('.js-plotly-plot')
    .forEach((el:any)=>{ try{ P.relayout(el, __MV_FORCE__); }catch(_){} });
  window.addEventListener('load', tune);
  window.addEventListener('resize', () => setTimeout(tune, 120));
  setInterval(tune, 1500);
}

(function wait(){
  if(window.__mv_tune_once) return;
  const P = window.Plotly;
  if(P){ window.__mv_tune_once = true; __mv_hook(P); return; }
  setTimeout(wait, 150);
})();
(async ()=>{
  const mod = await import("./theme");
  const hook = () => document.querySelectorAll(".js-plotly-plot").forEach((el:any)=>mod.applyTheme(el));
  window.addEventListener("load", hook);
  window.addEventListener("resize", ()=>setTimeout(hook, 120));
  new MutationObserver(()=>setTimeout(hook,0)).observe(document.body, {subtree:true, childList:true});
})();
declare global { interface Window { __mv_theme_once__?: boolean } }
if(!(window as any).__mv_theme_once__){
  (window as any).__mv_theme_once__ = true;
  const run = () => document.querySelectorAll<HTMLElement>('.js-plotly-plot')
    .forEach(el => { try { (window as any).Plotly && applyTheme((el as any)); } catch{} });
  window.addEventListener('load', run);
  window.addEventListener('resize', () => setTimeout(run, 50));
  setInterval(run, 1200);
}
import React from "react";
import { createRoot } from "react-dom/client";
import TrendPanel from "./components/TrendPanel";
if (typeof document !== "undefined") {
  window.addEventListener("load", () => {
    try{
      const parent = document.querySelector("main") || document.body;
      let el = document.getElementById("mv-trendpanel-root");
      if(!el){ el=document.createElement("div"); el.id="mv-trendpanel-root"; el.style.marginTop="16px"; parent.appendChild(el); }
      const root = (window as any).__mv_trend_root || createRoot(el);
      (window as any).__mv_trend_root = root;
      root.render(React.createElement(TrendPanel));
    }catch(_e){}
  });
}
