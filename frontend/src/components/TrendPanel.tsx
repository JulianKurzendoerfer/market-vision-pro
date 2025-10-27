import React,{useEffect,useState} from 'react';
import PlotFactory from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import {computeTrend,TrendInput} from '../lib/trend';
const Plot=PlotFactory(Plotly as any);

type OHLC={x:any[];open?:number[];high?:number[];low?:number[];close:number[]};

function probeOHLC():OHLC|null{
  const el=document.querySelector('.js-plotly-plot') as any;
  const data=(el&& (el.data||el._fullData))||null;
  if(!data||!Array.isArray(data)) return null;
  let t:any=data.find((d:any)=>d.type==='candlestick');
  if(t) return {x:t.x,open:t.open,high:t.high,low:t.low,close:t.close};
  t=data.find((d:any)=>d.name&&String(d.name).toLowerCase()==='close');
  if(t) return {x:t.x,close:[...t.y]};
  const first=data[0]; if(first&&first.x&&first.y) return {x:first.x,close:[...first.y]};
  return null;
}

export default function TrendPanel(){
  const [st,setSt]=useState<ReturnType<typeof computeTrend>|null>(null);
  const pull=()=>{const o=probeOHLC(); if(!o) return; const ti:TrendInput={time:o.x,close:o.close,high:o.high,low:o.low}; setSt(computeTrend(ti,10,0.01));};
  useEffect(()=>{pull(); const h1=setInterval(pull,1200); return()=>clearInterval(h1);},[]);
  if(!st) return null;

  const lowsTrace=st.lowsIdx.length?{x:st.lowsIdx.map(i=>new Date(st.time[i])),y:st.lowsIdx.map(i=>st.close[i]),mode:'markers',name:'Lows',marker:{symbol:'triangle-down',size:12,color:'rgb(0,180,0)',line:{color:'#111',width:1.6}},type:'scatter'}:null;
  const highsTrace=st.highsIdx.length?{x:st.highsIdx.map(i=>new Date(st.time[i])),y:st.highsIdx.map(i=>st.close[i]),mode:'markers',name:'Highs',marker:{symbol:'triangle-up',size:12,color:'rgb(220,0,0)',line:{color:'#111',width:1.6}},type:'scatter'}:null;
  const closeTrace={x:st.time.map(t=>new Date(t)),y:st.close,mode:'lines',name:'Close',line:{width:1.6,color:'#7aa7ff'},type:'scatter'};

  const shapes=st.levels.map(l=>({type:'line',xref:'paper',x0:0,x1:1,y0:l.y,y1:l.y,line:{width:1.5+3*l.strength,color:`rgba(${Math.round(255*(1-l.strength))},${120+Math.round(100*l.strength)},255,0.85)`}}));
  const annotations=st.levels.map(l=>({xref:'paper',x:0.99,y:l.y,showarrow:false,text:`${l.y.toFixed(2)} (${l.count})`,font:{size:10,color:'#666'},xanchor:'right'}));

  const data=[closeTrace,(lowsTrace as any),(highsTrace as any)].filter(Boolean);
  const layout:any={height:220,margin:{l:40,r:10,t:10,b:28},showlegend:false,shapes,annotations};
  return <Plot data={data as any} layout={layout} style={{width:'100%'}} />;
}
