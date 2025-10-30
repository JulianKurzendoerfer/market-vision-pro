export type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]}

function norm(obj:any):OHLC|null{
  if(!obj)return null
  if(Array.isArray(obj)){
    const t:number[]=[],o:number[]=[],h:number[]=[],l:number[]=[],c:number[]=[]
    for(const r of obj){if(!r)continue
      const tt=('t'in r)?r.t:('time'in r?r.time:null)
      const oo=r.o??r.open, hh=r.h??r.high, ll=r.l??r.low, cc=r.c??r.close
      if(tt==null||oo==null||hh==null||ll==null||cc==null)continue
      t.push(typeof tt==='number'?tt:Date.parse(tt)); o.push(+oo); h.push(+hh); l.push(+ll); c.push(+cc)
    }
    return t.length?{time:t,open:o,high:h,low:l,close:c}:null
  }
  if('time'in obj&&'open'in obj&&'high'in obj&&'low'in obj&&'close'in obj){
    const toN=(a:any[])=>a.map(v=>+v)
    const toT=(a:any[])=>a.map(v=>typeof v==='number'?v:Date.parse(v))
    return {time:toT(obj.time),open:toN(obj.open),high:toN(obj.high),low:toN(obj.low),close:toN(obj.close)}
  }
  if('data'in obj)return norm(obj.data)
  return null
}

export function makeFallbackOHLC(n=260,start=200):OHLC{
  const day=24*3600*1000
  const end=Date.now()
  const time=Array.from({length:n},(_,i)=>end-(n-1-i)*day)
  const close:number[]=[]; const open:number[]=[]; const high:number[]=[]; const low:number[]=[]
  let px=start
  for(let i=0;i<n;i++){
    const drift = Math.sin(i/22)*0.6 + Math.sin(i/7)*0.2
    const noise = (Math.random()-0.5)*1.2
    const prev=px; px = Math.max(1, prev*(1+(drift+noise)/100))
    const o = prev + (Math.random()-0.5)*0.6
    const c = px
    const h = Math.max(o,c) + Math.random()*0.8
    const l = Math.min(o,c) - Math.random()*0.8
    open.push(+o.toFixed(2)); close.push(+c.toFixed(2))
    high.push(+h.toFixed(2));  low.push(+l.toFixed(2))
  }
  return {time,open,high,low,close}
}

export async function fetchOHLC(ticker:string, interval:string='1d', range:string='1y'):Promise<OHLC>{
  const qs=`t=${encodeURIComponent(ticker)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`
  const paths=[`/api/ohlc?${qs}`,`/api/candles?${qs}`,`/ohlc?${qs}`]
  for(const p of paths){
    try{
      const r=await fetch(p,{cache:'no-store'})
      if(!r.ok)continue
      const j=await r.json()
      const o=norm(j)
      if(o&&o.time.length>5)return o
    }catch(e){}
  }
  return makeFallbackOHLC()
}
