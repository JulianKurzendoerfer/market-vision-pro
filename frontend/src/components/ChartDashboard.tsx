import React,{useEffect,useMemo,useState} from 'react';
import Plotly from 'plotly.js-dist-min';
import {fetchOHLC} from '../lib/ohlc';
import {bbSignals,bbBadge} from '../signals/bb';

type Toggles=Record<'EMAs'|'Bollinger'|'RSI'|'Stoch'|'MACD'|'TrendPanel'|'BBSig',boolean>;

function sma(a:number[],n:number){const r:number[]=[];let s=0; for(let i=0;i<a.length;i++){s+=a[i]; if(i>=n)s-=a[i-n]; r.push(i>=n-1?s/n:NaN)} return r}
function ema(a:number[],n:number){let k=2/(n+1), out:number[]=[]; let prev=a[0]??0; for(let i=0;i<a.length;i++){const v=i? (a[i]*k+prev*(1-k)) : a[i]; out.push(v); prev=v;} return out}
function rsi(c:number[],n=14){let g=0,l=0; const r:number[]=[NaN]; for(let i=1;i<c.length;i++){const d=c[i]-c[i-1]; g+=Math.max(0,d); l+=Math.max(0,-d);
 if(i>=n){const d2=c[i-n+1]-c[i-n]; g-=Math.max(0,d2); l-=Math.max(0,-d2)} r.push(i>=n? 100-100/(1+(g/(l||1))) : NaN)} return r}
function stoch(h:number[],l:number[],c:number[],n=14,k=3,d=3){const raw:number[]=[]; for(let i=0;i<c.length;i++){let hi=-Infinity, lo=Infinity; for(let j=Math.max(0,i-n+1);j<=i;j++){hi=Math.max(hi,h[j]); lo=Math.min(lo,l[j])} raw.push(((c[i]-lo)/(hi-lo||1))*100)} const K=sma(raw,k), D=sma(K,d); return {K,D}}
function macd(c:number[],f=12,s=26,sg=9){const F=ema(c,f), S=ema(c,s), M=F.map((v,i)=>v-(S[i]??0)), Sig=ema(M,sg); return {M,Sig,Hist:M.map((v,i)=>v-(Sig[i]??0))}}
function extremaLevels(close:number[],w=10,limit=8){const lvl=new Map<number,number>(); for(let i=w;i<close.length-w;i++){const c=close[i]; let isMax=true,isMin=true; for(let j=i-w;j<=i+w;j++){if(close[j]>c)isMax=false; if(close[j]<c)isMin=false} if(isMax||isMin){lvl.set(Math.round(c*100)/100,(lvl.get(Math.round(c*100)/100)||0)+1)}} return [...lvl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([p])=>p)}

