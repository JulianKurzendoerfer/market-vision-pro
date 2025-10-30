export function stoch(high:number[],low:number[],close:number[], kLen=14, dLen=3){
  const k=Array(close.length).fill(NaN);
  const d=Array(close.length).fill(NaN);
  let winH:number[]=[], winL:number[]=[];
  for(let i=0;i<close.length;i++){
    winH.push(high[i]); if(winH.length>kLen) winH.shift();
    winL.push(low[i]);  if(winL.length>kLen) winL.shift();
    if(winH.length===kLen){
      const hh=Math.max(...winH), ll=Math.min(...winL);
      k[i]=(hh===ll)?50:((close[i]-ll)/(hh-ll))*100;
    }
  }
  let s=0, q:number[]=[];
  for(let i=0;i<k.length;i++){
    q.push(k[i]); if(q.length>dLen) q.shift();
    if(q.length===dLen){ s=0; for(const x of q) s+=x; d[i]=s/dLen; }
  }
  return {k,d};
}
