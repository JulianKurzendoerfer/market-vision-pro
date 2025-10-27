export function computeBBSignal(close:number[], win=20, k=2){
  const n=close.length; if(n<win) return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
  const ma=(i:number)=>{let s=0;for(let j=i-win+1;j<=i;j++)s+=close[j];return s/win}
  const std=(i:number,m:number)=>{let s=0;for(let j=i-win+1;j<=i;j++){const d=close[j]-m;s+=d*d}return Math.sqrt(s/win)}
  const i=n-1; const m=ma(i); const s=std(i,m); const up=m+k*s; const lo=m-k*s; const c=close[i]
  const w=Math.max(1e-9,up-lo)
  if(c>=up*0.999) return {label:"BB: strong Sell", bg:"#ef4444", fg:"#ffffff"}
  if(c>up-0.05*w) return {label:"BB: weak Sell", bg:"#f59e0b", fg:"#111827"}
  if(c<=lo*1.001) return {label:"BB: strong Buy", bg:"#10b981", fg:"#0b1021"}
  if(c<lo+0.05*w) return {label:"BB: weak Buy", bg:"#34d399", fg:"#0b1021"}
  return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
}
