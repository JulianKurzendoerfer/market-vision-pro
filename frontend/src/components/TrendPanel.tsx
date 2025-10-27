import React, { useEffect, useState } from "react";
import PlotFactory from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import { computeTrend, TrendInput } from "../lib/trend";

const Plot = PlotFactory(Plotly as any);

type Props = { ohlc?: TrendInput; height?: number; background?: string; lineColor?: string };

function probeOHLC(): TrendInput | null {
  const els = document.querySelectorAll(".js-plotly-plot");
  if (!els.length) return null;
  const gd: any = els[0];
  const data: any[] = (gd.data || gd._fullData || []) as any[];
  let t: any = null;
  for (const d of data) {
    if (d && (d.type === "candlestick")) { t = d; break; }
  }
  if (!t) {
    for (const d of data) {
      if (d && d.name && String(d.name).toLowerCase() === "close" && Array.isArray(d.y) && Array.isArray(d.x)) {
        const x = d.x.map((v: any) => +new Date(v));
        const y = d.y.map((v: any) => Number(v));
        return { time: x, close: y, high: y, low: y };
      }
    }
    return null;
  }
  const x = (t.x || []).map((v: any) => +new Date(v));
  const open = (t.open || []).map((v: any) => Number(v));
  const high = (t.high || []).map((v: any) => Number(v));
  const low = (t.low || []).map((v: any) => Number(v));
  const close = (t.close || []).map((v: any) => Number(v));
  return { time: x, close, high, low };
}

export default function TrendPanel({ ohlc, height = 220, background = "#fff", lineColor = "#1f77b4" }: Props) {
  const [st, setSt] = useState<any>(null);

  useEffect(() => {
    const src = ohlc || (typeof document !== "undefined" ? probeOHLC() : null);
    if (!src) return;
    const res = computeTrend(src, 10, 0.01);
    setSt(res);
  }, [JSON.stringify(ohlc || {})]);

  const data: any[] = [];
  if (st) {
    data.push({
      x: st.time,
      y: st.close,
      type: "scatter",
      mode: "lines",
      name: "Close",
      line: { width: 1.6, color: lineColor }
    });
    if (st.lowsIdx?.length) {
      data.push({
        x: st.lowsIdx.map((i: number) => st.time[i]),
        y: st.lowsIdx.map((i: number) => st.close[i]),
        mode: "markers",
        name: "Lows",
        marker: { symbol: "triangle-down", size: 12, color: "lime", line: { color: "#111", width: 1.6 } }
      });
    }
    if (st.highsIdx?.length) {
      data.push({
        x: st.highsIdx.map((i: number) => st.time[i]),
        y: st.highsIdx.map((i: number) => st.close[i]),
        mode: "markers",
        name: "Highs",
        marker: { symbol: "triangle-up", size: 12, color: "red", line: { color: "#111", width: 1.6 } }
      });
    }
  }

  const shapes = (st?.levels || []).map((lvl: number) => ({
    type: "line",
    xref: "paper",
    x0: 0, x1: 1, y0: lvl, y1: lvl,
    line: { width: 2, color: "rgba(120,160,255,0.75)" }
  }));

  const layout: any = {
    height,
    margin: { l: 40, r: 10, t: 18, b: 24 },
    plot_bgcolor: background,
    paper_bgcolor: background,
    showlegend: false,
    shapes
  };

  return <Plot data={data} layout={layout} style={{ width: "100%" }} />;
}
