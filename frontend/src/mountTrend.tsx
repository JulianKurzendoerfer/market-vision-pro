import React from "react";
import { createRoot } from "react-dom/client";
import TrendPanel, { TrendInput } from "./components/TrendPanel";

function probeOHLC(): TrendInput | null {
  const els = document.querySelectorAll(".js-plotly-plot");
  if (!els.length) return null;
  const gd:any = (els[0] as any);
  const d:any[] = gd.data || [];
  let time:any[] = [], close:number[] = [], high:number[] = [], low:number[] = [];
  for (const t of d) {
    if (t.type === "candlestick" && t.close && t.high && t.low) {
      time = t.x as any[]; close = t.close as number[]; high = t.high as number[]; low = t.low as number[];
      break;
    }
  }
  if (!close.length) {
    const c = d.find(e => String(e.name || "").toLowerCase() === "close");
    if (c) { time = c.x as any[]; close = c.y as number[]; }
  }
  if (!close.length) return null;
  return { time, close, high, low };
}

function run(){
  const o = probeOHLC();
  if (!o) return;
  let host = document.getElementById("mv-trendpanel-root");
  if (!host) {
    host = document.createElement("div");
    host.id = "mv-trendpanel-root";
    (document.querySelector("main") || document.body).appendChild(host);
  }
  const root = (window as any).__mv_trend_root || createRoot(host);
  (window as any).__mv_trend_root = root;
  root.render(<TrendPanel ohlc={o} />);
}

window.addEventListener("load", () => setTimeout(run, 0));
window.addEventListener("resize", () => setTimeout(run, 200));
