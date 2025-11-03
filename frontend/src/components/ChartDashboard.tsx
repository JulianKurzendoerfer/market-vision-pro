
import React, {useEffect, useMemo, useState} from 'react';
import Plot from 'react-plotly.js';
import '../style.css';

type OHLC={time:number; open:number; high:number; low:number; close:number};
type Tog={EMAs:boolean; Bollinger:boolean; RSI:boolean; Stoch:boolean; MACD:boolean; TrendPanel:boolean};

async function fetchOHLC(ticker:string):Promise<OHLC[]>{
  const qs=encodeURIComponent(ticker.trim().toUpperCase());
  const paths=[`/api/ohlc?q=${qs}`, `/api/ohlc/${qs}`];
  for(const url of paths){
    try{
      const r=await fetch(url, {cache:'no-store'});
      if(r.ok){
        const j=await r.json();
        if(Array.isArray(j) && j.length) return j as OHLC[];
        if(Array.isArray(j.data)) return j.data as OHLC[];
      }
    }catch{}
  }
  // fallback: synthetische data, damit nichts weiß bleibt
  const n=260, day=24*3600*1000; const out:OHLC[]=[];
  let px=100;
  const t0=Date.now()-n*day;
  for(let i=0;i<n;i++){
    const t=t0+i*day;
    const drift = Math.sin(i/22)*0.6 + 0.2;
    const noise = (Math.random()-0.5)*1.5;
    const next = Math.max(1, px + drift + noise);
    const o = px, c = next;
    const h = Math.max(o,c) + Math.random()*0.8;
    const l = Math.min(o,c) - Math.random()*0.8;
    out.push({time:t, open:o, high:h, low:l, close:c});
    px = next;
  }
  return out;
}

// Indikatoren (leichtgewichtig)
function ema(arr:number[], p:number){
  const k=2/(p+1); const out:number[]=[];
  let e=arr[0]??0; out.push(e);
  for(let i=1;i<arr.length;i++){ e = arr[i]*k + e*(1-k); out.push(e); }
  return out;
}
function sma(arr:number[], p:number){
  const out:number[]=[], q:number[]=[];
  let s=0;
  for(let i=0;i<arr.length;i++){
    q.push(arr[i]); s+=arr[i];
    if(q.length>p) s-=q.shift()!;
    out.push(q.length<p ? s/q.length : s/p);
  }
  return out;
}
function bollinger(close:number[], win=20, k=2){
  const ma=sma(close,win);
  const std=(a:number[], i:number)=>{
    const from=Math.max(0,i-win+1);
    const seg=a.slice(from,i+1);
    const m = seg.reduce((s,v)=>s+v,0)/seg.length;
    const v = seg.reduce((s,v)=>s+(v-m)*(v-m),0)/seg.length;
    return Math.sqrt(v);
  };
  const up:number[]=[], lo:number[]=[], ba:number[]=[];
  for(let i=0;i<close.length;i++){
    const b=ma[i], sd=std(close,i);
    ba.push(b); up.push(b + k*sd); lo.push(b - k*sd);
  }
  return {upper:up, lower:lo, basis:ba};
}
function rsi(close:number[], p=14){
  const out:number[]=[]; let avgU=0, avgD=0;
  for(let i=0;i<close.length;i++){
    if(i===0){ out.push(50); continue; }
    const ch = close[i]-close[i-1];
    const u = Math.max(0,ch), d = Math.max(0,-ch);
    if(i<=p){
      avgU = (avgU*(i-1)+u)/i;
      avgD = (avgD*(i-1)+d)/i;
    }else{
      avgU = (avgU*(p-1)+u)/p;
      avgD = (avgD*(p-1)+d)/p;
    }
    const rs = avgD===0 ? 100 : avgU/avgD;
    const val = 100 - 100/(1+rs);
    out.push(Math.max(0,Math.min(100,val)));
  }
  return out;
}
function stoch(high:number[], low:number[], close:number[], k=14, d=3){
  const kArr:number[]=[];
  for(let i=0;i<close.length;i++){
    const from=Math.max(0,i-k+1);
    const hh=Math.max(...high.slice(from,i+1));
    const ll=Math.min(...low.slice(from,i+1));
    const val = hh===ll? 50 : ((close[i]-ll)/(hh-ll))*100;
    kArr.push(val);
  }
  // D = SMA(K,d)
  const dArr=sma(kArr,d);
  return {k:kArr, d:dArr};
}
function macd(close:number[], fast=12, slow=26, signal=9){
  const e12=ema(close,fast);
  const e26=ema(close,slow);
  const mac:number[]=[]; for(let i=0;i<close.length;i++) mac.push(e12[i]-e26[i]);
  const sig=ema(mac,signal);
  const hist=mac.map((v,i)=>v-(sig[i]??0));
  return {macd:mac, signal:sig, hist};
}

