
export type Strength='strong'|'weak'|'neutral'; export type Direction='buy'|'sell'|'neutral';
export type BBRes={label:string;color:string; strong:{buy:{t:number[];y:number[]}, sell:{t:number[];y:number[]}}, weak:{buy:{t:number[];y:number[]}, sell:{t:number[];y:number[]}}};
function sma(a:number[],n:number){const r:number[]=[];let s=0; for(let i=0;i<a.length;i++){s+=a[i]; if(i>=n)s-=a[i-n]; r.push(i>=n-1?s/n:NaN)} return r}
function stdev(a:number[],n:number){const r:number[]=[];let s=0,s2=0; for(let i=0;i<a.length;i++){s+=a[i];s2+=a[i]*a[i]; if(i>=n){s-=a[i-n];s2-=a[i-n]*a[i-n]} if(i>=n-1){const m=s/n; r.push(Math.sqrt(Math.max(0,s2/n-m*m)));} else r.push(NaN);} return r}
export function bbSignals(close:number[], win=20, k=2, near=0.5):BBRes{
  const m=sma(close,win), sd=stdev(close,win);
  const up=m.map((v,i)=>v+k*(sd[i]??0)), lo=m.map((v,i)=>v-k*(sd[i]??0));
  const strongBuy={t:[],y:[]}, strongSell={t:[],y:[]}, weakBuy={t:[],y:[]}, weakSell={t:[],y:[]};
  for(let i=0;i<close.length;i++){
    const c=close[i], u=up[i], l=lo[i]; if(!isFinite(c)||!isFinite(u)||!isFinite(l)) continue;
    const du=Math.abs((u-c)/(u||1)), dl=Math.abs((c-l)/(l||1));
    if(c>=u){strongSell.t.push(i); strongSell.y.push(c)}
    else if(du<=near){weakSell.t.push(i); weakSell.y.push(c)}
    if(c<=l){strongBuy.t.push(i); strongBuy.y.push(c)}
    else if(dl<=near){weakBuy.t.push(i); weakBuy.y.push(c)}
  }
  return {label:'BB', color:'#888', strong:{buy:strongBuy,sell:strongSell}, weak:{buy:weakBuy,sell:weakSell}};
}
