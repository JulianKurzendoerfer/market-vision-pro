import React from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import { computeTrend, TrendInput } from "../lib/trend";
const Plot = createPlotlyComponent(Plotly);

type Props = { ohlc: TrendInput|null; height?: number; background?: string; lineColor?: string };
export default function TrendPanel({ ohlc, height=220, background="#ffffff", lineColor="#888" }: Props){
  if(!ohlc || !ohlc.close?.length) return null;
  const t = computeTrend(ohlc, 10, 0.01);
  const time = ohlc.time as any[];
  const data:any[] = [
    { x: time, y: ohlc.close, name: "Close", type: "scatter", mode: "lines",
      line: { width: 1.6, color: "#1f77b4" } },
  ];
  if (t.lows.length){
    data.push({ x: t.lows.map(i=>time[i]), y: t.lows.map(i=>ohlc.close[i]),
      type: "scatter", mode: "markers", name: "Lows",
      marker: { symbol: "triangle-down", size: 12, color: "lime", line: { color: "#111", width: 1.6 } } });
  }
  if (t.highs.length){
    data.push({ x: t.highs.map(i=>time[i]), y: t.highs.map(i=>ohlc.close[i]),
      type: "scatter", mode: "markers", name: "Highs",
      marker: { symbol: "triangle-up", size: 12, color: "red", line: { color: "#111", width: 1.6 } } });
  }
  const layout:any = { height, margin:{l:40,r:10,t:20,b:20}, paper_bgcolor:background, plot_bgcolor:background, showlegend:false };
  const shapes:any[] = [];
  for(let i=0;i<t.levels.length;i++){
    shapes.push({ type:"line", xref:"paper", x0:0, x1:1, yref:"y", y0:t.levels[i], y1:t.levels[i],
      line:{ width: 1.5 + 3*t.strength[i], color: lineColor, dash:"solid"}});
  }
  layout.shapes = shapes;
  return <Plot data={data} layout={layout} style={{width:"100%"}} config={{displayModeBar:false, responsive:true}} />;
}
