import React from "react";
import { createRoot } from "react-dom/client";
import TrendPanel from "./components/TrendPanel";

function probeOHLC(){const el:any=document.querySelector(".js-plotly-plot");const gd:any[]= (el && (el.data||el._fullData))||[];let time:any[]=[];let close:number[]=[];let high:number[]=[];let low:number[]=[];for(const t of gd){const typ=(t?.type||"").toString().toLowerCase();if((typ==="candlestick"||typ==="ohlc")&&t.x&&t.close&&t.high&&t.low){time=t.x;close=t.close;high=t.high;low=t.low;break;}}if(!close.length){for(const t of gd){const n=(t?.name||"").toString().toLowerCase();if(n==="close"&&t.x&&t.y){time=t.x;close=t.y;high=t.y;low=t.y;break;}}}if(!close.length) return null;return {time,close,high,low};}

export function mountTrendPanel(){
  const run=()=>{const o=probeOHLC();if(!o) return;let host=document.getElementById("mv-trendpanel-root");if(!host){host=document.createElement("div");host.id="mv-trendpanel-root";const main=document.querySelector("main")||document.body;main.appendChild(host);}const root:any=(host as any).__root||((host as any).__root=createRoot(host));root.render(<TrendPanel ohlc={o} />);};
  window.addEventListener("load",run);
  window.addEventListener("resize",()=>setTimeout(run,120));
  setInterval(run,1200);
}
