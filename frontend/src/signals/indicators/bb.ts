import type { OHLC, Signal } from "../types";
function sma(a:number[], n:number){const o=Array(a.length).fill(NaN);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=n) s-=a[i-n];if(i>=n-1) o[i]=s/n;}return o;}
function stdev(a:number[], n:number){const o=Array(a.length).fill(NaN);const m=sma(a,n);let w:number[]=[];for(let i=0;i<a.length;i++){w.push(a[i]);if(w.length>n) w.shift();if(w.length===n){const mu=m[i];let v=0;for(const x of w){const d=x-mu;v+=d*d;}o[i]=Math.sqrt(v/n);}}return o;}
export function computeBB(ohlc:OHLC, win=20, k=2, kWeak=1.5){
  const c=ohlc.close, mid=sma(c,win), sd=stdev(c,win);
  const up=c.map((_,i)=>mid[i]+k*sd[i]), lo=c.map((_,i)=>mid[i]-k*sd[i]);
  const upW=c.map((_,i)=>mid[i]+kWeak*sd[i]), loW=c.map((_,i)=>mid[i]-kWeak*sd[i]);
  const near=0.005;
  const bs:number[]=[], bw:number[]=[], ss:number[]=[], sw:number[]=[]; let last:Signal=null;
  for(let i=0;i<c.length;i++){
    const p=c[i], U=up[i], L=lo[i], Uw=upW[i], Lw=loW[i];
    if(Number.isNaN(U)||Number.isNaN(L)){bs.push(NaN);bw.push(NaN);ss.push(NaN);sw.push(NaN);continue;}
    const nearU=Math.abs(p-U)/p<=near, nearL=Math.abs(p-L)/p<=near;
    if(p>=U){ss.push(p);sw.push(NaN);bs.push(NaN);bw.push(NaN); last={at:i,dir:"sell",strength:"strong",label:"BB: strong sell",color:"#d93f3f"};}
    else if(p<=L){bs.push(p);bw.push(NaN);ss.push(NaN);sw.push(NaN); last={at:i,dir:"buy",strength:"strong",label:"BB: strong buy",color:"#1a7f37"};}
    else if(p>=Uw||nearU){sw.push(p);ss.push(NaN);bs.push(NaN);bw.push(NaN); last={at:i,dir:"sell",strength:"weak",label:"BB: weak sell",color:"#e07a7a"};}
    else if(p<=Lw||nearL){bw.push(p);bs.push(NaN);ss.push(NaN);sw.push(NaN); last={at:i,dir:"buy",strength:"weak",label:"BB: weak buy",color:"#62c66b"};}
    else{bs.push(NaN);bw.push(NaN);ss.push(NaN);sw.push(NaN);}
  }
  return {last, buyStrong:bs, buyWeak:bw, sellStrong:ss, sellWeak:sw, upper:up, middle:mid, lower:lo};
}
export function bbSignal(ohlc:OHLC, win=20, k=2, kWeak=1.5){ return computeBB(ohlc,win,k,kWeak).last; }