// BB Badge: starker/schwacher (sell/buy/neutral)
function bbBadge(close:number[], up:number[], lo:number[]){
  let label='BB: neutral', color='#6b7280';
  if(!close.length) return {label, color};
  const c = close[close.length-1], u=up[up.length-1], l=lo[lo.length-1];
  const near = (x:number, y:number)=> Math.abs(x-y)/y;
  if(c>=u){ label='BB: strong sell'; color='#b91c1c'; }
  else if(near(c,u)<0.01){ label='BB: weak sell'; color='#dc2626'; }
  else if(c<=l){ label='BB: strong buy'; color='#15803d'; }
  else if(near(c,l)<0.01){ label='BB: weak buy'; color='#16a34a'; }
  return {label, color};
}

// Trend-Panel: einfache lokale High/Low Marker
function pivotMarks(high:number[], low:number[], win=10){
  const highs:number[]=[], lows:number[]=[];
  for(let i=0;i<high.length;i++){
    const a=Math.max(0,i-win), b=Math.min(high.length-1,i+win);
    const isH = high[i]===Math.max(...high.slice(a,b+1));
    const isL = low[i] ===Math.min(...low.slice(a,b+1));
    highs.push(isH?high[i]:NaN);
    lows.push(isL?low[i]:NaN);
  }
  return {highs, lows};
}

