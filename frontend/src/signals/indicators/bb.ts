import { Signal } from "../types";
import { sma, rollingStd, near } from "../utils";
export type BBParams={window?:number;k?:number;tol?:number};
export function bollinger(close:number[],p:BBParams={}):{mid:number[];up:number[];lo:number[]}{
  const w=p.window??20;const k=p.k??2;const m=sma(close,w);const sd=rollingStd(close,w);
  const n=close.length;const up=new Array(n).fill(NaN);const lo=new Array(n).fill(NaN);
  for(let i=0;i<n;i++){if(!Number.isNaN(m[i])&&!Number.isNaN(sd[i])){up[i]=m[i]+k*sd[i];lo[i]=m[i]-k*sd[i];}}
  return {mid:m,up,lo};
}
export function bbSignal(time:number[],close:number[],up:number[],lo:number[],tol=0.01):Signal{
  const i=close.length-1;const c=close[i];const u=up[i];const l=lo[i];const t=time[i]??Date.now();
  if(!(isFinite(c)&&isFinite(u)&&isFinite(l))) return {indicator:"BB",direction:"neutral",strength:"neutral",reason:"n/a",confidence:0.5,at:t};
  const bw=Math.max(1e-9,u-l);const dUp=(u-c)/bw;const dLo=(c-l)/bw;
  if(c>=u||near(c,u,tol)) return {indicator:"BB",direction:"sell",strength:"strong",reason:"upper",confidence:0.9,at:t};
  if(c<=l||near(c,l,tol)) return {indicator:"BB",direction:"buy",strength:"strong",reason:"lower",confidence:0.9,at:t};
  if(dUp<=2*tol) return {indicator:"BB",direction:"sell",strength:"weak",reason:"near upper",confidence:0.6,at:t};
  if(dLo<=2*tol) return {indicator:"BB",direction:"buy",strength:"weak",reason:"near lower",confidence:0.6,at:t};
  return {indicator:"BB",direction:"neutral",strength:"neutral",reason:"inside",confidence:0.5,at:t};
}
