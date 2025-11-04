import React,{useEffect,useMemo,useState} from "react";
import Plot from "react-plotly.js";

type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[];volume?:number[]};

function ema(arr:number[], len:number){const k=2/(len+1);let out:number[]=[];let prev=arr[0];for(let i=0;i<arr.length;i++){const v=i===0?arr[0]:(arr[i]*k+prev*(1-k));out.push(v);prev=v}return out}
function sma(arr:number[], len:number){let out:number[]=[];let s=0;for(let i=0;i<arr.length;i++){s+=arr[i];if(i>=len)s-=arr[i-len];out.push(i>=len-1?s/len:arr[i])}return out}
function bb(close:number[], len=20, mult=2){const basis=sma(close,len);let upper:number[]=[],lower:number[]=[];for(let i=0;i<close.length;i++){let n=Math.min(i+1,len);let mean=basis[i];let v=0;for(let j=i-n+1;j<=i;j++){const d=(close[j]-mean);v+=d*d}const st=Math.sqrt(v/Math.max(1,n));upper.push(mean+mult*st);lower.push(mean-mult*st)}return {basis,upper,lower}}
function rsi(close:number[], len=14){let rs:number[]=[];let g=0,l=0;for(let i=1;i<close.length;i++){const ch=close[i]-close[i-1];const up=Math.max(ch,0),dn=Math.max(-ch,0);g=(g*(len-1)+up)/len;l=(l*(len-1)+dn)/len;const v=l===0?100:100-100/(1+g/l);rs.push(v)}return [NaN,...rs]}
function stoch(high:number[],low:number[],close:number[],len=14){let k:number[]=[];for(let i=0;i<close.length;i++){const s=Math.max(0,i-len+1);let hh=-Infinity,ll=Infinity;for(let j=s;j<=i;j++){if(high[j]>hh)hh=high[j];if(low[j]<ll)ll=low[j]}k.push(((close[i]-ll)/(hh-ll||1))*100)}const d=sma(k,3);return {k,d}}
function macd(close:number[], fast=12, slow=26, sig=9){const fastE=ema(close,fast), slowE=ema(close,slow);let m:number[]=[];for(let i=0;i<close.length;i++)m.push(fastE[i]-slowE[i]);const s=ema(m,sig);let h:number[]=[];for(let i=0;i<m.length;i++)h.push(m[i]-s[i]);return {macd:m,signal:s,hist:h}}

async function fetchOHLC(ticker:string, interval="1d", range="1y"):Promise<OHLC>{
  const qs=new URLSearchParams({ticker,interval,range}).toString();
  try{
    const r=await fetch(`/api/ohlc?${qs}`,{cache:"no-store"});
    if(!r.ok) throw new Error(String(r.status));
    const j=await r.json();
    const t=j.time||j.t||[];
    return {time:t.map((x:any)=>typeof x==="number"?x:Date.parse(x)),open:j.open,high:j.high,low:j.low,close:j.close,volume:j.volume};
  }catch{
    return {time:[],open:[],high:[],low:[],close:[],volume:[]};
  }
}

