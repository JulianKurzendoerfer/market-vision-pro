import React from "react";
import { fetchOHLCStable } from "../lib/ohlc";
 open:number[]; high:number[]; low:number[]; close:number[] }

  }
  const n=260, day=24*3600*1000, end=Date.now()
  const time = Array.from({length:n},(_,i)=> end-(n-i)*day)
  let price=100, close:number[]=[], open:number[]=[], high:number[]=[], low:number[]=[]
  for(let i=0;i<n;i++){
    const drift=(Math.random()-0.5)*0.5
    const ch = (Math.random()-0.5)*2
    const o=price
    price=Math.max(10, price+drift+ch)
    const c=price
    const h=Math.max(o,c)+Math.random()*1.5
    const l=Math.min(o,c)-Math.random()*1.5
    open.push(o); close.push(c); high.push(h); low.push(l)
  }
  return {time,open,high,low,close}
}

export default function ChartDashboard(){
  const [ticker, setTicker] = useState('AAPL')
  const [data, setData] = useState<OHLC|null>(null)
  const [tog, setTog] = useState({EMAs:true, Bollinger:true, Stoch:true, RSI:true, MACD:true, TrendPanel:true})
  
useEffect(()=>{
  let alive=true;
  setLoading(true);
  fetchOHLCStable(ticker, interval, range)
    .then(({data})=>{ if(!alive) return; setData(data); })
    .catch((e)=>{ if(!alive) return; setError(String(e)); })
    .finally(()=>{ if(!alive) return; setLoading(false); });
  return ()=>{ alive=false; };
},[ticker,interval,range]);

  if (tog.TrendPanel){
    for(const lvl of levels){
      trendTraces.push({x:[time[0], time[time.length-1]], y:[lvl,lvl], type:'scatter', mode:'lines', name:'', line:{width:1}, hoverinfo:'none', showlegend:false})
    }
    const phx:number[]=[], phy:number[]=[], plx:number[]=[], ply:number[]=[]
    for(let i=0;i<pv.pivotHighIdx.length;i++){
      const ih = pv.pivotHighIdx[i]; if (isFinite(ih)){ const j = Number(ih); phx.push(time[j]); phy.push(high[j]) }
      const il = pv.pivotLowIdx[i]; if (isFinite(il)){ const j2 = Number(il); plx.push(time[j2]); ply.push(low[j2]) }
    }
    trendTraces.push({x:phx, y:phy, type:'scatter', mode:'markers', name:'Pivot H', marker:{symbol:'triangle-up', size:8, opacity:0.7}})
    trendTraces.push({x:plx, y:ply, type:'scatter', mode:'markers', name:'Pivot L', marker:{symbol:'triangle-down', size:8, opacity:0.7}})
  }

  const priceLayout:any = {height:360, margin:{l:50,r:16,t:10,b:24}, showlegend:false}
  const stochLayout:any = {height:140, margin:{l:50,r:16,t:10,b:24}, yaxis:{range:[0,100]}}
  const rsiLayout:any   = {height:140, margin:{l:50,r:16,t:10,b:24}, yaxis:{range:[0,100]}}
  const macdLayout:any  = {height:160, margin:{l:50,r:16,t:10,b:24}}
  const trendLayout:any = {height:180, margin:{l:50,r:16,t:10,b:24}}

  return (
    <div className="wrap">
      <div className="bar">
        <strong>Market Vision Pro</strong>
        <label><input type="checkbox" checked={tog.EMAs} onChange={e=>setTog({...tog,EMAs:e.target.checked})}/> EMAs</label>
        <label><input type="checkbox" checked={tog.Bollinger} onChange={e=>setTog({...tog,Bollinger:e.target.checked})}/> Bollinger</label>
        <label><input type="checkbox" checked={tog.Stoch} onChange={e=>setTog({...tog,Stoch:e.target.checked})}/> Stoch</label>
        <label><input type="checkbox" checked={tog.RSI} onChange={e=>setTog({...tog,RSI:e.target.checked})}/> RSI</label>
        <label><input type="checkbox" checked={tog.MACD} onChange={e=>setTog({...tog,MACD:e.target.checked})}/> MACD</label>
        <label><input type="checkbox" checked={tog.TrendPanel} onChange={e=>setTog({...tog,TrendPanel:e.target.checked})}/> TrendPanel</label>
        <input defaultValue={ticker} onChange={e=>setTicker(e.target.value.trim().toUpperCase())} style={{marginLeft:8}}/>
        <button onClick={()=>setTicker(t=>t)} style={{padding:'4px 8px'}}>Refresh</button>
      </div>
      <div className="card plot"><div className="bb-badge" style={{backgroundColor:d.bbSig.color}}>{d.bbSig.label}</div><Plot data={priceTraces as any} layout={priceLayout} style={{width:'100%'}} config={{displaylogo:false,responsive:true}}/></div>
      <div className="card plot"><Plot data={stochTraces as any} layout={stochLayout} style={{width:'100%'}} config={{displaylogo:false,responsive:true}}/></div>
      <div className="card plot"><Plot data={rsiTraces   as any} layout={rsiLayout}   style={{width:'100%'}} config={{displaylogo:false,responsive:true}}/></div>
      <div className="card plot"><Plot data={macdTraces  as any} layout={macdLayout}  style={{width:'100%'}} config={{displaylogo:false,responsive:true}}/></div>
      <div className="card plot"><Plot data={trendTraces as any} layout={trendLayout} style={{width:'100%'}} config={{displaylogo:false,responsive:true}}/></div>
    </div>
  )
}

function quantLevels(arr:number[], n=8){
  const v = arr.filter(x=>isFinite(x)).slice().sort((a,b)=>a-b)
  if (!v.length) return []
  const out:number[]=[]
  for(let i=1;i<=n;i++){ const q = v[Math.floor(i*v.length/(n+1))]; out.push(q) }
  return out
}
