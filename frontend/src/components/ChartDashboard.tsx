import React,{useMemo,useState} from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { computeBB, ema, rsi, stoch } from "../signals/aggregate";
import type { OHLC } from "../signals/aggregate";
const Plot:any=createPlotlyComponent(Plotly);

function probeOHLC():OHLC{
  const w:any=window as any;
  const pick=(x:any)=>Array.isArray(x)?x:(x&&x.data?x.data:(x&&x.fullData?x.fullData:null));
  const cand=(a:any[])=>a.find((t:any)=>t&&((t.type==="candlestick")||(t.open&&t.high&&t.low&&t.close)));
  const pools=[w.__gd,w._gd,w.gd,w.data,w.gd_fullData,(w.appState&&w.appState.data)];
  for(const s of pools){const a=pick(s); if(Array.isArray(a)){const t=cand(a); if(t){const time=(t.x||t.time||[]).map((v:any)=>new Date(v).getTime()); return {time,open:t.open,high:t.high,low:t.low,close:t.close};}}}
  const n=220, now=Date.now(), day=86400000;
  const time:number[]=[], open:number[]=[], high:number[]=[], low:number[]=[], close:number[]=[];
  let p=200;
  for(let i=n-1;i>=0;i--) time.push(now-i*day);
  for(let i=0;i<n;i++){const step=(Math.random()-0.5)*1.5; const o=p; const c=p+step; const h=Math.max(o,c)+Math.random(); const l=Math.min(o,c)-Math.random(); open.push(+o.toFixed(2));close.push(+c.toFixed(2));high.push(+h.toFixed(2));low.push(+l.toFixed(2)); p=c;}
  return {time,open,high,low,close};
}

export default function ChartDashboard(){
  const ohlc=useMemo(()=>probeOHLC(),[]);
  const [showEMAs,setShowEMAs]=useState(true);
  const [showBB,setShowBB]=useState(true);
  const [showBBSignals,setShowBBSignals]=useState(false);

  const ema8 = useMemo(()=>ema(ohlc.close,8),[ohlc]);
  const ema20= useMemo(()=>ema(ohlc.close,20),[ohlc]);
  const ema50= useMemo(()=>ema(ohlc.close,50),[ohlc]);
  const bb   = useMemo(()=>computeBB(ohlc,20,2,1.5),[ohlc]);
  const r    = useMemo(()=>rsi(ohlc.close,14),[ohlc]);
  const st   = useMemo(()=>stoch(ohlc.high,ohlc.low,ohlc.close,14,3),[ohlc]);

  const candle={type:"candlestick",x:ohlc.time,open:ohlc.open,high:ohlc.high,low:ohlc.low,close:ohlc.close,name:"Price",yaxis:"y"};
  const traces:any[]=[candle];

  if(showEMAs){
    traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:ema8,name:"EMA 8",yaxis:"y"});
    traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:ema20,name:"EMA 20",yaxis:"y"});
    traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:ema50,name:"EMA 50",yaxis:"y"});
  }
  if(showBB){
    traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:bb.upper,name:"BB Upper",yaxis:"y"});
    traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:bb.middle,name:"BB Mid",yaxis:"y"});
    traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:bb.lower,name:"BB Lower",yaxis:"y"});
  }
  if(showBB && showBBSignals){
    traces.push({type:"scatter",mode:"markers",x:ohlc.time,y:bb.buyStrong,name:"BB Buy (strong)",marker:{symbol:"triangle-up",size:10},yaxis:"y"});
    traces.push({type:"scatter",mode:"markers",x:ohlc.time,y:bb.buyWeak,  name:"BB Buy (weak)",  marker:{symbol:"triangle-up",size:7}, yaxis:"y"});
    traces.push({type:"scatter",mode:"markers",x:ohlc.time,y:bb.sellStrong,name:"BB Sell (strong)",marker:{symbol:"triangle-down",size:10},yaxis:"y"});
    traces.push({type:"scatter",mode:"markers",x:ohlc.time,y:bb.sellWeak,  name:"BB Sell (weak)",  marker:{symbol:"triangle-down",size:7}, yaxis:"y"});
  }

  traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:st.k,name:"Stoch %K",yaxis:"y2"});
  traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:st.d,name:"Stoch %D",yaxis:"y2"});

  traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:r,name:"RSI",yaxis:"y3"});
  traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:ohlc.time.map(()=>70),name:"RSI 70",yaxis:"y3"});
  traces.push({type:"scatter",mode:"lines",x:ohlc.time,y:ohlc.time.map(()=>30),name:"RSI 30",yaxis:"y3"});

  const badge=bb.last?bb.last:{label:"BB: neutral",color:"#888",dir:"neutral"};

  const layout:any={
    margin:{l:50,r:20,t:40,b:30},
    xaxis:{domain:[0,1],type:"date",anchor:"y3"},
    yaxis :{domain:[0.5,1]},
    yaxis2:{domain:[0.25,0.45]},
    yaxis3:{domain:[0,0.2]},
    legend:{orientation:"h"}
  };

  return (
    <div style={{padding:16,fontFamily:"system-ui,-apple-system,Segoe UI,Roboto"}}>
      <h1 style={{margin:"0 0 8px"}}>Market Vision Pro</h1>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:8}}>
        <label style={{display:"inline-flex",alignItems:"center",gap:6}}><input type="checkbox" checked={showEMAs} onChange={()=>setShowEMAs(v=>!v as any)} />EMAs</label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6}}><input type="checkbox" checked={showBB} onChange={()=>setShowBB(v=>!v as any)} />Bollinger</label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6}}><input type="checkbox" checked={showBBSignals} onChange={()=>setShowBBSignals(v=>!v as any)} />BB Signals</label>
      </div>
      <div style={{position:"relative"}}>
        <div style={{position:"absolute",left:10,top:6,zIndex:10,background:(badge as any).color,color:"#fff",padding:"4px 8px",borderRadius:6,fontSize:12}}>
          {(badge as any).label}
        </div>
        <Plot data={traces} layout={layout} style={{width:"100%",height:720}} />
      </div>
    </div>
  );
}
