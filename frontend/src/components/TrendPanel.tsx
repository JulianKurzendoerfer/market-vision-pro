import React from "react";
import createPlotly from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import { computeTrend, TrendInput } from "../lib/trend";
const Plot=createPlotly(Plotly);
type Props={ ohlc: TrendInput; height?:number; background?:string; lineColor?:string; };
export default function TrendPanel({ohlc,height=220,background="#ffffff",lineColor="#1f77b4"}:Props){
  const tr=computeTrend(ohlc,10,0.01); const x=ohlc.time;
  const data:any[]=[];
  data.push({x, y: ohlc.close, type:"scatter", mode:"lines", name:"Close", line:{width:1.6,color:lineColor}});
  if(tr.lows.length) data.push({x: tr.lows.map(i=>x[i]), y: tr.lows.map(i=>ohlc.close[i]),
    type:"scatter", mode:"markers", name:"Lows", marker:{symbol:"triangle-down",size:12,color:"lime",line:{width:1,color:"#111"}}});
  if(tr.highs.length) data.push({x: tr.highs.map(i=>x[i]), y: tr.highs.map(i=>ohlc.close[i]),
    type:"scatter", mode:"markers", name:"Highs", marker:{symbol:"triangle-up",size:12,color:"red",line:{width:1,color:"#111"}}});
  tr.levels.forEach(l=>{
    data.push({x:[x[0],x[x.length-1]], y:[l.l,l.l], type:"scatter", mode:"lines",
      line:{width:1.5+3*l.s, color:`rgba(${Math.round(255*(1-l.s))},${Math.round(120+100*l.s)},255,0.85)`},
      hoverinfo:"skip", showlegend:false});
  });
  const layout:any={height,margin:{l:40,r:10,t:10,b:20},plot_bgcolor:background,paper_bgcolor:background,
    xaxis:{showgrid:true}, yaxis:{showgrid:true}};
  return <Plot data={data} layout={layout} style={{width:"100%"}} />;
}
