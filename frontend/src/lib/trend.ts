export type TrendInput={time:number[];close:number[];high:number[];low:number[]};
export function extrema(vals:number[],win:number){
  const lows:number[]=[], highs:number[]=[];
  for(let i=win;i<vals.length-win;i++){
    let lo=true, hi=true, v=vals[i];
    for(let k=1;k<=win;k++){ if(vals[i-k]<v||vals[i+k]<v) lo=false; if(vals[i-k]>v||vals[i+k]>v) hi=false; }
    if(lo) lows.push(i); if(hi) highs.push(i);
  }
  return {lows,highs};
}
export function clusterLevels(vals:number[], tol=0.01){
  const a=[...vals].sort((x,y)=>x-y); if(!a.length) return {levels:[],counts:[],strength:[]};
  const levels:number[]=[a[0]], counts:number[]=[1];
  for(let i=1;i<a.length;i++){
    const last=levels[levels.length-1], v=a[i];
    if(Math.abs(v-last)<=tol*Math.max(last,Math.abs(v))) counts[counts.length-1]++; else {levels.push(v);counts.push(1);}
  }
  const maxC=Math.max(...counts), minC=Math.min(...counts);
  const strength=counts.map(c=>(c-minC)/Math.max(1,(maxC-minC)));
  return {levels,counts,strength};
}
export function computeTrend(ohlc:TrendInput, win=10, tol=0.01){
  const close=ohlc.close, {lows,highs}=extrema(close,win);
  const pts=[...lows.map(i=>close[i]), ...highs.map(i=>close[i])];
  const cl=clusterLevels(pts,tol);
  const levels=cl.levels.map((l,i)=>({l, c:cl.counts[i], s:cl.strength[i]}));
  return {lows,highs,levels};
}
