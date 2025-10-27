export function computeBB(close:number[], win=20, k=2){
  const ma:number[]=[], sd:number[]=[], up:number[]=[], lo:number[]=[]
  let s=0, s2=0
  const q:number[]=[]
  for(let i=0;i<close.length;i++){
    q.push(close[i]); s+=close[i]; s2+=close[i]*close[i]
    if(q.length>win){ const x=q.shift() as number; s-=x; s2-=x*x }
    if(q.length===win){
      const m=s/win; const v=Math.max(0,(s2/win)-m*m); const st=Math.sqrt(v)
      ma.push(m); sd.push(st); up.push(m+k*st); lo.push(m-k*st)
    }else{ ma.push(NaN); sd.push(NaN); up.push(NaN); lo.push(NaN) }
  }
  return {ma,up,lo}
}
export function computeBBSignal(close:number[], win=20, k=2, near=0.005){
  if(!close || close.length===0) return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
  const {up,lo}=computeBB(close,win,k)
  let i=close.length-1; while(i>=0 && (!isFinite(up[i])||!isFinite(lo[i]))) i--
  if(i<0) return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
  const c=close[i], u=up[i], l=lo[i], tol=Math.max(near*c, 0.01)
  if(c>=u-tol){ const strong=c>=u ? "strong" : "weak"; return {label:`BB: SELL (${strong})`, bg:"#ef4444", fg:"#ffffff"} }
  if(c<=l+tol){ const strong=c<=l ? "strong" : "weak"; return {label:`BB: BUY (${strong})`, bg:"#16a34a", fg:"#ffffff"} }
  return {label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"}
}
