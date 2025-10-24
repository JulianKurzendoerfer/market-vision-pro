import React,{useEffect,useState} from "react";
import PlotFactory from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
import computeTrend,{TrendInput} from "../lib/trend";
const Plot = PlotFactory(Plotly as any);

type OHLC = {time:any[];close:number[];high:number[];low:number[]} | null;

function extractOHLC():OHLC{
  const els=document.querySelectorAll(".js-plotly-plot");
  for(const el of Array.from(els)){
    const gd:any=(el as any)._fullData ? (el as any) : (el as any).children?.[0];
    const data:any[]=(gd as any)?._fullData || (gd as any)?.data || [];
    for(const t of data){
      if(t.type==="candlestick" && t.x && t.close && t.high && t.low){
        return {time:[...t.x], close:[...t.close], high:[...t.high], low:[...t.low]};
      }
    }
  }
  return null;
}

export default function TrendPanel(){
  const [st,setSt]=useState<any>(null);
  useEffect(()=>{
    const pull=()=>{
      const o=extractOHLC();
      if(!o) return;
      const tr=computeTrend(o as TrendInput,10,0.01);
      setSt(tr);
    };
    pull();
    const iv=setInterval(pull,1500);
    window.addEventListener("load",pull);
    return ()=>{clearInterval(iv); window.removeEventListener("load",pull);};
  },[]);
  if(!st) return null;

  const x0=st.time[0], x1=st.time[st.time.length-1];
  const levelTraces = st.levels.map((lv:number, i:number)=>({
    x:[x0,x1], y:[lv,lv], mode:"lines",
    line:{width:1.5 + 3*(st.strength[i]||0), dash:"dot"},
    name:`L${i+1}`, hoverinfo:"skip", showlegend:false
  }));
  const lowsTrace = st.lows.length? {x:st.lows.map((i:number)=>st.time[i]), y:st.lows.map((i:number)=>st.close[i]),
    mode:"markers", marker:{symbol:"triangle-down", size:12, color:"lime", line:{color:"#111",width:1.5}},
    name:"Lows"} : null;
  const highsTrace = st.highs.length? {x:st.highs.map((i:number)=>st.time[i]), y:st.highs.map((i:number)=>st.close[i]),
    mode:"markers", marker:{symbol:"triangle-up", size:12, color:"red", line:{color:"#111",width:1.5}},
    name:"Highs"} : null;

  const data:any[]=[
    {x:st.time, y:st.close, mode:"lines", name:"Close", line:{width:1.6}},
    ...levelTraces
  ];
  if(lowsTrace) data.push(lowsTrace);
  if(highsTrace) data.push(highsTrace);

  const layout:any={height:220, margin:{l:40,r:10,t:20,b:20}, showlegend:false};
  return <Plot data={data} layout={layout} style={{width:"100%"}} />;
}
