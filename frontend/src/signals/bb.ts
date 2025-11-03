export type Strength='strong'|'weak'|'neutral'; export type Direction='buy'|'sell'|'neutral';
export type BBRes={label:string;color:string; strong:{buy:{t:number[];y:number[]},sell:{t:number[];y:number[]}}, weak:{buy:{t:number[];y:number[]},sell:{t:number[];y:number[]}}};
function sma(a:number[],n:number){const r:number[]=[];let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n];r.push(i>=n-1?s/n:NaN)}return r}
function stdev(a:number[],n:number){const r:number[]=[];let s=0,s2=0;for(let i=0;i<a.length;i++){s+=a[i];s2+=a[i]*a[i];if(i>=n){s-=a[i-n];s2-=a[i-n]*a[i-n]}if(i>=n-1){const m=s/n; r.push(Math.sqrt(Math.max(0,s2/n-m*m)));}else r.push(NaN)}return r}
export function bbSignals(close:number[],win=20,k=2,near=0.01):BBRes{
  const m=sma(close,win), sd=stdev(close,win);
  const up=m.map((v,i)=>v+k*(sd[i]??0)), lo=m.map((v,i)=>v-k*(sd[i]??0));
  const SB={t:[],y:[]}, SS={t:[],y:[]}, WB={t:[],y:[]}, WS={t:[],y:[]};
  for(let i=0;i<close.length;i++){
    const c=close[i], u=up[i], l=lo[i]; if(!isFinite(c)||!isFinite(u)||!isFinite(l)) continue;
    const du=Math.abs((u-c)/(u||1)), dl=Math.abs((c-l)/(l||1));
    if(c>=u) {SS.t.push(i); SS.y.push(c)} else if(du<=near){WS.t.push(i); WS.y.push(c)}
    if(c<=l) {SB.t.push(i); SB.y.push(c)} else if(dl<=near){WB.t.push(i); WB.y.push(c)}
  }
  return {label:'BB', color:'#666', strong:{buy:SB,sell:SS}, weak:{buy:WB,sell:WS}};
}
export function bbBadge(close:number[],win=20,k=2,near=0.01){const m=sma(close,win), sd=stdev(close,win);
  const i=close.length-1; const u=(m[i]??0)+k*(sd[i]??0), l=(m[i]??0)-k*(sd[i]??0), c=close[i];
  if(!isFinite(c)||!isFinite(u)||!isFinite(l)) return {text:'BB: neutral', bg:'#777'};
  const du=Math.abs((u-c)/(u||1)), dl=Math.abs((c-l)/(l||1));
  if(c>=u) return {text:'BB: strong sell', bg:'#e06c75'};
  if(du<=near) return {text:'BB: weak sell', bg:'#f4a261'};
  if(c<=l) return {text:'BB: strong buy', bg:'#2ea043'};
  if(dl<=near) return {text:'BB: weak buy', bg:'#3fb950'};
  return {text:'BB: neutral', bg:'#777'};
}