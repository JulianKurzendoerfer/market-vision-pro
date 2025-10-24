import React, {useEffect, useState} from 'react';
import PlotFactory from 'react-plotly.js/factory';
import Plotly from 'plotly-js-dist-min';
const Plot:any = PlotFactory(Plotly as any);

type OHLC = { time:any[]; close:number[]; high:number[]; low:number[] } | null;

function extractOHLC(): OHLC {
  const els = document.querySelectorAll('.js-plotly-plot');
  if (!els.length) return null;
  const gd:any = els[0] as any;
  const data:any[] = gd.data || [];
  let time:any[] = [], close:number[] = [], high:number[] = [], low:number[] = [];
  for (const t of data) {
    if (t && t.type === 'candlestick' && t.close && t.high && t.low) {
      time = (t.x || []).slice();
      close = (t.close || []).slice();
      high = (t.high || []).slice();
      low = (t.low || []).slice();
      break;
    }
  }
  if (!close.length) return null;
  return { time, close, high, low };
}

function extrema(vals:number[], win=10){ const n=vals.length; const lows:number[]=[]; const highs:number[]=[];
  for(let i=win;i<n-win;i++){ let low=true, high=true;
    for(let k=1;k<=win;k++){ if(vals[i-k] < vals[i] || vals[i+k] < vals[i]) low=false;
      if(vals[i-k] > vals[i] || vals[i+k] > vals[i]) high=false; }
    if(low) lows.push(i); if(high) highs.push(i);
  } return {lows, highs};
}

function clusterLevels(v:number[], tol=0.01){
  const s = v.slice().sort((a,b)=>a-b); const lv:number[]=[]; const ct:number[]=[];
  for(const x of s){
    if(!lv.length || Math.abs(x-lv[lv.length-1])>tol*Math.max(1,Math.abs(lv[lv.length-1]))){
      lv.push(x); ct.push(1);
    }else{
      ct[ct.length-1]++; const c=ct[ct.length-1]; lv[lv.length-1]=(lv[lv.length-1]*(c-1)+x)/c;
    }
  }
  const mn=Math.min(...ct), mx=Math.max(...ct);
  const strength=ct.map(c=>(c-mn)/(mx-mn+1e-9));
  return {levels:lv, counts:ct, strength};
}

export default function TrendPanel(){
  const [st,setSt] = useState<any>(null);
  useEffect(()=>{
    let t:any; let run=true;
    const pull=()=>{
      if(!run) return;
      const o = extractOHLC();
      if(o){
        const ex = extrema(o.close, 10);
        const mix = ex.lows.concat(ex.highs).map(i=>o.close[i]);
        const cl = clusterLevels(mix, 0.01);
        setSt({o,ex,cl}); return;
      }
      t = window.setTimeout(pull, 600);
    };
    pull();
    const onr=()=>pull();
    window.addEventListener('resize', onr);
    return ()=>{ run=false; window.removeEventListener('resize', onr); if(t) window.clearTimeout(t); };
  },[]);
  if(!st) return null;
  const {o,ex,cl} = st;
  const data:any[] = [
    {x:o.time,y:o.close,name:'Close',type:'scatter',mode:'lines',line:{width:1.4,color:'#1f77b4'}},
    {x:ex.lows.map((i:number)=>o.time[i]), y:ex.lows.map((i:number)=>o.close[i]), name:'Lows',type:'scatter',mode:'markers', marker:{symbol:'triangle-down',size:11,color:'lime',line:{color:'#111',width:1.2}}},
    {x:ex.highs.map((i:number)=>o.time[i]), y:ex.highs.map((i:number)=>o.close[i]), name:'Highs',type:'scatter',mode:'markers', marker:{symbol:'triangle-up',size:11,color:'red',line:{color:'#111',width:1.2}}}
  ];
  for(let i=0;i<cl.levels.length;i++){
    const y=cl.levels[i], s=cl.strength[i], r=Math.round(255*(1-s)), g=Math.round(150+80*s);
    data.push({x:o.time, y:o.time.map(()=>y), type:'scatter', mode:'lines', name:`L${i+1}`, line:{width:1, dash:'dot', color:`rgba(${r},${g},255,0.9)`}, hoverinfo:'skip'});
  }
  const layout:any = {height:220, margin:{l:40,r:10,t:20,b:20}, showlegend:false};
  return <Plot data={data} layout={layout} style={{width:'100%'}} />;
}
