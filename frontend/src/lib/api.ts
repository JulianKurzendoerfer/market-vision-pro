export type Ohlc={time:number[];open:number[];high:number[];low:number[];close:number[];volume?:number[];tz?:string};
const base=(import.meta as any).env?.VITE_API_BASE||"";
async function get(url:string){return fetch(url,{cache:"no-store",headers:{pragma:"no-cache","cache-control":"no-store"}})}
export async function fetchOHLC(ticker:string,range:string,interval:string):Promise<Ohlc>{
  const qs=new URLSearchParams({ticker,range,interval,_ts:String(Date.now())}).toString();
  const u=base?`${base}/api/ohlc?${qs}`:`/api/ohlc?${qs}`;
  const r=await get(u); const j=await r.json();
  if(!r.ok||!j?.time?.length) throw new Error("empty");
  const n=Math.min(j.time.length,j.open.length,j.high.length,j.low.length,j.close.length);
  const t:number[]=[],o:number[]=[],h:number[]=[],l:number[]=[],c:number[]=[];
  for(let i=0;i<n;i++){const ti=j.time[i],oi=j.open[i],hi=j.high[i],li=j.low[i],ci=j.close[i];
    if(!Number.isFinite(ti)||!Number.isFinite(oi)||!Number.isFinite(hi)||!Number.isFinite(li)||!Number.isFinite(ci)) continue;
    t.push(ti);o.push(oi);h.push(hi);l.push(li);c.push(ci);
  }
  return{time:t,open:o,high:h,low:l,close:c,volume:j.volume,tz:j.tz};
}