export default function ChartDashboard(){
  const [ticker,setTicker]=useState("AAPL");
  const [data,setData]=useState<OHLC>({time:[],open:[],high:[],low:[],close:[],volume:[]});
  const [tog,setTog]=useState({EMAs:true,Bollinger:true,Stoch:true,RSI:true,MACD:true,TrendPanel:true});
  const [loading,setLoading]=useState(false);

  useEffect(()=>{let ab=false;(async()=>{setLoading(true);const d=await fetchOHLC(ticker);if(!ab)setData(d);setLoading(false)})();return()=>{ab=true}},[ticker]);

  const calc=useMemo(()=>{
    const {time,open,high,low,close}=data;
    if(!time.length) return null;
    const e9=ema(close,9), e21=ema(close,21), e50=ema(close,50), e200=ema(close,200);
    const b=bb(close,20,2);
    const r=rsi(close,14);
    const st=stoch(high,low,close,14);
    const m=macd(close,12,26,9);
    const pivHi:number[]=[],pivLo:number[]=[];
    for(let i=2;i<close.length-2;i++){
      const isH=high[i]>high[i-1]&&high[i]>high[i-2]&&high[i]>high[i+1]&&high[i]>high[i+2];
      const isL=low[i]<low[i-1]&&low[i]<low[i-2]&&low[i]<low[i+1]&&low[i]<low[i+2];
      pivHi.push(isH?close[i]:NaN);pivLo.push(isL?close[i]:NaN);
    }
    pivHi.unshift(NaN,NaN);pivLo.unshift(NaN,NaN);pivHi.push(NaN,NaN);pivLo.push(NaN,NaN);
    return {time,open,high,low,close,e9,e21,e50,e200,b,r,st,m,pivHi,pivLo};
  },[data]);

  if(loading && !calc) return <div style={{padding:16}}>Lade Daten…</div>;

  const baseLayout=(h:number)=>({
    height:h,
    margin:{l:50,r:16,t:10,b:30},
    showlegend:false,
    xaxis:{type:"date",tickformat:"%Y-%m-%d"},
    paper_bgcolor:"rgba(0,0,0,0)",
    plot_bgcolor:"rgba(0,0,0,0)",
    font:{size:12}
  } as Partial<Plotly.Layout>);

  const priceTraces=calc?[
    {type:"candlestick",x:calc.time,open:calc.open,high:calc.high,low:calc.low,close:calc.close,name:"Price"},
    ...(tog.Bollinger?[{type:"scatter",mode:"lines",x:calc.time,y:calc.b.upper,name:"BB upper",line:{dash:"dot"}},
                      {type:"scatter",mode:"lines",x:calc.time,y:calc.b.basis,name:"BB basis",line:{dash:"dot"}},
                      {type:"scatter",mode:"lines",x:calc.time,y:calc.b.lower,name:"BB lower",line:{dash:"dot"}}]:[]),
    ...(tog.EMAs?[{type:"scatter",mode:"lines",x:calc.time,y:calc.e9,name:"EMA9"},
                 {type:"scatter",mode:"lines",x:calc.time,y:calc.e21,name:"EMA21"},
                 {type:"scatter",mode:"lines",x:calc.time,y:calc.e50,name:"EMA50"},
                 {type:"scatter",mode:"lines",x:calc.time,y:calc.e200,name:"EMA200"}]:[])
  ]:[];

  const stochTraces=calc&&tog.Stoch?[{type:"scatter",mode:"lines",x:calc.time,y:calc.st.k,name:"%K"},
                                     {type:"scatter",mode:"lines",x:calc.time,y:calc.st.d,name:"%D"}]:[];

  const rsiTraces=calc&&tog.RSI?[{type:"scatter",mode:"lines",x:calc.time,y:calc.r,name:"RSI"}]:[];

  const macdTraces=calc&&tog.MACD?[{type:"bar",x:calc.time,y:calc.m.hist,name:"MACD hist"},
                                   {type:"scatter",mode:"lines",x:calc.time,y:calc.m.macd,name:"MACD"},
                                   {type:"scatter",mode:"lines",x:calc.time,y:calc.m.signal,name:"Signal"}]:[];

  const trendTraces=calc&&tog.TrendPanel?[{type:"scatter",mode:"lines",x:calc.time,y:calc.close,name:"Close"},
                                         {type:"scatter",mode:"markers",x:calc.time,y:calc.pivHi,name:"Pivot H"},
                                         {type:"scatter",mode:"markers",x:calc.time,y:calc.pivLo,name:"Pivot L"}]:[];

  return (
    <div style={{maxWidth:"1200px",margin:"0 auto"}}>
      <div style={{display:"flex",gap:12,alignItems:"center",padding:"8px 0"}}>
        <strong>Market Vision Pro</strong>
        <label><input type="checkbox" checked={tog.EMAs} onChange={e=>setTog({...tog,EMAs:e.target.checked})}/> EMAs</label>
        <label><input type="checkbox" checked={tog.Bollinger} onChange={e=>setTog({...tog,Bollinger:e.target.checked})}/> Bollinger</label>
        <label><input type="checkbox" checked={tog.Stoch} onChange={e=>setTog({...tog,Stoch:e.target.checked})}/> Stoch</label>
        <label><input type="checkbox" checked={tog.RSI} onChange={e=>setTog({...tog,RSI:e.target.checked})}/> RSI</label>
        <label><input type="checkbox" checked={tog.MACD} onChange={e=>setTog({...tog,MACD:e.target.checked})}/> MACD</label>
        <label><input type="checkbox" checked={tog.TrendPanel} onChange={e=>setTog({...tog,TrendPanel:e.target.checked})}/> TrendPanel</label>
        <input defaultValue={ticker} onChange={e=>setTicker(e.target.value.trim().toUpperCase())} style={{marginLeft:"auto"}}/>
      </div>

      <div style={{position:"relative"}}>
        <Plot data={priceTraces as any} layout={baseLayout(380)} style={{width:"100%"}} config={{displaylogo:false,responsive:true}}/>
      </div>

      <div style={{height:8,background:"#f1f1f1",borderRadius:6,margin:"8px 0"}}/>

      <Plot data={stochTraces as any} layout={{...baseLayout(160),yaxis:{range:[0,100]}}} style={{width:"100%"}} config={{displaylogo:false,responsive:true}}/>
      <div style={{height:8,background:"#f1f1f1",borderRadius:6,margin:"8px 0"}}/>

      <Plot data={rsiTraces as any} layout={{...baseLayout(160),yaxis:{range:[0,100]}}} style={{width:"100%"}} config={{displaylogo:false,responsive:true}}/>
      <div style={{height:8,background:"#f1f1f1",borderRadius:6,margin:"8px 0"}}/>

      <Plot data={macdTraces as any} layout={{...baseLayout(180)}} style={{width:"100%"}} config={{displaylogo:false,responsive:true}}/>
      <div style={{height:8,background:"#f1f1f1",borderRadius:6,margin:"8px 0"}}/>

      <Plot data={trendTraces as any} layout={baseLayout(180)} style={{width:"100%"}} config={{displaylogo:false,responsive:true}}/>
      {loading && <div style={{position:"absolute",right:8,top:8,background:"#222",color:"#fff",padding:"2px 6px",borderRadius:4,fontSize:12}}>lädt…</div>}
    </div>
  );
}
