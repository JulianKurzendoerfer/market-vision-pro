export type TrendInput = { time: (number|string)[]; close: number[]; high: number[]; low: number[] };
export function extrema(vals:number[], win:number){ const n=vals.length; const hi:number[]=[], lo:number[]=[];
  for(let i=win;i<n-win;i++){ let okH=true, okL=true;
    for(let k=1;k<=win;k++){ if(vals[i]<=vals[i-k]||vals[i]<=vals[i+k]) okH=false; if(vals[i]>=vals[i-k]||vals[i]>=vals[i+k]) okL=false; }
    if(okH) hi.push(i); if(okL) lo.push(i);
  } return {highIdx:hi, lowIdx:lo};
}
export function clusterLevels(raw:number[], tol=0.01){ const s=raw.slice().sort((a,b)=>a-b); const levels:number[]=[], counts:number[]=[];
  for(const v of s){ if(!levels.length){ levels.push(v); counts.push(1); continue; }
    const last=levels[levels.length-1]; const gap=Math.abs(v-last)/(Math.max(Math.abs(v),Math.abs(last))||1);
    if(gap<=tol){ const c=counts[counts.length-1]+1; counts[counts.length-1]=c; levels[levels.length-1]=(last*(c-1)+v)/c; }
    else{ levels.push(v); counts.push(1); } }
  const maxC=Math.max(...counts), minC=Math.min(...counts);
  const strength=counts.map(c=>(c-minC)/Math.max(1,(maxC-minC))); return {levels, counts, strength};
}
export function computeTrend(ohlc:TrendInput, win=10, tol=0.01){
  const close=ohlc.close||[]; const lows=extrema(close,win).lowIdx; const highs=extrema(close,win).highIdx;
  const raw=[...lows.map(i=>close[i]), ...highs.map(i=>close[i])]; const cl=clusterLevels(raw, tol);
  return { lows, highs, levels:cl.levels, counts:cl.counts, strength:cl.strength };
}
