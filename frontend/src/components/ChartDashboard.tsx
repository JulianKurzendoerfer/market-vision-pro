import React, {useEffect, useMemo, useState} from "react";
import Plot from "react-plotly.js";

type OHLC = { time:number|string; open:number; high:number; low:number; close:number };

function sma(arr:number[], n:number){const out:number[]=[];let s=0;for(let i=0;i<arr.length;i++){s+=arr[i];if(i>=n)s-=arr[i-n];out.push(i>=n-1?s/n:NaN);}return out;}
function ema(arr:number[], n:number){const out:number[]=[];const k=2/(n+1);let e=arr[0]??0;for(let i=0;i<arr.length;i++){const v=arr[i];e=isFinite(v)?(v-e)*k+e:e;out.push(i?e:NaN);}return out;}
function stdev(arr:number[], n:number){const out:number[]=[];let q:number[]=[];for(let i=0;i<arr.length;i++){q.push(arr[i]);if(q.length>n)q.shift();if(q.length<n){out.push(NaN);}else{const m=q.reduce((a,b)=>a+b,0)/n;out.push(Math.sqrt(q.reduce((a,b)=>a+(b-m)*(b-m),0)/n));}}return out;}
function rsi(close:number[], n=14){const out:number[]=[];let ag=0,al=0;for(let i=1;i<close.length;i++){const ch=close[i]-close[i-1];const g=Math.max(ch,0), l=Math.max(-ch,0);if(i<=n){ag+=g;al+=l;out.push(NaN);continue;} if(i===n+1){ag/=n;al/=n;} else {ag=(ag*(n-1)+g)/n;al=(al*(n-1)+l)/n;} const rs=al===0?100:100-100/(1+ag/al);out.push(rs);}out.unshift(NaN);return out;}
function bb(close:number[], n=20, k=2){const m=sma(close,n);const sd=stdev(close,n);const up:number[]=[], lo:number[]=[];for(let i=0;i<close.length;i++){up.push(isFinite(m[i])&&isFinite(sd[i])?m[i]+k*sd[i]:NaN);lo.push(isFinite(m[i])&&isFinite(sd[i])?m[i]-k*sd[i]:NaN);}return {mid:m, up, lo};}
function macd(close:number[], fast=12, slow=26, sig=9){const f=ema(close,fast), s=ema(close,slow);const m=close.map((_,i)=> (isFinite(f[i])&&isFinite(s[i]))?f[i]-s[i]:NaN);const signal=ema(m.map(v=>isFinite(v)?v:0),sig);const hist=m.map((v,i)=> (isFinite(v)&&isFinite(signal[i]))?v-signal[i]:NaN);return {macd:m, signal, hist};}
function stoch(high:number[], low:number[], close:number[], n=14, d=3){const k:number[]=[];for(let i=0;i<close.length;i++){const s=Math.max(0,i-n+1);const hh=Math.max(...high.slice(s,i+1));const ll=Math.min(...low.slice(s,i+1));k.push(i>=n-1? ((close[i]-ll)/(hh-ll))*100 : NaN);}const dline=sma(k,d);return {k, d:dline};}
function extrema(high:number[], low:number[], look=10){const hIdx:number[]=[], lIdx:number[]=[];for(let i=look;i<high.length-look;i++){let isH=true,isL=true;for(let j=-look;j<=look;j++){if(high[i]<high[i+j]){isH=false;break;}}for(let j=-look;j<=look;j++){if(low[i]>low[i+j]){isL=false;break;}}if(isH)hIdx.push(i);if(isL)lIdx.push(i);}return {hIdx,lIdx};}

async function fetchOHLC(ticker:string):Promise<OHLC[]>{
  const qs = encodeURIComponent(ticker);
  const urls = [`/api/ohlc?q=${qs}`, `/api/ohlc?t=${qs}`, `/api/candles?t=${qs}`];
  for(const u of urls){
    try{
      const r = await fetch(u, {cache:"no-store"});
      if(!r.ok) continue;
      const j = await r.json();
      const a = Array.isArray(j)? j : (j?.data||j?.candles||[]);
      if(a?.length) return a as OHLC[];
    }catch{}
  }
  return [];
}

