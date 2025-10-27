export function computeBB(close:number[], win=20, k=2){
  const ma:number[]=[], up:number[]=[], lo:number[]=[]
  let s=0, s2=0; const q:number[]=[]
  for(let i=0;i<close.length;i++){
    const v=Number(close[i]); q.push(v); s+=v; s2+=v*v
    if(q.length>win){ const x=q.shift() as number; s-=x; s2-=x*x }
    if(q.length===win){
      const m=s/win; const st=Math.sqrt(Math.max(0,(s2/win)-m*m))
      ma.push(m); up.push(m+k*st); lo.push(m-k*st)
    }else{ ma.push(NaN); up.push(NaN); lo.push(NaN) }
  }
  return {ma,up,lo}
}
export function computeBBSignal(close:number[], win=20, k=2, near=0.005){
  if(!close?.length) return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
  const {up,lo}=computeBB(close,win,k)
  let i=close.length-1; while(i>=0 && (!isFinite(up[i])||!isFinite(lo[i]))) i--
  if(i<0) return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
  const c=close[i], u=up[i], l=lo[i], tol=Math.max(near*Math.abs(c),0.01)
  if(c>=u-tol){ const t=c>=u?"strong":"weak"; return {label:`BB: SELL (${t})`, bg:"#ef4444", fg:"#ffffff"} }
  if(c<=l+tol){ const t=c<=l?"strong":"weak"; return {label:`BB: BUY (${t})`, bg:"#16a34a", fg:"#ffffff"} }
  return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
}
