export type TrendInput={time:any[];close:number[];high:number[];low:number[]};
function extrema(vals:number[],win=10){
  const lows:number[]=[], highs:number[]=[];
  for(let i=win;i<vals.length-win;i++){
    let lo=true,hi=true;
    for(let k=1;k<=win;k++){
      if(vals[i]>vals[i-k]||vals[i]>vals[i+k]) lo=false;
      if(vals[i]<vals[i-k]||vals[i]<vals[i+k]) hi=false;
      if(!lo && !hi) break;
    }
    if(lo) lows.push(i);
    if(hi) highs.push(i);
  }
  return {lows,highs};
}
function clusterLevels(vals:number[], tol=0.01){
  const v=vals.slice().sort((a,b)=>a-b);
  const levels:number[]=[], counts:number[]=[];
  for(const x of v){
    if(!levels.length){levels.push(x);counts.push(1);continue;}
    const last=levels[levels.length-1];
    if(Math.abs(x-last) <= tol*Math.max(Math.abs(x),Math.abs(last))){
      const n=counts.length-1; counts[n]+=1; levels[n]=(levels[n]* (counts[n]-1) + x)/counts[n];
    }else{levels.push(x);counts.push(1);}
  }
  const maxC=Math.max(...counts,1), minC=Math.min(...counts,0);
  const strength=counts.map(c=>(c-minC)/(maxC-minC||1));
  return {levels,counts,strength};
}
export default function computeTrend(ohlc:TrendInput,win=10,tol=0.01){
  const {lows,highs}=extrema(ohlc.close,win);
  const raw=[...lows.map(i=>ohlc.close[i]), ...highs.map(i=>ohlc.close[i])];
  const cl=clusterLevels(raw,tol);
  return {time:ohlc.time,close:ohlc.close,highs,lows,levels:cl.levels,strength:cl.strength};
}
