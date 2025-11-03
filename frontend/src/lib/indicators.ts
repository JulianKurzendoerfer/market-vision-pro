export function sma(a:number[], w:number): number[] {
  const out:number[] = new Array(a.length).fill(NaN)
  let s = 0
  for (let i=0;i<a.length;i++){
    s += a[i]
    if (i>=w) s -= a[i-w]
    if (i>=w-1) out[i] = s / w
  }
  return out
}
export function ema(a:number[], w:number): number[] {
  const out:number[] = new Array(a.length).fill(NaN)
  const k = 2/(w+1)
  let e = 0, start=false, seed=0
  for(let i=0;i<a.length;i++){
    seed += a[i]
    if (i===w-1){ e = seed/w; out[i]=e; start=true; continue }
    if (!start) continue
    e = a[i]*k + e*(1-k)
    out[i]=e
  }
  return out
}
export function stddev(a:number[], w:number): number[] {
  const out:number[] = new Array(a.length).fill(NaN)
  const q:number[] = []
  let sum=0, sum2=0
  for (let i=0;i<a.length;i++){
    q.push(a[i]); sum+=a[i]; sum2+=a[i]*a[i]
    if (q.length>w){ const x=q.shift()!; sum-=x; sum2-=x*x }
    if (q.length===w){
      const m = sum/w
      const v = Math.max(0, sum2/w - m*m)
      out[i] = Math.sqrt(v)
    }
  }
  return out
}
export function bollinger(close:number[], w=20, k=2){
  const basis = sma(close,w)
  const sd = stddev(close,w)
  const upper = basis.map((b,i)=> (isFinite(b)&&isFinite(sd[i])? b + k*sd[i] : NaN))
  const lower = basis.map((b,i)=> (isFinite(b)&&isFinite(sd[i])? b - k*sd[i] : NaN))
  return {basis, upper, lower}
}
export function rsi(close:number[], p=14){
  const out:number[] = new Array(close.length).fill(NaN)
  let ag=0, al=0, rs=0
  for(let i=1;i<close.length;i++){
    const ch = close[i]-close[i-1]
    const g = Math.max(ch,0), l = Math.max(-ch,0)
    if (i<=p){ ag+=g; al+=l; if(i===p){ ag/=p; al/=p; rs = al===0? 100 : ag/al; out[i]= 100 - 100/(1+rs) } }
    else { ag = (ag*(p-1)+g)/p; al = (al*(p-1)+l)/p; rs = al===0? 100 : ag/al; out[i]= 100 - 100/(1+rs) }
  }
  return out
}
export function stoch(high:number[], low:number[], close:number[], p=14, d=3){
  const k:number[] = new Array(close.length).fill(NaN)
  for(let i=0;i<close.length;i++){
    const s = Math.max(0,i-p+1), e=i+1
    let hi=-Infinity, lo=Infinity
    for(let j=s;j<e;j++){ if (high[j]>hi) hi=high[j]; if (low[j]<lo) lo=low[j] }
    const denom = hi-lo
    k[i] = denom>0? 100*(close[i]-lo)/denom : NaN
  }
  const dline = sma(k, d)
  return {k, d: dline}
}
export function macd(close:number[], fast=12, slow=26, sig=9){
  const f = ema(close, fast)
  const s = ema(close, slow)
  const line = close.map((_,i)=> (isFinite(f[i])&&isFinite(s[i])? f[i]-s[i] : NaN))
  const seed:number[]=[]; for(const v of line){ if(isFinite(v)) seed.push(v) }
  const sigArr = ema(seed, sig)
  const signal:number[] = new Array(line.length).fill(NaN)
  let si=0; for(let i=0;i<line.length;i++){ if (isFinite(line[i])) { signal[i] = sigArr[si++] ?? NaN } }
  const hist = line.map((x,i)=> (isFinite(x)&&isFinite(signal[i])? x - signal[i] : NaN))
  return { line, signal, hist }
}
export function pivots(high:number[], low:number[], left=3, right=3){
  const ph:number[] = []; const pl:number[] = []
  for(let i=left;i<high.length-right;i++){
    let isHigh=true, isLow=true
    for(let j=i-left;j<=i+right;j++){
      if (high[j]>high[i]) isHigh=false
      if (low[j]<low[i]) isLow=false
      if(!isHigh && !isLow) break
    }
    ph.push(isHigh? i : NaN)
    pl.push(isLow? i : NaN)
  }
  return { pivotHighIdx: ph, pivotLowIdx: pl }
}
