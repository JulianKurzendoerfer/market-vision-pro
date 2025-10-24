import React from "react";
import Plot from "react-plotly.js";
import { computeTrend } from "../lib/trend";

export default function TrendPanel({ ohlc, height=220, background="#ffffff", lineColor="#1f77b4" }: any){
  const x:(string|number)[] = (ohlc?.time)||[];
  const close:number[] = (ohlc?.close)||[];
  const tr = computeTrend(ohlc, 10, 0.01);

  const data:any[] = [
    { x, y: close, type:"scatter", mode:"lines", name:"close", line:{width:1.6,color:lineColor} }
  ];
  if(tr.lows?.length){
    data.push({ x: tr.lows.map((i:number)=>x[i]), y: tr.lows.map((i:number)=>close[i]),
      type:"scatter", mode:"markers", name:"Lows",
      marker:{symbol:"triangle-down", size:12, color:"lime", line:{color:"#111", width:1.6}}, cliponaxis:false });
  }
  if(tr.highs?.length){
    data.push({ x: tr.highs.map((i:number)=>x[i]), y: tr.highs.map((i:number)=>close[i]),
      type:"scatter", mode:"markers", name:"Highs",
      marker:{symbol:"triangle-up", size:12, color:"red", line:{color:"#111", width:1.6}}, cliponaxis:false });
  }

  const shapes = (tr.levels||[]).map((lvl:number, idx:number)=>{
    const s = tr.strength?.[idx] ?? 0;
    const w = 1.5 + (4.5-1.5)*s;
    const r = Math.round(255*(1-s));
    const g = Math.round(120+100*s);
    const color = `rgba(${r},${g},255,0.85)`;
    return { type:"line", xref:"x", yref:"y", x0:x[0], x1:x[x.length-1], y0:lvl, y1:lvl, line:{width:w,color}, layer:"below" as const };
  });

  const layout:any = {
    height,
    margin:{l:40,r:15,t:10,b:25},
    paper_bgcolor:background,
    plot_bgcolor:background,
    showlegend:false,
    xaxis:{ showspikes:true, spikemode:"across", spikesnap:"cursor" },
    yaxis:{ tickprefix: ohlc?.currencySymbol || "" },
    shapes
  };

  return <Plot data={data} layout={layout} style={{width:"100%"}} config={{displayModeBar:false}} />;
}
