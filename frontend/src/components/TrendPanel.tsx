import React, {useEffect, useState} from 'react';
import PlotFactory from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
const Plot = PlotFactory(Plotly as any);

type OHLC = { time:any[]; close:number[]; high:number[]; low:number[] };

function extractOHLC(): OHLC | null {
  const els = document.querySelectorAll('.js-plotly-plot');
  if (!els.length) return null;
  const gd:any = els[0] as any;
  const data:any[] = gd.data || [];
  let time:any[] = [], close:number[] = [], high:number[] = [], low:number[] = [];
  for (const t of data) {
    if (t.type === 'candlestick' && t.close && t.high && t.low) {
      time = t.x || []; close = t.close.slice(); high = t.high.slice(); low = t.low.slice(); break;
    }
  }
  if (!close.length) {
    const c = data.find(t => String(t.name||'').toLowerCase() === 'close' && Array.isArray(t.y));
    if (c) { time = c.x || []; close = c.y.slice(); high = close; low = close; }
  }
  if (!close.length) return null;
  return { time, close, high, low };
}

function extrema(vals:number[], win=10){
  const lows:number[]=[], highs:number[]=[];
  for (let i=win;i<vals.length-win;i++){
    let lo=true, hi=true;
    for (let j=i-win;j<=i+win;j++){ if (vals[j] < vals[i]) lo=false; if (vals[j] > vals[i]) hi=false; if(!lo && !hi) break; }
    if (lo) lows.push(i); if (hi) highs.push(i);
  }
  return {lows, highs};
}

function clusterLevels(v:number[], tol=0.01){
  const s=[...v].filter(Number.isFinite).sort((a,b)=>a-b), out:number[]=[];
  for (const x of s){
    if (!out.length || Math.abs(x-out[out.length-1]) > tol*Math.max(1,out[out.length-1])) out.push(x);
    else out[out.length-1]=(out[out.length-1]+x)/2;
  }
  return out;
}

export default function TrendPanel(){
  const [st,setSt]=useState<{time:any[]; close:number[]; lows:number[]; highs:number[]; levels:number[]}|null>(null);
  useEffect(()=>{ const pull=()=>{ const o=extractOHLC(); if(!o) return;
      const {lows,highs}=extrema(o.close,10);
      const levels=clusterLevels([...lows.map(i=>o.close[i]),...highs.map(i=>o.close[i])],0.01);
      setSt({time:o.time, close:o.close, lows, highs, levels}); };
    pull(); const onR=()=>setTimeout(pull,50);
    window.addEventListener('load',pull); window.addEventListener('resize',onR);
    const id=setInterval(pull,1500); return ()=>{window.removeEventListener('load',pull);window.removeEventListener('resize',onR);clearInterval(id);}
  },[]);
  if(!st) return null;
  const {time,close,lows,highs,levels}=st;
  const data:any[]=[
    {x:time,y:close,name:'Close',mode:'lines',line:{width:1.6,color:'#8ecae6'}},
    {x:lows.map(i=>time[i]),y:lows.map(i=>close[i]),name:'Lows',mode:'markers',marker:{symbol:'triangle-down',size:12,color:'lime',line:{color:'#111',width:1.8}}},
    {x:highs.map(i=>time[i]),y:highs.map(i=>close[i]),name:'Highs',mode:'markers',marker:{symbol:'triangle-up',size:12,color:'#ff4d4d',line:{color:'#111',width:1.8}}},
    ...levels.map((y:number)=>({x:[time[0],time[time.length-1]],y:[y,y],mode:'lines',line:{width:1,dash:'dot',color:'#90a4ae'},name:'lvl'}))
  ];
  const layout:any={height:220,margin:{l:40,r:10,t:20,b:20},showlegend:false,paper_bgcolor:'#fff',plot_bgcolor:'#fff'};
  return <Plot data={data} layout={layout} style={{width:'100%'}} />;
}
