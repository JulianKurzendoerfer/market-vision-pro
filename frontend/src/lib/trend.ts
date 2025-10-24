export function extrema(y:number[], win:number){
  const n=y.length, lows:number[]=[], highs:number[]=[];
  for(let i=win;i<n-win;i++){
    let lo=true, hi=true;
    for(let k=i-win;k<=i+win;k++){
      if(y[k]<y[i]) hi=false;
      if(y[k]>y[i]) lo=false;
      if(!lo && !hi) break;
    }
    if(lo) lows.push(i);
    if(hi) highs.push(i);
  }
  return {lows, highs};
}
export function clusterLevels(vals:number[], tol=0.01){
  const a=[...vals].sort((x,y)=>x-y);
  const levels:number[]=[]; const counts:number[]=[];
  for(const v of a){
    if(!levels.length){ levels.push(v); counts.push(1); continue; }
    const last=levels[levels.length-1];
    if(Math.abs(v-last) <= tol*Math.max(1,Math.abs(last))){
      const c=counts[counts.length-1]+1;
      levels[levels.length-1]=(last*(c-1)+v)/c;
      counts[counts.length-1]=c;
    }else{
      levels.push(v); counts.push(1);
    }
  }
  const maxC=Math.max(...counts,1), minC=Math.min(...counts,0);
  const strength=counts.map(c=>(c-minC)/Math.max(1e-9,(maxC-minC)));
  return {levels, counts, strength};
}
export function computeTrend(ohlc:any, win=10, tol=0.01){
  const close:number[]=(ohlc?.close)||[];
  const {lows, highs}=extrema(close, win);
  const raw=[...lows.map(i=>close[i]), ...highs.map(i=>close[i])];
  const cl=clusterLevels(raw, tol);
  return {lows, highs, levels:cl.levels, counts:cl.counts, strength:cl.strength, now: close[close.length-1]||null};
}
