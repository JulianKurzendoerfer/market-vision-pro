import React from "react";
import PlotFactory from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
const Plot = PlotFactory(Plotly as any);

export type TrendInput = { time:any[]; close:number[]; high:number[]; low:number[] };

export default function TrendPanel({ ohlc }: { ohlc: TrendInput }) {
  const time = ohlc.time, close = ohlc.close;
  const data:any[] = [
    { x: time, y: close, type: "scatter", mode: "lines", name: "Close", line: { width: 1.6 } }
  ];
  return (
    <Plot
      data={data}
      layout={{ height: 220, margin: { l: 40, r: 10, t: 20, b: 20 }, showlegend: false }}
      style={{ width: "100%" }}
    />
  );
}
