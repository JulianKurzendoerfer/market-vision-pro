
import React,{useEffect,useMemo,useState} from 'react';
import Plotly from 'plotly.js-dist-min';
import {fetchOHLC} from '../lib/ohlc';
import {bbSignals} from '../signals/bb';

type S=Record<'EMAs'|'Bollinger'|'RSI'|'Stoch'|'MACD'|'TrendPanel'|'BBSig',boolean>;

function ema(a:number[],n:number){let k=2/(n+1), r:number[]=[]; let prev=a[0]??0; for(let i=0;i<a.length;i++){const v=i? (a[i]*k+prev*(1-k)) : a[i]; r.push(v); prev=v;} return r}
function sma(a:number[],n:number){const r:number[]=[];let s=0; for(let i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n]; r.push(i>=n-1?s/n:NaN)} return r}
function stoch(h:number[],l:number[],c:number[],n=14,k=3){const st:number[]=[]; for(let i=0;i<c.length;i++){let hi=-Infinity, lo=Infinity; for(let j=Math.max(0,i-n+1);j<=i;j++){hi=Math.max(hi,h[j]); lo=Math.min(lo,l[j]);} st.push(((c[i]-lo)/(hi-lo||1))*100)} return {k:sma(st,k), d:sma(st,k)}}
function rsi(close:number[],n=14){let gains=0,loss=0; const rs:number[]=[]; for(let i=1;i<close.length;i++){const ch=close[i]-close[i-1]; gains+=Math.max(0,ch); loss+=Math.max(0,-ch); if(i>=n){const ch2=close[i-n+1]-close[i-n]; gains-=Math.max(0,ch2); loss-=Math.max(0,-ch2);} rs.push(i>=n? (100-100/(1+(gains/(loss||1)))):NaN)} return [NaN,...rs]}
function macd(c:number[],f=12,s=26,sg=9){const fast=ema(c,f), slow=ema(c,s); const m=fast.map((v,i)=>v-(slow[i]??0)); const sig=ema(m,sg); return {macd:m, sig, hist:m.map((v,i)=>v-(sig[i]??0))}}

