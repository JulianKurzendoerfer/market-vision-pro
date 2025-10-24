import React from "react";
import PlotFactory from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
const Plot = PlotFactory(Plotly as any);

export type TrendInput = { time:any[]; close:number[]; high:number[]; low:number[] };

function extrema(vals:number[], win=10){
  const lows:number[]=[], highs:number[]=[];
  for(let i=win;i<vals.length-win;i++){
    let lo=true, hi=true;
    for(let k=1;k<=win;k++){
      if(vals[i]>vals[i-k]||vals[i]>vals[i+k]) lo=false;
      if(vals[i]<vals[i-k]||vals[i]<vals[i+k]) hi=false;
      if(!lo && !hi) break;
    }
    if(lo) lows.push(i);
    if(hi) highs.push(i);
  }
  return {lows, highs};
}
function clusterLevels(vals:number[], tol=0.01){
  const v=vals.slice().sort((a,b)=>a-b);
  const levels:number[]=[]; const counts:number[]=[];
  for(const x of v){
    if(!levels.length){levels.push(x);counts.push(1);continue;}
    const last=levels[levels.length-1];
    if(Math.abs(x-last)<=tol*Math.max(Math.abs(x),Math.abs(last))){
      const n=counts.length-1; counts[n]+=1;
      levels[n]=(levels[n]*(counts[n]-1)+x)/counts[n];
    }else{levels.push(x);counts.push(1);}
  }
  const maxC=Math.max(...counts,1), minC=Math.min(...counts,0);
  const strength=counts.map(c=>(c-minC)/(maxC-minC||1));
  return {levels,strength};
}

export default function TrendPanel({ohlc}: {ohlc:TrendInput}){
  const {time, close} = ohlc;
  if(!time?.length || !close?.length) return null;

  const {lows, highs} = extrema(close,10);
  const raw = [...lows.map(i=>close[i]), ...highs.map(i=>close[i])];
  const {levels, strength} = clusterLevels(raw,0.01);

  const x0=time[0], x1=time[time.length-1];
  const traces:any[] = [
    {x:time, y:close, mode:"lines", name:"Close", line:{width:1.6}}
  ];
  levels.forEach((lv:number, i:number)=>{
    traces.push({x:[x0,x1], y:[lv,lv], mode:"lines", line:{width:1.5+3*(strength[i]||0), dash:"dot"}, hoverinfo:"skip", showlegend:false});
  });
  if(lows.length){
    traces.push({x:lows.map(i=>time[i]), y:lows.map(i=>close[i]), mode:"markers", name:"Lows",
      marker:{symbol:"triangle-down", size:12, color:"lime", line:{color:"#111",width:1.5}}});
  }
  if(highs.length){
    traces.push({x:highs.map(i=>time[i]), y:highs.map(i=>close[i]), mode:"markers", name:"Highs",
      marker:{symbol:"triangle-up", size:12, color:"red", line:{color:"#111",width:1.5}}});
  }

  const layout:any={height:220, margin:{l:40,r:10,t:20,b:20}, showlegend:false};
  return <Plot data={traces} layout={layout} style={{width:"100%"}} />;
}
