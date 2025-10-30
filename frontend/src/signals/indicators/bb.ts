import { OHLC, BBResult, Signal } from "../types";

function sma(a:number[], n:number){
  const out = Array(a.length).fill(NaN);
  let s=0;
  for(let i=0;i<a.length;i++){
    s += a[i];
    if(i>=n) s -= a[i-n];
    if(i>=n-1) out[i] = s/n;
  }
  return out;
}

function stdev(a:number[], n:number){
  const out = Array(a.length).fill(NaN);
  const m = sma(a,n);
  let win:number[] = [];
  for(let i=0;i<a.length;i++){
    win.push(a[i]);
    if(win.length>n) win.shift();
    if(win.length===n){
      const mu = m[i];
      let v=0;
      for(const x of win){ const d=x-mu; v+=d*d; }
      out[i] = Math.sqrt(v/n);
    }
  }
  return out;
}

export function computeBB(ohlc:OHLC, win=20, k=2, kWeak=1.5):BBResult{
  const c = ohlc.close;
  const mid = sma(c,win);
  const sd  = stdev(c,win);
  const up  = c.map((_,i)=> mid[i] + k*sd[i]);
  const lo  = c.map((_,i)=> mid[i] - k*sd[i]);
  const upWeak = c.map((_,i)=> mid[i] + kWeak*sd[i]);
  const loWeak = c.map((_,i)=> mid[i] - kWeak*sd[i]);

  const nearPct = 0.005;

  const buyStrong:number[] = [];
  const buyWeak:number[] = [];
  const sellStrong:number[] = [];
  const sellWeak:number[] = [];

  let last:Signal|null = null;

  for(let i=0;i<c.length;i++){
    const price = c[i];
    const U = up[i], L = lo[i], Uw=upWeak[i], Lw=loWeak[i];
    if(Number.isNaN(U) || Number.isNaN(L)) { buyStrong.push(NaN); buyWeak.push(NaN); sellStrong.push(NaN); sellWeak.push(NaN); continue; }

    const nearU = Math.abs(price-U)/price <= nearPct;
    const nearL = Math.abs(price-L)/price <= nearPct;

    if(price >= U){
      sellStrong.push(price); sellWeak.push(NaN); buyStrong.push(NaN); buyWeak.push(NaN);
      last = { at:i, dir:"sell", strength:"strong", label:"BB: STRONG SELL", color:"#d93f3f" };
    }else if(price <= L){
      buyStrong.push(price); buyWeak.push(NaN); sellStrong.push(NaN); sellWeak.push(NaN);
      last = { at:i, dir:"buy", strength:"strong", label:"BB: STRONG BUY", color:"#1a7f37" };
    }else if(price >= Uw || nearU){
      sellWeak.push(price); sellStrong.push(NaN); buyStrong.push(NaN); buyWeak.push(NaN);
      last = { at:i, dir:"sell", strength:"weak", label:"BB: weak sell", color:"#e07a7a" };
    }else if(price <= Lw || nearL){
      buyWeak.push(price); buyStrong.push(NaN); sellStrong.push(NaN); sellWeak.push(NaN);
      last = { at:i, dir:"buy", strength:"weak", label:"BB: weak buy", color:"#62c66b" };
    }else{
      buyStrong.push(NaN); buyWeak.push(NaN); sellStrong.push(NaN); sellWeak.push(NaN);
    }
  }

  return { last, buyStrong, buyWeak, sellStrong, sellWeak, upper:up, middle:mid, lower:lo };
}
