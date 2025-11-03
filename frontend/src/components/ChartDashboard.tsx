import React,{useEffect,useMemo,useState} from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { OHLC, bollinger, ema, macd, rsi, stoch, extrema, clusterLevels } from '../lib/indicators'
import { bbSignal } from '../signals'
const Plot=createPlotlyComponent(Plotly)
type Tog={EMAs:boolean;Bollinger:boolean;RSI:boolean;Stoch:boolean;MACD:boolean;TrendPanel:boolean;BBSig:boolean}
export default function ChartDashboard(){
  const [tog,setTog]=useState<Tog>({EMAs:true,Bollinger:true,RSI:true,Stoch:true,MACD:true,TrendPanel:true,BBSig:true})
  const [ticker,setTicker]=useState<string>('AAPL')
  const [data,setData]=useState<OHLC[]>([])
  const [badge,setBadge]=useState<{label:string;color:string}|null>(null)
  async function fetchOHLC(sym:string){const paths=[`/api/ohlc?t=${encodeURIComponent(sym)}`,'/api/candles?t='+encodeURIComponent(sym)];for(const p of paths){try{const r=await axios.get(p,{timeout:9000});if(Array.isArray(r.data)&&r.data.length>0)return r.data as OHLC[]}catch(e){}}const n=260,day=24*3600*1000,end=Date.now();const time:number[]=[];for(let i=n;i>0;i--)time.push(end-i*day);let price=200;const out:OHLC[]=[];for(const t of time){const drift=Math.random()*0.6-0.3;const vol=Math.random()*2;const open=price;const close=Math.max(1,open+drift+vol*(Math.random()-0.5));const high=Math.max(open,close)+Math.random()*1.5;const low=Math.min(open,close)-Math.random()*1.5;price=close;out.push({time:t,open:+open.toFixed(2),high:+high.toFixed(2),low:+low.toFixed(2),close:+close.toFixed(2)})}return out}
  function pane(row:number){return row===1?{x:'x',y:'y'}:{x:'x'+row,y:'y'+row}}
  function hline(y:number,row:number,color:string){return {type:'line',xref:'x'+(row===1?'':'')+row,yref:'y'+(row===1?'':'')+row,x0:data[0]?.time||0,x1:data[data.length-1]?.time||1,y0:y,y1:y,line:{color,width:1}}}
  useEffect(()=>{(async()=>{const d=await fetchOHLC(ticker);setData(d)})()},[ticker])
  const traces=useMemo(()=>{if(!data.length)return {traces:[],layout:{}};const t=data.map(d=>d.time);const o=data.map(d=>d.open);const h=data.map(d=>d.high);const l=data.map(d=>d.low);const c=data.map(d=>d.close)
    const rows=[true,tog.RSI,tog.Stoch,tog.MACD,tog.TrendPanel].filter(Boolean).length
    const rowIndex={price:1,rsi:tog.RSI?2:0,stoch:(tog.RSI?2:1)+(tog.Stoch?1:0),macd:0,trend:0}
    rowIndex.macd=(tog.RSI?1:0)+(tog.Stoch?1:0)?(tog.RSI?2:1)+(tog.Stoch?1:0)+1:(tog.RSI?2:1)
    rowIndex.trend=rows
    const priceTrace:any={type:'candlestick',x:t,open:o,high:h,low:l,close:c,name:'Price',xaxis:pane(1).x,yaxis:pane(1).y,hoverinfo:'x+y'}
    const tr:any[]=[priceTrace]
    if(tog.EMAs){const e20=ema(c,20),e50=ema(c,50),e200=ema(c,200);tr.push({x:t,y:e20,type:'scatter',mode:'lines',name:'EMA20',xaxis:pane(1).x,yaxis:pane(1).y},{x:t,y:e50,type:'scatter',mode:'lines',name:'EMA50',xaxis:pane(1).x,yaxis:pane(1).y},{x:t,y:e200,type:'scatter',mode:'lines',name:'EMA200',xaxis:pane(1).x,yaxis:pane(1).y})}
    let bb:any=null; if(tog.Bollinger){bb=bollinger(c,20,2);tr.push({x:t,y:bb.upper,type:'scatter',mode:'lines',name:'BB up',line:{color:'#a855f7'},xaxis:pane(1).x,yaxis:pane(1).y},{x:t,y:bb.mid,type:'scatter',mode:'lines',name:'BB mid',line:{color:'#f59e0b'},xaxis:pane(1).x,yaxis:pane(1).y},{x:t,y:bb.lower,type:'scatter',mode:'lines',name:'BB low',line:{color:'#a855f7'},xaxis:pane(1).x,yaxis:pane(1).y})}
    if(tog.BBSig&&bb){const sig=bbSignal(c,bb.upper,bb.lower,1);setBadge({label:sig.label,color:sig.color})
      const mk=(idx:number[],name:string,color:string)=>({x:idx.map(i=>t[i]),y:idx.map(i=>c[i]),type:'scatter',mode:'markers',marker:{symbol:name.includes('sell')?'triangle-down':'triangle-up',size:8,color},name,xaxis:pane(1).x,yaxis:pane(1).y})
      tr.push(mk(sig.strongBuyIdx,'BB strong buy','#16a34a'),mk(sig.weakBuyIdx,'BB weak buy','#86efac'),mk(sig.strongSellIdx,'BB strong sell','#dc2626'),mk(sig.weakSellIdx,'BB weak sell','#fca5a5'))
    } else setBadge(null)
    if(tog.RSI){const rv=rsi(c,14);tr.push({x:t,y:rv,type:'scatter',mode:'lines',name:'RSI',xaxis:pane(2).x,yaxis:pane(2).y});tr.push({x:[t[0],t[t.length-1]],y:[70,70],type:'scatter',mode:'lines',name:'rsi70',xaxis:pane(2).x,yaxis:pane(2).y,showlegend:false,line:{dash:'dot',width:1}},{x:[t[0],t[t.length-1]],y:[30,30],type:'scatter',mode:'lines',name:'rsi30',xaxis:pane(2).x,yaxis:pane(2).y,showlegend:false,line:{dash:'dot',width:1}})}
    if(tog.Stoch){const st=stoch(h,l,c,14,3);tr.push({x:t,y:st.K,type:'scatter',mode:'lines',name:'%K',xaxis:pane(3).x,yaxis:pane(3).y},{x:t,y:st.D,type:'scatter',mode:'lines',name:'%D',xaxis:pane(3).x,yaxis:pane(3).y})}
    if(tog.MACD){const m=macd(c,12,26,9);tr.push({x:t,y:m.macd,type:'scatter',mode:'lines',name:'MACD',xaxis:pane(4).x,yaxis:pane(4).y},{x:t,y:m.signal,type:'scatter',mode:'lines',name:'Signal',xaxis:pane(4).x,yaxis:pane(4).y},{x:t,y:m.hist,type:'bar',name:'Hist',xaxis:pane(4).x,yaxis:pane(4).y,marker:{opacity:0.4}})}
    const shapes:any[]=[]
    if(tog.TrendPanel){const ext=extrema(h,l,10);const levels=clusterLevels([...ext.highs.map(x=>x.price),...ext.lows.map(x=>x.price)],1).slice(0,8);for(const y of levels)shapes.push(hline(y,5,'#111'))}
    const domains:number[][]=[];const rcount=5;const active=[true,tog.RSI,tog.Stoch,tog.MACD,tog.TrendPanel];const heights=[0.55,0.12,0.12,0.12,0.09];let yTop=1;for(let i=0;i<rcount;i++){const hgt=active[i]?heights[i]:0;if(hgt>0){domains[i]=[yTop-hgt,yTop];yTop-=hgt}else domains[i]=[0,0]}
    const layout:any={showlegend:false,margin:{l:50,r:20,t:10,b:30},xaxis:{domain:[0,1],anchor:'y',type:'date'},yaxis:{domain:domains[0],anchor:'x'},xaxis2:{domain:[0,1],anchor:'y2',type:'date'},yaxis2:{domain:domains[1]},xaxis3:{domain:[0,1],anchor:'y3',type:'date'},yaxis3:{domain:domains[2]},xaxis4:{domain:[0,1],anchor:'y4',type:'date'},yaxis4:{domain:domains[3]},xaxis5:{domain:[0,1],anchor:'y5',type:'date'},yaxis5:{domain:domains[4]},shapes}
    return {traces:tr,layout}
  },[data,tog.Bollinger,tog.EMAs,tog.MACD,tog.RSI,tog.Stoch,tog.TrendPanel,tog.BBSig])
  return (
    <div>
      <div className="bar">
        <strong>Market Vision Pro</strong>
        <label><input type="checkbox" checked={tog.EMAs} onChange={e=>setTog({...tog,EMAs:e.target.checked})}/> EMAs</label>
        <label><input type="checkbox" checked={tog.Bollinger} onChange={e=>setTog({...tog,Bollinger:e.target.checked})}/> Bollinger</label>
        <label><input type="checkbox" checked={tog.RSI} onChange={e=>setTog({...tog,RSI:e.target.checked})}/> RSI</label>
        <label><input type="checkbox" checked={tog.Stoch} onChange={e=>setTog({...tog,Stoch:e.target.checked})}/> Stoch</label>
        <label><input type="checkbox" checked={tog.MACD} onChange={e=>setTog({...tog,MACD:e.target.checked})}/> MACD</label>
        <label><input type="checkbox" checked={tog.TrendPanel} onChange={e=>setTog({...tog,TrendPanel:e.target.checked})}/> TrendPanel</label>
        <label><input type="checkbox" checked={tog.BBSig} onChange={e=>setTog({...tog,BBSig:e.target.checked})}/> BB Signals</label>
        <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} style={{padding:'6px 8px',border:'1px solid #ddd',borderRadius:6,width:90}}/>
        <button onClick={()=>setTicker(ticker)} style={{padding:'6px 10px',border:'1px solid #ddd',borderRadius:6,background:'#fafafa'}}>Refresh</button>
      </div>
      <div style={{position:'relative'}}>
        {badge&&<div className="badge" style={{backgroundColor:badge.color}}>{badge.label}</div>}
        <Plot data={traces.traces as any} layout={traces.layout as any} style={{height:'920px',width:'100%'}} config={{displayModeBar:true,responsive:true}} />
      </div>
    </div>
  )
}
