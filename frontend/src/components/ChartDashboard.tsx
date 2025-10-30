import React,{useEffect,useMemo,useState} from 'react'
import PlotFactory from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import {fetchOHLC} from '../lib/data'
import {ema,bb,rsi,stochKDL,macd,pivots} from '../lib/indicators'
const Plot=PlotFactory(Plotly as any)
type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]}

export default function ChartDashboard(){
  const [showEMA,setShowEMA]=useState(true)
  const [showBB,setShowBB]=useState(true)
  const [showMACD,setShowMACD]=useState(true)
  const [showRSI,setShowRSI]=useState(true)
  const [showSTO,setShowSTO]=useState(true)
  const [showTrend,setShowTrend]=useState(true)
  const [ticker,setTicker]=useState<string>(new URLSearchParams(location.search).get('t')||'AAPL')
  const [ohlc,setOHLC]=useState<OHLC|null>(null)
  const [loading,setLoading]=useState(false)

  async function load(t:string){setLoading(true);try{const o=await fetchOHLC(t);setOHLC(o)}catch(e){setOHLC(null)}setLoading(false)}
  useEffect(()=>{load(ticker)},[])

  const studies=useMemo(()=>{
    if(!ohlc) return null
    const {time,high,low,close}=ohlc
    const e20=ema(close,20),e50=ema(close,50),e200=ema(close,200)
    const bands=bb(close,20,2)
    const r=rsi(close,14)
    const st=stochKDL(high,low,close,14,3)
    const M=macd(close,12,26,9)
    const piv=pivots(ohlc,10,0.01)
    return {time,e20,e50,e200,bands,r,st,M,piv,high,low,close}
  },[JSON.stringify(ohlc)])

  useEffect(()=>{
    const root=document.getElementById('root-plot') as any
    if(!root) return
    const traces:any[]=[]
    const layout:any={grid:{rows:4,columns:1,pattern:'independent',roworder:'top to bottom'},margin:{l:40,r:10,t:10,b:20},showlegend:false}

    if(ohlc){
      const t=ohlc.time.map(x=>new Date(x))
      traces.push({x:t,open:ohlc.open,high:ohlc.high,low:ohlc.low,close:ohlc.close,type:'candlestick',yaxis:'y',name:'Price',increasing:{line:{width:1}},decreasing:{line:{width:1}}})
      layout.yaxis={domain:[0.55,1]}
    }

    if(studies){
      const {time,e20,e50,e200,bands}=studies
      const xt=time.map(x=>new Date(x))
      if(showEMA){traces.push({x:xt,y:e20,type:'scatter',mode:'lines',line:{width:1},name:'EMA20',yaxis:'y'});traces.push({x:xt,y:e50,type:'scatter',mode:'lines',line:{width:1},name:'EMA50',yaxis:'y'});traces.push({x:xt,y:e200,type:'scatter',mode:'lines',line:{width:1},name:'EMA200',yaxis:'y'})}
      if(showBB){traces.push({x:xt,y:bands.up,type:'scatter',mode:'lines',line:{width:1},name:'BB up',yaxis:'y'});traces.push({x:xt,y:bands.lo,type:'scatter',mode:'lines',line:{width:1},name:'BB lo',yaxis:'y'})}
      if(showRSI&&studies.r){traces.push({x:xt,y:studies.r,type:'scatter',mode:'lines',line:{width:1},name:'RSI',yaxis:'y2'});layout.yaxis2={domain:[0.4,0.54],range:[0,100]}}
      if(showSTO&&studies.st){traces.push({x:xt,y:studies.st.k,type:'scatter',mode:'lines',line:{width:1},name:'%K',yaxis:'y3'});traces.push({x:xt,y:studies.st.d,type:'scatter',mode:'lines',line:{width:1},name:'%D',yaxis:'y3'});layout.yaxis3={domain:[0.25,0.39],range:[0,100]}}
      if(showMACD&&studies.M){traces.push({x:xt,y:studies.M.h,type:'bar',name:'MACD hist',yaxis:'y4'});traces.push({x:xt,y:studies.M.m,type:'scatter',mode:'lines',line:{width:1},name:'MACD',yaxis:'y4'});traces.push({x:xt,y:studies.M.sig,type:'scatter',mode:'lines',line:{width:1},name:'Signal',yaxis:'y4'});layout.yaxis4={domain:[0.05,0.24]}}
      if(showTrend){for(const h of studies.piv.highs){traces.push({x:[xt[h.i]],y:[h.p],yaxis:'y',type:'scatter',mode:'markers',marker:{symbol:'triangle-down',size:7},name:'H'})}for(const l of studies.piv.lows){traces.push({x:[xt[l.i]],y:[l.p],yaxis:'y',type:'scatter',mode:'markers',marker:{symbol:'triangle-up',size:7},name:'L'})}for(const lv of studies.piv.levels){traces.push({x:[xt[0],xt[xt.length-1]],y:[lv.level,lv.level],type:'scatter',mode:'lines',line:{width:1},name:'Level',yaxis:'y'})}}
    }

    Plotly.react(root,traces,layout,{responsive:true})
  },[showEMA,showBB,showMACD,showRSI,showSTO,showTrend,JSON.stringify(studies)])

  return (
    <div style={{padding:'12px'}}>
      <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:8}}>
        <div style={{fontWeight:700}}>Market Vision Pro</div>
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showEMA} onChange={e=>setShowEMA(e.target.checked)}/>EMAs</label>
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showBB} onChange={e=>setShowBB(e.target.checked)}/>Bollinger</label>
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showRSI} onChange={e=>setShowRSI(e.target.checked)}/>RSI</label>
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showSTO} onChange={e=>setShowSTO(e.target.checked)}/>Stoch</label>
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showMACD} onChange={e=>setShowMACD(e.target.checked)}/>MACD</label>
        <label style={{display:'inline-flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showTrend} onChange={e=>setShowTrend(e.target.checked)}/>TrendPanel</label>
        <div style={{marginLeft:'auto',display:'inline-flex',gap:6}}>
          <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} placeholder="Ticker" style={{padding:'4px 8px',width:90}}/>
          <button onClick={()=>{const u=new URL(location.href);u.searchParams.set('t',ticker);history.replaceState(null,'',u.toString());load(ticker)}} disabled={loading}>{loading?'...':'Refresh'}</button>
        </div>
      </div>
      <div id="root-plot" style={{height:'72vh'}} />
    </div>
  )
}
