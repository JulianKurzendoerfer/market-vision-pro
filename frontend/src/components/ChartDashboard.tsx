import React, {useEffect,useMemo,useState} from "react";
import Plot from "react-plotly.js";
import "./panels.css";

type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]};

function ema(arr:number[], p:number){const k=2/(p+1);let out:number[]=new Array(arr.length).fill(NaN);let e=arr.find(v=>Number.isFinite(v))??0;let started=false;for(let i=0;i<arr.length;i++){const v=arr[i];if(!Number.isFinite(v))continue;if(!started){let ok=true;for(let j=i-p+1;j<=i;j++){if(j<0||!Number.isFinite(arr[j]))ok=false}if(!ok)continue;e=arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p;started=true} else {e=e+k*(v-e)};out[i]=e}return out}
function sma(arr:number[], p:number){let out=new Array(arr.length).fill(NaN);let s=0,c=0;for(let i=0;i<arr.length;i++){const v=arr[i];if(Number.isFinite(v)){s+=v;c++}if(i>=p){const vprev=arr[i-p];if(Number.isFinite(vprev)){s-=vprev;c--}}if(i>=p-1)out[i]=s/p}return out}
function stdev(arr:number[], p:number){let out=new Array(arr.length).fill(NaN);for(let i=0;i<arr.length;i++){if(i<p-1)continue;const w=arr.slice(i-p+1,i+1);if(w.some(x=>!Number.isFinite(x)))continue;const m=w.reduce((a,b)=>a+b,0)/p;const v=w.reduce((a,b)=>a+(b-m)*(b-m),0)/p;out[i]=Math.sqrt(v)}return out}
function bb(close:number[], p:number,k:number){const mid=sma(close,p);const sd=stdev(close,p);const up=mid.map((m,i)=>Number.isFinite(m)&&Number.isFinite(sd[i])?m+k*sd[i]:NaN);const lo=mid.map((m,i)=>Number.isFinite(m)&&Number.isFinite(sd[i])?m-k*sd[i]:NaN);return {up,mid,lo}}
function rsi(close:number[], p:number){let out=new Array(close.length).fill(NaN);let gain=0,loss=0,avgG=0,avgL=0;for(let i=1;i<close.length;i++){const ch=close[i]-close[i-1];const g=Math.max(ch,0),l=Math.max(-ch,0);if(i<=p){gain+=g;loss+=l;if(i===p){avgG=gain/p;avgL=loss/p;const rs=avgL===0?100:avgG/avgL;out[i]=100-(100/(1+rs))}}else{avgG=(avgG*(p-1)+g)/p;avgL=(avgL*(p-1)+l)/p;const rs=avgL===0?100:avgG/avgL;out[i]=100-(100/(1+rs))}}return out}
function stoch(high:number[],low:number[],close:number[],kPer:number,dPer:number){let k=new Array(close.length).fill(NaN);for(let i=0;i<close.length;i++){if(i<kPer-1)continue;let hh=-Infinity,ll=Infinity;for(let j=i-kPer+1;j<=i;j++){hh=Math.max(hh,high[j]);ll=Math.min(ll,low[j])}k[i]=(close[i]-ll)/(hh-ll)*100}const d=sma(k,dPer);return {k,d}}
function macd(close:number[],f:number,s:number,sg:number){const ef=ema(close,f),es=ema(close,s);const m=ef.map((v,i)=>Number.isFinite(v)&&Number.isFinite(es[i])?v-es[i]:NaN);const sig=ema(m,sg);const hist=m.map((v,i)=>Number.isFinite(v)&&Number.isFinite(sig[i])?v-sig[i]:NaN);return {m,sig,hist}}
function pivots(high:number[],low:number[],win:number){let hiI:number[]=[],hiP:number[]=[],loI:number[]=[],loP:number[]=[];for(let i=win;i<high.length-win;i++){let isHi=true,isLo=true;for(let j=i-win;j<=i+win;j++){if(high[j]>high[i])isHi=false;if(low[j]<low[i])isLo=false}if(isHi){hiI.push(i);hiP.push(high[i])}if(isLo){loI.push(i);loP.push(low[i])}}return {hiI,hiP,loI,loP}}
function nearBadge(c:number[],up:number[],lo:number[]){let label="BB: neutral",bg="#374151";if(c.length&&up.length&&lo.length){const i=c.length-1;const v=c[i],u=up[i],l=lo[i];if(Number.isFinite(v)&&Number.isFinite(u)&&Number.isFinite(l)){const tol=(u-l)*0.05; if(v>=u) {label="BB: strong sell";bg="#b91c1c"} else if(u-v<=tol){label="BB: weak sell";bg="#f59e0b"} else if(v<=l){label="BB: strong buy";bg="#15803d"} else if(v-l<=tol){label="BB: weak buy";bg="#10b981"} } } return {label,bg}}

