export type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]}
function toNumTime(a:any[]):number[]{return a.map(v=>typeof v==='number'?v:(typeof v==='string'?Date.parse(v):Number(v)))}
function norm(obj:any):OHLC|null{
  if(!obj)return null
  if(Array.isArray(obj)){
    const t:number[]=[],o:number[]=[],h:number[]=[],l:number[]=[],c:number[]=[]
    for(const r of obj){if(r==null)continue;const tt=('t' in r)?r.t:('time' in r? r.time:null);const oo=r.o??r.open;const hh=r.h??r.high;const ll=r.l??r.low;const cc=r.c??r.close;if(tt==null||oo==null||hh==null||ll==null||cc==null)continue;t.push(typeof tt==='number'?tt:Date.parse(tt));o.push(+oo);h.push(+hh);l.push(+ll);c.push(+cc)}
    if(t.length) return {time:t,open:o,high:h,low:l,close:c}
    return null
  }
  if('time' in obj && 'open' in obj && 'high' in obj && 'low' in obj && 'close' in obj){
    return {time:toNumTime(obj.time),open:obj.open.map((x:any)=>+x),high:obj.high.map((x:any)=>+x),low:obj.low.map((x:any)=>+x),close:obj.close.map((x:any)=>+x)}
  }
  if('data' in obj) return norm(obj.data)
  return null
}
export async function fetchOHLC(ticker:string, interval:string='1d', range:string='1y'):Promise<OHLC>{
  const qs=`t=${encodeURIComponent(ticker)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`
  const paths=[`/api/ohlc?${qs}`,`/api/candles?${qs}`,`/ohlc?${qs}`]
  for(const p of paths){
    try{const r=await fetch(p);if(!r.ok)continue;const j=await r.json();const o=norm(j);if(o&&o.time.length>5)return o}catch(e){}
  }
  throw new Error('no_ohlc')
}