export default function ChartDashboard(){
  const [ticker,setTicker] = useState<string>("AAPL");
  const [data,setData] = useState<OHLC[]>([]);
  const [tog,setTog] = useState({EMAs:true,Bollinger:true,RSI:true,Stoch:true,MACD:true,TrendPanel:true,BbSig:true});

  useEffect(()=>{(async()=>{const d=await fetchOHLC(ticker);setData(d);})();},[ticker]);

  const derived = useMemo(()=>{
    const t = data.map(d=> (typeof d.time==="number")? new Date(d.time).toISOString() : d.time);
    const o = data.map(d=> +d.open), h = data.map(d=> +d.high), l = data.map(d=> +d.low), c = data.map(d=> +d.close);
    const e20 = ema(c,20), e50 = ema(c,50), e200 = ema(c,200);
    const bands = bb(c,20,2);
    const st = stoch(h,l,c,14,3);
    const r = rsi(c,14);
    const m = macd(c,12,26,9);
    const ex = extrema(h,l,10);
    return {t,o,h,l,c,e20,e50,e200,bands,st,r,m,ex};
  },[data]);

  const traces:any[] = [];
  if(data.length){
    traces.push({type:"candlestick", x:derived.t, open:derived.o, high:derived.h, low:derived.l, close:derived.c, name:"Price", xaxis:"x", yaxis:"y"});
    if(tog.EMAs){
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.e20, name:"EMA20", xaxis:"x", yaxis:"y"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.e50, name:"EMA50", xaxis:"x", yaxis:"y"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.e200, name:"EMA200", xaxis:"x", yaxis:"y"});
    }
    if(tog.Bollinger){
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.bands.up, name:"BB Upper", xaxis:"x", yaxis:"y"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.bands.mid, name:"BB Mid", xaxis:"x", yaxis:"y"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.bands.lo, name:"BB Lower", xaxis:"x", yaxis:"y"});
    }
    if(tog.Stoch){
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.st.k, name:"%K", xaxis:"x2", yaxis:"y2"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.st.d, name:"%D", xaxis:"x2", yaxis:"y2"});
    }
    if(tog.RSI){
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.r, name:"RSI", xaxis:"x3", yaxis:"y3"});
    }
    if(tog.MACD){
      traces.push({type:"bar", x:derived.t, y:derived.m.hist, name:"MACD hist", xaxis:"x4", yaxis:"y4"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.m.macd, name:"MACD", xaxis:"x4", yaxis:"y4"});
      traces.push({type:"scatter", mode:"lines", x:derived.t, y:derived.m.signal, name:"Signal", xaxis:"x4", yaxis:"y4"});
    }
    if(tog.TrendPanel){
      const lastIdx = [...derived.ex.hIdx.slice(-8).map(i=>({i,dir:"H" as const})), ...derived.ex.lIdx.slice(-8).map(i=>({i,dir:"L" as const}))].sort((a,b)=>a.i-b.i);
      for(const p of lastIdx){
        const y = p.dir==="H"? derived.h[p.i] : derived.l[p.i];
        traces.push({type:"scatter", mode:"markers", x:[derived.t[p.i]], y:[y], marker:{size:10,symbol:p.dir==="H"?"triangle-up":"triangle-down"}, name:p.dir==="H"?"High":"Low", xaxis:"x5", yaxis:"y5"});
        traces.push({type:"scatter", mode:"lines", x:[derived.t[0], derived.t[derived.t.length-1]], y:[y,y], name:`L${p.i}`, hoverinfo:"skip", showlegend:false, xaxis:"x5", yaxis:"y5"});
      }
    }
  }

  const shapes:any[] = [];
  if(tog.RSI && data.length){
    const x0 = derived.t[0], x1 = derived.t[derived.t.length-1];
    shapes.push({type:"line", x0, x1, y0:70, y1:70, xref:"x3", yref:"y3"});
    shapes.push({type:"line", x0, x1, y0:30, y1:30, xref:"x3", yref:"y3"});
  }

  return (
    <div style={{padding:"10px"}}>
      <div style={{display:"flex", gap:12, alignItems:"center"}}>
        <strong>Market Vision Pro</strong>
        <label><input type="checkbox" checked={tog.EMAs} onChange={()=>setTog({...tog,EMAs:!tog.EMAs})}/> EMAs</label>
        <label><input type="checkbox" checked={tog.Bollinger} onChange={()=>setTog({...tog,Bollinger:!tog.Bollinger})}/> Bollinger</label>
        <label><input type="checkbox" checked={tog.Stoch} onChange={()=>setTog({...tog,Stoch:!tog.Stoch})}/> Stoch</label>
        <label><input type="checkbox" checked={tog.RSI} onChange={()=>setTog({...tog,RSI:!tog.RSI})}/> RSI</label>
        <label><input type="checkbox" checked={tog.MACD} onChange={()=>setTog({...tog,MACD:!tog.MACD})}/> MACD</label>
        <label><input type="checkbox" checked={tog.TrendPanel} onChange={()=>setTog({...tog,TrendPanel:!tog.TrendPanel})}/> TrendPanel</label>
        <input defaultValue={ticker} onChange={(e)=>setTicker(e.currentTarget.value.toUpperCase())} style={{width:80}}/>
        <button onClick={()=>setTicker(t=>t)}>Refresh</button>
      </div>
      <Plot
        data={traces as any}
        layout={{
          grid:{rows:5, columns:1, pattern:"independent", roworder:"top to bottom"},
          height: 920,
          margin:{l:60,r:20,t:10,b:30},
          showlegend:false,
          shapes,
          yaxis:{title:"Price"},
          yaxis2:{title:"Stoch", range:[0,100]},
          yaxis3:{title:"RSI", range:[0,100]},
          yaxis4:{title:"MACD"},
          yaxis5:{title:"Trend"},
        } as any}
        useResizeHandler
        style={{width:"100%"}}
      />
    </div>
  );
}
