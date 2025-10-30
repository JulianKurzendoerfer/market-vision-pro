import React, { useMemo } from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { computeBB } from "../signals/indicators/bb";
import type { OHLC } from "../signals/types";

const Plot:any = createPlotlyComponent(Plotly);

function probeOHLC():OHLC{
  const w:any = (window as any);
  const pick = (x:any)=> Array.isArray(x)?x : (x&&x.data?x.data:x&&x.fullData?x.fullData:null);
  const cand = (arr:any[]) => arr.find((t:any)=> t && (t.type==="candlestick" || (t.open&&t.high&&t.low&&t.close)));
  const sources = [w.__gd, w._gd, w.gd, w.data, w.gd_fullData, (w.appState&&w.appState.data)];
  for(const s of sources){
    const a = pick(s);
    if(Array.isArray(a)){
      const t = cand(a);
      if(t){
        const time = (t.x||t.time||[]).map((v:any)=> new Date(v).getTime());
        return { time, open:t.open||[], high:t.high||[], low:t.low||[], close:t.close||[] };
      }
    }
  }
  const n=200, now=Date.now(); const day=24*3600*1000;
  const time:number[]=[]; const close:number[]=[]; const open:number[]=[]; const high:number[]=[]; const low:number[]=[];
  let p=200;
  for(let i=n-1;i>=0;i--){
    time.push(now - i*day);
  }
  for(let i=0;i<n;i++){
    const step=(Math.random()-0.5)*2;
    const o=p; const c=p+step; const h=Math.max(o,c)+Math.random(); const l=Math.min(o,c)-Math.random();
    open.push(+o.toFixed(2)); close.push(+c.toFixed(2)); high.push(+h.toFixed(2)); low.push(+l.toFixed(2));
    p=c;
  }
  return { time, open, high, low, close };
}

export default function ChartDashboard(){
  const ohlc = useMemo(()=>probeOHLC(),[]);
  const bb = useMemo(()=>computeBB(ohlc,20,2,1.5),[ohlc]);

  const candle = {
    type:"candlestick",
    x: ohlc.time,
    open: ohlc.open, high: ohlc.high, low: ohlc.low, close: ohlc.close,
    name:"Price"
  };

  const buyS = { x: ohlc.time, y: bb.buyStrong, mode:"markers", name:"BB Buy (strong)", marker:{symbol:"triangle-up", size:10}, type:"scatter" as const };
  const buyW = { x: ohlc.time, y: bb.buyWeak,   mode:"markers", name:"BB Buy (weak)",   marker:{symbol:"triangle-up", size:8},  type:"scatter" as const };
  const selS = { x: ohlc.time, y: bb.sellStrong,mode:"markers", name:"BB Sell (strong)",marker:{symbol:"triangle-down", size:10}, type:"scatter" as const };
  const selW = { x: ohlc.time, y: bb.sellWeak,  mode:"markers", name:"BB Sell (weak)",  marker:{symbol:"triangle-down", size:8},  type:"scatter" as const };

  const layout:any = { height: 520, margin:{l:40,r:10,t:30,b:40}, xaxis:{type:"date"} };
  const badge = bb.last ? bb.last : {label:"BB: neutral", color:"#888", dir:"neutral"};

  return (
    <div style={{padding:16,fontFamily:"system-ui, -apple-system, Segoe UI, Roboto"}}>
      <h1 style={{margin:"0 0 12px"}}>Market Vision Pro</h1>
      <div style={{position:"relative"}}>
        <div style={{position:"absolute", left:10, top:6, zIndex:10, background:badge.color, color:"#fff", padding:"4px 8px", borderRadius:6, fontSize:12}}>
          {badge.label}
        </div>
        <Plot data={[candle, buyS, buyW, selS, selW]} layout={layout} style={{width:"100%"}} />
      </div>
    </div>
  );
}