export default function ChartDashboard(){
  const [ticker,setTicker]=useState('AAPL');
  const [tog,setTog]=useState<Tog>({EMAs:true,Bollinger:true,RSI:true,Stoch:true,MACD:true,TrendPanel:true});
  const [data,setData]=useState<OHLC[]>([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{ (async()=>{
    setLoading(true);
    const d=await fetchOHLC(ticker);
    setData(d);
    setLoading(false);
  })(); },[ticker]);

  const derived = useMemo(()=>{
    const t = data.map(d=>new Date(d.time));
    const c = data.map(d=>+d.close), h=data.map(d=>+d.high), l=data.map(d=>+d.low), o=data.map(d=>+d.open);

    const e20 = ema(c,20), e50=ema(c,50), e200=ema(c,200);
    const bb = bollinger(c,20,2);
    const r14 = rsi(c,14);
    const st = stoch(h,l,c,14,3);
    const md = macd(c,12,26,9);
    const piv = pivotMarks(h,l,10);
    const badge = bbBadge(c,bb.upper,bb.lower);

    return {t,o,h,l,c,e20,e50,e200,bb,r14,st,md,piv,badge};
  },[data]);

  // Traces je Panel
  const priceTraces:any[] = useMemo(()=>{
    const {t,o,h,l,c,e20,e50,e200,bb} = derived;
    const arr:any[]=[];
    arr.push({type:'candlestick', x:t, open:o, high:h, low:l, close:c, name:'Price', yaxis:'y1', increasing:{line:{color:'#ef4444'}}, decreasing:{line:{color:'#22c55e'}}});
    if(tog.EMAs){
      arr.push({type:'scatter', mode:'lines', x:t, y:e20, name:'EMA20', yaxis:'y1', line:{width:1.6}});
      arr.push({type:'scatter', mode:'lines', x:t, y:e50, name:'EMA50', yaxis:'y1', line:{width:1.6}});
      arr.push({type:'scatter', mode:'lines', x:t, y:e200, name:'EMA200', yaxis:'y1', line:{width:2.0}});
    }
    if(tog.Bollinger){
      arr.push({type:'scatter', mode:'lines', x:t, y:bb.upper, name:'BB Upper', yaxis:'y1', line:{width:1.2, dash:'dot'}});
      arr.push({type:'scatter', mode:'lines', x:t, y:bb.basis, name:'BB Basis', yaxis:'y1', line:{width:1.2, dash:'dot'}});
      arr.push({type:'scatter', mode:'lines', x:t, y:bb.lower, name:'BB Lower', yaxis:'y1', line:{width:1.2, dash:'dot'}});
    }
    return arr;
  },[derived,tog]);

  const stochTraces:any[] = useMemo(()=>{
    if(!tog.Stoch) return [];
    const {t,st}=derived;
    return [
      {type:'scatter', mode:'lines', x:t, y:st.k, name:'Stoch %K', yaxis:'y2'},
      {type:'scatter', mode:'lines', x:t, y:st.d, name:'Stoch %D', yaxis:'y2'}
    ];
  },[derived,tog]);

  const rsiTraces:any[] = useMemo(()=>{
    if(!tog.RSI) return [];
    const {t,r14}=derived;
    return [{type:'scatter', mode:'lines', x:t, y:r14, name:'RSI', yaxis:'y3'}];
  },[derived,tog]);

  const macdTraces:any[] = useMemo(()=>{
    if(!tog.MACD) return [];
    const {t,md}=derived;
    return [
      {type:'bar', x:t, y:md.hist, name:'MACD hist', yaxis:'y4', marker:{opacity:0.35}},
      {type:'scatter', mode:'lines', x:t, y:md.macd, name:'MACD', yaxis:'y4'},
      {type:'scatter', mode:'lines', x:t, y:md.signal, name:'Signal', yaxis:'y4'}
    ];
  },[derived,tog]);

  const trendTraces:any[] = useMemo(()=>{
    if(!tog.TrendPanel) return [];
    const {t,piv}=derived;
    return [
      {type:'scatter', mode:'markers', x:t, y:piv.highs, name:'Highs', yaxis:'y5', marker:{symbol:'triangle-up', size:8, opacity:0.6}},
      {type:'scatter', mode:'markers', x:t, y:piv.lows,  name:'Lows',  yaxis:'y5', marker:{symbol:'triangle-down', size:8, opacity:0.6}}
    ];
  },[derived,tog]);

  // **BB-Signals entfernt**: keine Buy/Sell-Marker adden!
  const allTraces = [...priceTraces, ...stochTraces, ...rsiTraces, ...macdTraces, ...trendTraces];

  // Layout: 5 sauber getrennte Box-Domains
  const domains = {
    y1:[0.78, 0.99],  // Price
    y2:[0.60, 0.75],  // Stoch
    y3:[0.42, 0.57],  // RSI
    y4:[0.22, 0.40],  // MACD
    y5:[0.03, 0.20],  // Trend
  };
  const shapes:any[] = [
    // horizontale Trennerlinien
    {type:'line', xref:'paper', yref:'paper', x0:0, x1:1, y0:domains.y2[0], y1:domains.y2[0], line:{color:'#e5e7eb', width:1}},
    {type:'line', xref:'paper', yref:'paper', x0:0, x1:1, y0:domains.y3[0], y1:domains.y3[0], line:{color:'#e5e7eb', width:1}},
    {type:'line', xref:'paper', yref:'paper', x0:0, x1:1, y0:domains.y4[0], y1:domains.y4[0], line:{color:'#e5e7eb', width:1}},
    {type:'line', xref:'paper', yref:'paper', x0:0, x1:1, y0:domains.y5[0], y1:domains.y5[0], line:{color:'#e5e7eb', width:1}},
  ];
  // Stoch 20/80 und RSI 30/70 Hilfslinien
  if(tog.Stoch){
    shapes.push(
      {type:'line', xref:'paper', yref:'y2', x0:0,x1:1, y0:20,y1:20, line:{color:'#9ca3af', width:1, dash:'dot'}},
      {type:'line', xref:'paper', yref:'y2', x0:0,x1:1, y0:80,y1:80, line:{color:'#9ca3af', width:1, dash:'dot'}}
    );
  }
  if(tog.RSI){
    shapes.push(
      {type:'line', xref:'paper', yref:'y3', x0:0,x1:1, y0:30,y1:30, line:{color:'#9ca3af', width:1, dash:'dot'}},
      {type:'line', xref:'paper', yref:'y3', x0:0,x1:1, y0:70,y1:70, line:{color:'#9ca3af', width:1, dash:'dot'}}
    );
  }

  const layout:any = {
    height: 920,
    margin:{l:50,r:16,t:38,b:30},
    showlegend:false,
    xaxis:{domain:[0,1], anchor:'y5', showgrid:false},
    yaxis: {domain:domains.y1, title:'Price'},
    yaxis2:{domain:domains.y2, title:'Stoch', range:[0,100]},
    yaxis3:{domain:domains.y3, title:'RSI',   range:[0,100]},
    yaxis4:{domain:domains.y4, title:'MACD'},
    yaxis5:{domain:domains.y5, title:'Trend'},
    shapes
  };

  const badge = derived.badge;

  return (
    <div style={{maxWidth: '1200px', margin:'0 auto'}}>
      <div className="bar">
        <strong>Market Vision Pro</strong>
        <label><input type="checkbox" checked={tog.EMAs}      onChange={()=>setTog({...tog,EMAs:!tog.EMAs})}/> EMAs</label>
        <label><input type="checkbox" checked={tog.Bollinger} onChange={()=>setTog({...tog,Bollinger:!tog.Bollinger})}/> Bollinger</label>
        <label><input type="checkbox" checked={tog.Stoch}     onChange={()=>setTog({...tog,Stoch:!tog.Stoch})}/> Stoch</label>
        <label><input type="checkbox" checked={tog.RSI}       onChange={()=>setTog({...tog,RSI:!tog.RSI})}/> RSI</label>
        <label><input type="checkbox" checked={tog.MACD}      onChange={()=>setTog({...tog,MACD:!tog.MACD})}/> MACD</label>
        <label><input type="checkbox" checked={tog.TrendPanel}onChange={()=>setTog({...tog,TrendPanel:!tog.TrendPanel})}/> TrendPanel</label>
        <input defaultValue={ticker} onChange={e=>setTicker(e.currentTarget.value)} style={{marginLeft:8}}/>
        <button onClick={()=>setTicker(t=>t.trim())}>Refresh</button>
      </div>

      <div className="plot-wrap" style={{position:'relative'}}>
        <div className="badge" style={{backgroundColor:badge.color}}>{badge.label}</div>
        <Plot data={allTraces as any} layout={layout as any}
              style={{width:'100%'}} config={{displaylogo:false, responsive:true}} />
      </div>

      <div className="card-divider"></div>
      {loading && <div style={{padding:'8px 12px'}}>Lade Daten…</div>}
    </div>
  );
}
