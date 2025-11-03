
export type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]};
export async function fetchOHLC(ticker:string,interval='1d',lookback='1y'):Promise<OHLC>{
  try{
    const res=await fetch(`/api/ohlc?ticker=${encodeURIComponent(ticker)}&interval=${interval}&range=${lookback}`,{cache:'no-store'});
    if(res.ok){const j=await res.json(); if(j&&j.time&&j.time.length) return j}
  }catch{}
  const now=Date.now(), day=864e5; const n=260;
  const time=Array.from({length:n},(_,i)=>now-(n-i)*day);
  let price=200, close:number[]=[]; const open:number[]=[], high:number[]=[], low:number[]=[];
  for(let i=0;i<n;i++){ const drift=Math.sin(i/22)*0.6+Math.random()*0.4, c=Math.max(40, price+drift); const o=c+(Math.random()-0.5)*0.8; const h=Math.max(o,c)+Math.random()*1.2; const l=Math.min(o,c)-Math.random()*1.2;
    open.push(Number(o.toFixed(2))); close.push(Number(c.toFixed(2))); high.push(Number(h.toFixed(2))); low.push(Number(l.toFixed(2))); price=c+(Math.random()-0.5)*0.7;}
  return {time,open,high,low,close};
}
