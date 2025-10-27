import React,{useEffect,useState} from "react";
import PlotFactory from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";
const Plot=PlotFactory(Plotly as any);

type OHLC={time:any[];open?:number[];high:number[];low:number[];close:number[]};
function probeOHLC():OHLC|null{
  const els=document.querySelectorAll(".js-plotly-plot");
  if(!els.length) return null;
  const gd:any=(els[0] as any);
  const data:any[]=gd._fullData||[];
  const c:any=data.find(d=>d.type==="candlestick");
  if(!c) return null;
  const x=(c.x||[]).slice();
  const high=(c.high||[]).slice();
  const low=(c.low||[]).slice();
  const close=(c.close||[]).slice();
  return {time:x,high,low,close};
}

function extrema(vals:number[],win=10){
  const n=vals.length;const lows:number[]=[];const highs:number[]=[];
  for(let i=win;i<n-win;i++){
    let lo=true,hi=true;
    for(let k=i-win;k<=i+win;k++){
      if(vals[k]<vals[i]) hi=false;
      if(vals[k]>vals[i]) lo=false;
      if(!lo&&!hi) break;
    }
    if(lo) lows.push(i);
    if(hi) highs.push(i);
  }
  return {lows,highs};
}

function clusterLevels(v:number[],tol=0.01){
  const s=[...v].sort((a,b)=>a-b);
  const out:number[]=[];
  for(const u of s){
    if(!out.length){out.push(u);continue;}
    const last=out[out.length-1];
    if(Math.abs(u-last)<=tol*Math.max(1,Math.abs(last))){
      out[out.length-1]=(last+u)/2;
    }else out.push(u);
  }
  return out;
}

export default function TrendPanel(){
  const [ohlc,setOhlc]=useState<OHLC|null>(null);
  useEffect(()=>{
    const pull=()=>{const p=probeOHLC();if(p) setOhlc(p)};
    pull();const id=setInterval(pull,1200);return()=>clearInterval(id);
  },[]);
  if(!ohlc) return null;
  const close=ohlc.close.map(Number);const high=ohlc.high.map(Number);const low=ohlc.low.map(Number);
  const {lows,highs}=extrema(close,10);
  const levels=clusterLevels([...lows.map(i=>close[i]),...highs.map(i=>close[i])],0.01);
  const lowsTrace:any={x:lows.map(i=>ohlc.time[i]),y:lows.map(i=>close[i]),mode:"markers",name:'Lows',visible:false,marker:{symbol:'circle',size:10},showlegend:false};
  const highsTrace:any={x:highs.map(i=>ohlc.time[i]),y:highs.map(i=>close[i]),mode:"markers",name:'Highs',visible:false,marker:{symbol:'circle',size:10},showlegend:false};
  const closeTrace:any={x:ohlc.time,y:close,mode:"lines",name:"Close",line:{width:1.6},showlegend:false};
  const shapes:any[]=levels.map((lv:number)=>({type:"line",xref:"x",yref:"y",x0:ohlc.time[0],x1:ohlc.time[ohlc.time.length-1],y0:lv,y1:lv,line:{width:2}}));
  const layout:any={height:220,margin:{l:40,r:10,t:10,b:30},shapes,showlegend:false};
  return <Plot data={[closeTrace,lowsTrace,highsTrace]} layout={layout} style={{width:"100%"}}/>;
}