export default function ChartDashboard(){
  const [ticker,setTicker]=useState('AAPL');
  const [studies,setStudies]=useState<S>({EMAs:true,Bollinger:true,RSI:true,Stoch:true,MACD:true,TrendPanel:true,BBSig:true});
  const [data,setData]=useState<{time:number[],open:number[],high:number[],low:number[],close:number[]}|null>(null);

  useEffect(()=>{let ok=true; fetchOHLC(ticker).then(d=>{if(ok) setData(d)}); return()=>{ok=false}},[ticker]);

  const fig=useMemo(()=> {
    if(!data) return null;
    const {time,open,high,low,close}=data;
    const x=time.map(t=>new Date(t));
    const traces:any[]=[]; const layout:any={grid:{rows:4,columns:1,pattern:'independent'}, height:900, margin:{l:50,r:10,t:20,b:20}, showlegend:false};
    traces.push({x,y:close,type:'scatter',mode:'lines',line:{width:1},name:'Price',xaxis:'x',yaxis:'y'});
    if(studies.EMAs){
      [8,20,50,200].forEach(n=>traces.push({x,y:ema(close,n),type:'scatter',mode:'lines',line:{width:n>=200?2:1,dash:n>=50?'solid':'dot'},name:'EMA'+n,xaxis:'x',yaxis:'y'}));
    }
    if(studies.Bollinger){
      const m=sma(close,20); const sd=sma(close.map((c,i)=>Math.abs(c-(m[i]||c))),20);
      const up=m.map((v,i)=>v+(sd[i]||0)*2), lo=m.map((v,i)=>v-(sd[i]||0)*2);
      traces.push({x,y:up,type:'scatter',mode:'lines',line:{width:1},name:'BB up',xaxis:'x',yaxis:'y'});
      traces.push({x,y:m ,type:'scatter',mode:'lines',line:{width:1,dash:'dot'},name:'BB mid',xaxis:'x',yaxis:'y'});
      traces.push({x,y:lo,type:'scatter',mode:'lines',line:{width:1},name:'BB low',xaxis:'x',yaxis:'y'});
      if(studies.BBSig){
        const sig=bbSignals(close,20,2,0.01);
        if(sig.strong.buy.t.length) traces.push({x:sig.strong.buy.t.map(i=>x[i]), y:sig.strong.buy.y, type:'scatter', mode:'markers', marker:{symbol:'triangle-up', size:9}, name:'BB Buy (strong)', xaxis:'x', yaxis:'y'});
        if(sig.weak.buy.t.length) traces.push({x:sig.weak.buy.t.map(i=>x[i]), y:sig.weak.buy.y, type:'scatter', mode:'markers', marker:{symbol:'triangle-up', size:6}, name:'BB Buy (weak)', xaxis:'x', yaxis:'y'});
        if(sig.strong.sell.t.length) traces.push({x:sig.strong.sell.t.map(i=>x[i]), y:sig.strong.sell.y, type:'scatter', mode:'markers', marker:{symbol:'triangle-down', size:9}, name:'BB Sell (strong)', xaxis:'x', yaxis:'y'});
        if(sig.weak.sell.t.length) traces.push({x:sig.weak.sell.t.map(i=>x[i]), y:sig.weak.sell.y, type:'scatter', mode:'markers', marker:{symbol:'triangle-down', size:6}, name:'BB Sell (weak)', xaxis:'x', yaxis:'y'});
      }
    }
    layout['yaxis']={domain:[0.62,1]};

    if(studies.RSI){
      const r=rsi(close,14); traces.push({x,y:r,type:'scatter',mode:'lines',xaxis:'x2',yaxis:'y2'});
      layout['yaxis2']={domain:[0.46,0.60],range:[0,100]};
    }
    if(studies.Stoch){
      const st=stoch(high,low,close,14,3);
      traces.push({x,y:st.k,type:'scatter',mode:'lines',xaxis:'x3',yaxis:'y3'});
      traces.push({x,y:st.d,type:'scatter',mode:'lines',xaxis:'x3',yaxis:'y3'});
      layout['yaxis3']={domain:[0.30,0.44],range:[0,100]};
    }
    if(studies.MACD){
      const m=macd(close,12,26,9);
      traces.push({x,y:m.macd,type:'scatter',mode:'lines',xaxis:'x4',yaxis:'y4'});
      traces.push({x,y:m.sig ,type:'scatter',mode:'lines',xaxis:'x4',yaxis:'y4'});
      traces.push({x,y:m.hist,type:'bar',xaxis:'x4',yaxis:'y4',opacity:0.3});
      layout['yaxis4']={domain:[0.10,0.28]};
    }
    if(studies.TrendPanel){
      // nur Close-Trend unten, High/Low Marker entfernt
      traces.push({x,y:close.map((c,i)=> (i%20? NaN : close[i])), type:'scatter',mode:'markers', marker:{size:0.1}, xaxis:'x4', yaxis:'y4', showlegend:false});
    }
    return {traces, layout};
  },[data,studies]);

  useEffect(()=> {
    const el=document.getElementById('root-plot'); if(!el||!fig) return;
    Plotly.react(el, fig.traces, fig.layout as any, {responsive:true});
  },[fig]);

  return (
    <div style={{padding:'12px'}}>
      <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <label><input type="checkbox" checked={studies.EMAs} onChange={e=>setStudies(s=>({...s,EMAs:e.target.checked}))}/> EMAs</label>
        <label><input type="checkbox" checked={studies.Bollinger} onChange={e=>setStudies(s=>({...s,Bollinger:e.target.checked}))}/> Bollinger</label>
        <label><input type="checkbox" checked={studies.RSI} onChange={e=>setStudies(s=>({...s,RSI:e.target.checked}))}/> RSI</label>
        <label><input type="checkbox" checked={studies.Stoch} onChange={e=>setStudies(s=>({...s,Stoch:e.target.checked}))}/> Stoch</label>
        <label><input type="checkbox" checked={studies.MACD} onChange={e=>setStudies(s=>({...s,MACD:e.target.checked}))}/> MACD</label>
        <label><input type="checkbox" checked={studies.TrendPanel} onChange={e=>setStudies(s=>({...s,TrendPanel:e.target.checked}))}/> TrendPanel</label>
        <label><input type="checkbox" checked={studies.BBSig} onChange={e=>setStudies(s=>({...s,BBSig:e.target.checked}))}/> BB-Signals</label>
        <input defaultValue={ticker} onChange={(e)=>setTicker(e.currentTarget.value.toUpperCase())} style={{width:90}}/>
        <button onClick={()=>setTicker(t=>t)}>Refresh</button>
      </div>
      <div id="root-plot" style={{height:900}} />
    </div>
  );
}
