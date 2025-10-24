import React,{useEffect,useState} from "react";
import PlotFactory from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
const Plot = PlotFactory(Plotly as any);

type OHLC = { time:any[]; close:number[]; high:number[]; low:number[] } | null;

function pickSeries():OHLC{
  const nodes = Array.from(document.querySelectorAll(".js-plotly-plot"));
  for(const el of nodes){
    const gd:any = (el as any)._fullData ? (el as any) : (el as any).children?.[0];
    const data:any[] = (gd?._fullData || gd?.data || []) as any[];
    // 1) Candlestick bevorzugt
    for(const t of data){
      if(t?.type==="candlestick" && t.x && t.close && t.high && t.low){
        return { time:[...t.x], close:[...t.close], high:[...t.high], low:[...t.low] };
      }
    }
    // 2) Fallback: eine Linien-/Scatter-Serie, die wie "Close" aussieht
    for(const t of data){
      if((t?.type==="scatter" || t?.mode==="lines") && t.x && t.y){
        const name = String(t.name||"").toLowerCase();
        if(name.includes("close") || name==="close" || t?.hovertemplate?.toLowerCase?.().includes("close")){
          const y = Array.from(t.y as any[]).map(Number);
          return { time:[...t.x], close:y, high:y, low:y };
        }
      }
    }
  }
  return null;
}

function extrema(vals:number[],win=10){
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
  return {lows,highs};
}

function clusterLevels(vals:number[], tol=0.01){
  const v=vals.slice().sort((a,b)=>a-b);
  const levels:number[]=[]; const counts:number[]=[];
  for(const x of v){
    if(!levels.length){levels.push(x);counts.push(1);continue;}
    const last=levels[levels.length-1];
    if(Math.abs(x-last) <= tol*Math.max(Math.abs(x),Math.abs(last))){
      const n=counts.length-1; counts[n]+=1;
      levels[n]=(levels[n]*(counts[n]-1)+x)/counts[n];
    }else{levels.push(x);counts.push(1);}
  }
  const maxC=Math.max(...counts,1), minC=Math.min(...counts,0);
  const strength=counts.map(c=>(c-minC)/(maxC-minC||1));
  return {levels, strength};
}

export default function TrendPanel(){
  const [st,setSt]=useState<any>(null);

  useEffect(()=>{
    const pull=()=>{
      const o = pickSeries();
      if(!o || !o.time?.length) return;
      const {lows,highs} = extrema(o.close,10);
      const raw = [...lows.map(i=>o.close[i]), ...highs.map(i=>o.close[i])];
      const {levels,strength} = clusterLevels(raw,0.01);
      setSt({time:o.time, close:o.close, lows, highs, levels, strength});
    };
    pull();
    const iv=setInterval(pull,1200);
    window.addEventListener("load",pull);
    return ()=>{clearInterval(iv); window.removeEventListener("load",pull);};
  },[]);

  if(!st) return null;

  const x0 = st.time[0], x1 = st.time[st.time.length-1];
  const traces:any[] = [
    {x:st.time, y:st.close, mode:"lines", name:"Close", line:{width:1.6}}
  ];
  st.levels.forEach((lv:number, i:number)=>{
    traces.push({x:[x0,x1], y:[lv,lv], mode:"lines", line:{width:1.5+3*(st.strength[i]||0), dash:"dot"}, hoverinfo:"skip", showlegend:false});
  });
  if(st.lows.length){
    traces.push({x:st.lows.map((i:number)=>st.time[i]), y:st.lows.map((i:number)=>st.close[i]),
      mode:"markers", name:"Lows", marker:{symbol:"triangle-down", size:12, color:"lime", line:{color:"#111",width:1.5}}});
  }
  if(st.highs.length){
    traces.push({x:st.highs.map((i:number)=>st.time[i]), y:st.highs.map((i:number)=>st.close[i]),
      mode:"markers", name:"Highs", marker:{symbol:"triangle-up", size:12, color:"red", line:{color:"#111",width:1.5}}});
  }

  const layout:any={height:220, margin:{l:40,r:10,t:20,b:20}, showlegend:false};
  return <Plot data={traces} layout={layout} style={{width:"100%"}} />;
}