async function fetchOHLC(ticker:string):Promise<OHLC>{
  try{
    const res=await fetch(`/api/ohlc?ticker=${encodeURIComponent(ticker)}`,{cache:"no-store"});
    if(res.ok){const j=await res.json();if(j&&j.time&&j.close)return j}
  }catch{}
  const n=260, day=24*3600*1000; const end=Date.now(); let time:number[]=[],open:number[]=[],high:number[]=[],low:number[]=[],close:number[]=[];
  let p=200;
  for(let i=n-1;i>=0;i--){const t=end-i*day; const drift=(Math.sin(i/22)*0.6)+Math.random()*0.5-0.2; const c=Math.max(50,p+drift); const o=p; const h=Math.max(c,o)+Math.random()*1.2; const l=Math.min(c,o)-Math.random()*1.2; time.push(t); open.push(o); high.push(h); low.push(l); close.push(c); p=c}
  return {time,open,high,low,close};
}

export default function ChartDashboard(){
  const [ticker,setTicker]=useState("AAPL");
  const [data,setData]=useState<OHLC|null>(null);
  const [tog,setTog]=useState({EMAs:true,Bollinger:true,RSI:true,Stoch:true,MACD:true,TrendPanel:true,BB:true});
  useEffect(()=>{let alive=true;(async()=>{const d=await fetchOHLC(ticker); if(alive) setData(d)})(); return ()=>{alive=false}},[ticker]);
  const derived=useMemo(()=>{if(!data)return null;const {time,open,high,low,close}=data;const e20=ema(close,20),e50=ema(close,50),e200=ema(close,200);const bbv=bb(close,20,2);const r=rsi(close,14);const st=stoch(high,low,close,14,3);const m=macd(close,12,26,9);const piv=pivots(high,low,10);const badge=nearBadge(close,bbv.up,bbv.lo);return {time,open,high,low,close,e20,e50,e200,bb:bbv,rsi:r,stoch:st,macd:m,piv, badge}},[data]);
  if(!derived) return <div className="wrap"><div className="toolbar"><strong>Market Vision Pro</strong></div><div className="card">Loading…</div></div>;
  const {time,open,high,low,close,e20,e50,e200,bb,rsi,stoch,macd,piv,badge}=derived;

  const priceTraces:any[]=[];
  priceTraces.push({type:"candlestick",x:time,open,high,low,close,name:"Price",increasing:{line:{color:"#16a34a"}},decreasing:{line:{color:"#dc2626"}},hoverinfo:"x+open+high+low+close"});
  if(tog.EMAs){priceTraces.push({type:"scatter",mode:"lines",x:time,y:e20,name:"EMA20",line:{width:1.5,color:"#f97316"}});
                priceTraces.push({type:"scatter",mode:"lines",x:time,y:e50,name:"EMA50",line:{width:1.5,color:"#0ea5e9"}});
                priceTraces.push({type:"scatter",mode:"lines",x:time,y:e200,name:"EMA200",line:{width:1.5,color:"#ef4444"}})}
  if(tog.Bollinger){priceTraces.push({type:"scatter",mode:"lines",x:time,y:bb.up,name:"BB up",line:{width:1,color:"#8b5cf6"}});
                    priceTraces.push({type:"scatter",mode:"lines",x:time,y:bb.mid,name:"BB mid",line:{width:1,color:"#a1a1aa",dash:"dot"}});
                    priceTraces.push({type:"scatter",mode:"lines",x:time,y:bb.lo,name:"BB low",line:{width:1,color:"#8b5cf6"}})}
  if(tog.BB){
    const strongBuyX:number[]=[],strongBuyY:number[]=[],weakBuyX:number[]=[],weakBuyY:number[]=[],strongSellX:number[]=[],strongSellY:number[]=[],weakSellX:number[]=[],weakSellY:number[]=[];
    for(let i=0;i<close.length;i++){const c=close[i],u=bb.up[i],l=bb.lo[i];if(!Number.isFinite(c)||!Number.isFinite(u)||!Number.isFinite(l))continue;const tol=(u-l)*0.05;
      if(c>=u){strongSellX.push(time[i]);strongSellY.push(c)}
      else if(u-c<=tol){weakSellX.push(time[i]);weakSellY.push(c)}
      else if(c<=l){strongBuyX.push(time[i]);strongBuyY.push(c)}
      else if(c-l<=tol){weakBuyX.push(time[i]);weakBuyY.push(c)}
    }
    priceTraces.push({type:"scatter",mode:"markers",x:strongBuyX,y:strongBuyY,name:"BB Buy (strong)",marker:{symbol:"triangle-up",size:8,color:"#15803d",opacity:.9}});
    priceTraces.push({type:"scatter",mode:"markers",x:weakBuyX,y:weakBuyY,name:"BB Buy (weak)",marker:{symbol:"triangle-up",size:7,color:"#10b981",opacity:.8}});
    priceTraces.push({type:"scatter",mode:"markers",x:strongSellX,y:strongSellY,name:"BB Sell (strong)",marker:{symbol:"triangle-down",size:8,color:"#b91c1c",opacity:.9}});
    priceTraces.push({type:"scatter",mode:"markers",x:weakSellX,y:weakSellY,name:"BB Sell (weak)",marker:{symbol:"triangle-down",size:7,color:"#f59e0b",opacity:.85}});
  }

  const stochTraces:any[]=[];
  if(tog.Stoch){stochTraces.push({type:"scatter",mode:"lines",x:time,y:stoch.k,name:"%K",line:{width:1.5,color:"#0ea5e9"}});stochTraces.push({type:"scatter",mode:"lines",x:time,y:stoch.d,name:"%D",line:{width:1.5,color:"#f97316"}})}

  const rsiTraces:any[]=[];
  if(tog.RSI){rsiTraces.push({type:"scatter",mode:"lines",x:time,y:rsi,name:"RSI",line:{width:1.8,color:"#64748b"}})}

  const macdTraces:any[]=[];
  if(tog.MACD){macdTraces.push({type:"bar",x:time,y:macd.hist,name:"Hist",marker:{color:"#cbd5e1"}});
               macdTraces.push({type:"scatter",mode:"lines",x:time,y:macd.m,name:"MACD",line:{width:1.6,color:"#06b6d4"}});
               macdTraces.push({type:"scatter",mode:"lines",x:time,y:macd.sig,name:"Signal",line:{width:1.6,color:"#a78bfa"}})}

  const trendTraces:any[]=[];
  if(tog.TrendPanel){
    trendTraces.push({type:"scatter",mode:"lines",x:time,y:close,name:"Close",line:{width:1,color:"#111827"}});
    const lines=new Set<number>();
    const last=close.slice(-200);
    const step=(Math.max(...last)-Math.min(...last))/12||1;
    [...piv.hiP,...piv.loP].forEach(p=>{if(Number.isFinite(p))lines.add(Math.round(p/step)*step)});
    for(const y of Array.from(lines).sort((a,b)=>a-b)){
      trendTraces.push({type:"scatter",mode:"lines",x:[time[0],time[time.length-1]],y:[y,y],name:"level",line:{width:1,color:"#9ca3af"},hoverinfo:"skip",showlegend:false});
    }
  }

  return (
    <div className="wrap">
      <div className="toolbar">
        <strong>Market Vision Pro</strong>
        <label><input type="checkbox" checked={tog.EMAs} onChange={e=>setTog({...tog,EMAs:e.target.checked})}/> EMAs</label>
        <label><input type="checkbox" checked={tog.Bollinger} onChange={e=>setTog({...tog,Bollinger:e.target.checked})}/> Bollinger</label>
        <label><input type="checkbox" checked={tog.RSI} onChange={e=>setTog({...tog,RSI:e.target.checked})}/> RSI</label>
        <label><input type="checkbox" checked={tog.Stoch} onChange={e=>setTog({...tog,Stoch:e.target.checked})}/> Stoch</label>
        <label><input type="checkbox" checked={tog.MACD} onChange={e=>setTog({...tog,MACD:e.target.checked})}/> MACD</label>
        <label><input type="checkbox" checked={tog.TrendPanel} onChange={e=>setTog({...tog,TrendPanel:e.target.checked})}/> TrendPanel</label>
        <label><input type="checkbox" checked={tog.BB} onChange={e=>setTog({...tog,BB:e.target.checked})}/> BB Signals</label>
        <input value={ticker} onChange={e=>setTicker(e.target.value)} style={{height:28,padding:"0 8px"}} />
        <button onClick={()=>setTicker(ticker)} style={{padding:"6px 10px"}}>Refresh</button>
      </div>

      <div className="grid">
        <div className="card" style={{position:"relative"}}>
          <div className="badge" style={{backgroundColor:badge.bg}}>{badge.label}</div>
          <Plot
            data={priceTraces as any}
            layout={{
              height:420,margin:{l:50,r:16,t:26,b:24},
              showlegend:false,
              xaxis:{type:"date",rangeslider:{visible:false}},
              yaxis:{title:"Price"}
            } as any}
            useResizeHandler
            style={{width:"100%"}}
            config={{displaylogo:false,responsive:true}}
          />
        </div>

        <div className="card">
          <Plot
            data={stochTraces as any}
            layout={{height:160,margin:{l:50,r:16,t:10,b:24},showlegend:false,xaxis:{type:"date"},yaxis:{title:"Stoch",range:[0,100],dtick:20,zeroline:false,shapes:[{type:"line",x0:time[0],x1:time[time.length-1],y0:80,y1:80,line:{width:1,color:"#9ca3af"}},{type:"line",x0:time[0],x1:time[time.length-1],y0:20,y1:20,line:{width:1,color:"#9ca3af"}}]}} as any}
            useResizeHandler
            style={{width:"100%"}}
            config={{displaylogo:false,responsive:true}}
          />
        </div>

        <div className="card">
          <Plot
            data={rsiTraces as any}
            layout={{height:160,margin:{l:50,r:16,t:10,b:24},showlegend:false,xaxis:{type:"date"},yaxis:{title:"RSI",range:[0,100],dtick:20,zeroline:false,shapes:[{type:"line",x0:time[0],x1:time[time.length-1],y0:70,y1:70,line:{width:1,color:"#9ca3af"}},{type:"line",x0:time[0],x1:time[time.length-1],y0:30,y1:30,line:{width:1,color:"#9ca3af"}}]}} as any}
            useResizeHandler
            style={{width:"100%"}}
            config={{displaylogo:false,responsive:true}}
          />
        </div>

        <div className="card">
          <Plot
            data={macdTraces as any}
            layout={{height:180,margin:{l:50,r:16,t:10,b:24},showlegend:false,xaxis:{type:"date"},yaxis:{title:"MACD"}} as any}
            useResizeHandler
            style={{width:"100%"}}
            config={{displaylogo:false,responsive:true}}
          />
        </div>

        <div className="card">
          <Plot
            data={trendTraces as any}
            layout={{height:200,margin:{l:50,r:16,t:10,b:24},showlegend:false,xaxis:{type:"date"},yaxis:{title:"Trend"}} as any}
            useResizeHandler
            style={{width:"100%"}}
            config={{displaylogo:false,responsive:true}}
          />
        </div>
      </div>
    </div>
  )
}