export default function ChartDashboard(){
  const [ticker,setTicker]=useState('AAPL');
  const [range,setRange]=useState('1y');
  const [tog,setTog]=useState<Toggles>({EMAs:true,Bollinger:true,RSI:true,Stoch:true,MACD:true,TrendPanel:true,BBSig:true});
  const [d,setD]=useState<{time:number[];open:number[];high:number[];low:number[];close:number[]}|null>(null);

  useEffect(()=>{let ok=true; fetchOHLC(ticker,'1d',range).then(x=>ok&&setD(x)); return()=>{ok=false}},[ticker,range]);

  const fig=useMemo(()=> {
    if(!d) return null;
    const {time,open,high,low,close}=d;
    const x=time.map(t=>new Date(t));
    const traces:any[]=[]; const layout:any={grid:{rows:4,columns:1,pattern:'independent'},height:920,margin:{l:52,r:10,t:10,b:20},showlegend:false, hovermode:'x unified'};

    // MAIN (Candles)
    traces.push({x, open, high, low, close, type:'candlestick', xaxis:'x', yaxis:'y', name:'Price'});

    // EMAs kompakt
    if(tog.EMAs){ [8,21,50,200].forEach((n,i)=>traces.push({x,y:ema(close,n),type:'scatter',mode:'lines',line:{width:i===3?2:1},name:'EMA'+n,xaxis:'x',yaxis:'y'})); }

    // Bollinger
    if(tog.Bollinger){
      const m=sma(close,20); const dev=sma(close.map((c,i)=>Math.abs(c-(m[i]||c))),20);
      const up=m.map((v,i)=>v+2*(dev[i]||0)), lo=m.map((v,i)=>v-2*(dev[i]||0));
      traces.push({x,y:up,type:'scatter',mode:'lines',line:{width:1},xaxis:'x',yaxis:'y',name:'BB up'});
      traces.push({x,y:m, type:'scatter',mode:'lines',line:{width:1,dash:'dot'},xaxis:'x',yaxis:'y',name:'BB mid'});
      traces.push({x,y:lo,type:'scatter',mode:'lines',line:{width:1},xaxis:'x',yaxis:'y',name:'BB low'});
      if(tog.BBSig){
        const sig=bbSignals(close,20,2,0.01);
        if(sig.strong.buy.t.length) traces.push({x:sig.strong.buy.t.map(i=>x[i]),y:sig.strong.buy.y,type:'scatter',mode:'markers',marker:{symbol:'triangle-up',size:9},xaxis:'x',yaxis:'y',name:'BB Buy (strong)'});
        if(sig.weak.buy.t.length)   traces.push({x:sig.weak.buy.t.map(i=>x[i]),y:sig.weak.buy.y  ,type:'scatter',mode:'markers',marker:{symbol:'triangle-up',size:6},xaxis:'x',yaxis:'y',name:'BB Buy (weak)'});
        if(sig.strong.sell.t.length)traces.push({x:sig.strong.sell.t.map(i=>x[i]),y:sig.strong.sell.y,type:'scatter',mode:'markers',marker:{symbol:'triangle-down',size:9},xaxis:'x',yaxis:'y',name:'BB Sell (strong)'});
        if(sig.weak.sell.t.length)  traces.push({x:sig.weak.sell.t.map(i=>x[i]),y:sig.weak.sell.y  ,type:'scatter',mode:'markers',marker:{symbol:'triangle-down',size:6},xaxis:'x',yaxis:'y',name:'BB Sell (weak)'}); }
    }
    layout.yaxis={domain:[0.55,1]};

    // RSI Panel
    if(tog.RSI){ const r=rsi(close,14);
      traces.push({x,y:r,type:'scatter',mode:'lines',xaxis:'x2',yaxis:'y2',name:'RSI'});
      traces.push({x,y:Array(r.length).fill(70),type:'scatter',mode:'lines',line:{width:1,dash:'dot'},xaxis:'x2',yaxis:'y2',showlegend:false});
      traces.push({x,y:Array(r.length).fill(30),type:'scatter',mode:'lines',line:{width:1,dash:'dot'},xaxis:'x2',yaxis:'y2',showlegend:false});
      layout.yaxis2={domain:[0.40,0.52],range:[0,100]};
    }

    // Stoch Panel
    if(tog.Stoch){ const st=stoch(high,low,close,14,3,3);
      traces.push({x,y:st.K,type:'scatter',mode:'lines',xaxis:'x3',yaxis:'y3',name:'%K'});
      traces.push({x,y:st.D,type:'scatter',mode:'lines',xaxis:'x3',yaxis:'y3',name:'%D'});
      traces.push({x,y:Array(st.K.length).fill(80),type:'scatter',mode:'lines',line:{width:1,dash:'dot'},xaxis:'x3',yaxis:'y3',showlegend:false});
      traces.push({x,y:Array(st.K.length).fill(20),type:'scatter',mode:'lines',line:{width:1,dash:'dot'},xaxis:'x3',yaxis:'y3',showlegend:false});
      layout.yaxis3={domain:[0.26,0.38],range:[0,100]};
    }

    // MACD Panel
    if(tog.MACD){ const m=macd(close,12,26,9);
      traces.push({x,y:m.M  ,type:'scatter',mode:'lines',xaxis:'x4',yaxis:'y4',name:'MACD'});
      traces.push({x,y:m.Sig,type:'scatter',mode:'lines',xaxis:'x4',yaxis:'y4',name:'Signal'});
      traces.push({x,y:m.Hist,type:'bar',opacity:0.3,xaxis:'x4',yaxis:'y4',name:'Hist'});
      layout.yaxis4={domain:[0.10,0.24]};
    }

    // TrendPanel (Level-Linien) — separat, NICHT im Hauptchart
    if(tog.TrendPanel){
      const levels=extremaLevels(close,10,8);
      levels.forEach(v=>traces.push({x:[x[0],x[x.length-1]],y:[v,v],type:'scatter',mode:'lines',line:{width:1},xaxis:'x4',yaxis:'y4',showlegend:false}));
    }

    return {traces,layout};
  },[d,tog,range]);

  useEffect(()=>{ const el=document.getElementById('root-plot'); if(!el||!fig) return;
    Plotly.react(el,fig.traces,fig.layout as any,{responsive:true});
  },[fig]);

  const badge=useMemo(()=> d? bbBadge(d.close,20,2,0.01) : {text:'',bg:'transparent'},[d]);

  return (<div style={{padding:'10px'}}>
    <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',fontFamily:'system-ui,Segoe UI,Roboto'}}>
      <strong>Market Vision Pro</strong>
      <label><input type="checkbox" checked={tog.EMAs}      onChange={e=>setTog(s=>({...s,EMAs:e.target.checked}))}/> EMAs</label>
      <label><input type="checkbox" checked={tog.Bollinger} onChange={e=>setTog(s=>({...s,Bollinger:e.target.checked}))}/> Bollinger</label>
      <label><input type="checkbox" checked={tog.RSI}       onChange={e=>setTog(s=>({...s,RSI:e.target.checked}))}/> RSI</label>
      <label><input type="checkbox" checked={tog.Stoch}     onChange={e=>setTog(s=>({...s,Stoch:e.target.checked}))}/> Stoch</label>
      <label><input type="checkbox" checked={tog.MACD}      onChange={e=>setTog(s=>({...s,MACD:e.target.checked}))}/> MACD</label>
      <label><input type="checkbox" checked={tog.TrendPanel}onChange={e=>setTog(s=>({...s,TrendPanel:e.target.checked}))}/> TrendPanel</label>
      <label><input type="checkbox" checked={tog.BBSig}     onChange={e=>setTog(s=>({...s,BBSig:e.target.checked}))}/> BB Signals</label>
      <input value={ticker} onChange={e=>setTicker(e.currentTarget.value.toUpperCase())} style={{width:88}}/>
      <select value={range} onChange={e=>setRange(e.currentTarget.value)}>
        <option value="6m">6m</option><option value="1y">1y</option><option value="2y">2y</option><option value="5y">5y</option>
      </select>
      <button onClick={()=>setTicker(t=>t)}>Refresh</button>
    </div>
    <div style={{position:'relative'}}>
      <div id="root-plot" style={{height:920}}/>
      {badge.text && <div style={{position:'absolute',left:12,top:10,padding:'4px 8px',borderRadius:6,fontSize:12,color:'#fff',background:badge.bg}}>{badge.text}</div>}
    </div>
  </div>);
}
