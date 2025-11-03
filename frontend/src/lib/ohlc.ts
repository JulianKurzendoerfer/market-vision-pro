export type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]};
async function tryPath(u:string){try{const r=await fetch(u,{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.time&&j.time.length)return j}}catch{} return null}
export async function fetchOHLC(ticker:string,interval='1d',range='1y'):Promise<OHLC>{
  const qs='ticker='+encodeURIComponent(ticker)+'&interval='+interval+'&range='+range;
  const paths=['/api/ohlc?'+qs,'/ohlc?'+qs,'/data/ohlc?'+qs];
  for(const u of paths){const j=await tryPath(u); if(j) return j}
  // Fallback (nur wenn Backend nichts liefert)
  const n=260, day=864e5, now=Date.now();
  const time=Array.from({length:n},(_,i)=>now-(n-i)*day);
  let px=200; const open:number[]=[],high:number[]=[],low:number[]=[],close:number[]=[];
  for(let i=0;i<n;i++){const drift=Math.sin(i/22)*0.7+(Math.random()-0.5)*0.6; const c=Math.max(40,px+drift);
    const o=c+(Math.random()-0.5)*0.8, h=Math.max(o,c)+Math.random()*1.1, l=Math.min(o,c)-Math.random()*1.1;
    open.push(+o.toFixed(2)); close.push(+c.toFixed(2)); high.push(+h.toFixed(2)); low.push(+l.toFixed(2)); px=c;}
  return {time,open,high,low,close};
}