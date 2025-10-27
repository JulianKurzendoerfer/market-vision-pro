export type OHLC = { time:number[]; open:number[]; high:number[]; low:number[]; close:number[] };
function sma(a:number[], win:number){ const out:number[]=[]; let s=0; for(let i=0;i<a.length;i++){ s+=a[i]; if(i>=win) s-=a[i-win]; out.push(i>=win-1?s/win:NaN); } return out; }
function stdev(a:number[], win:number){ const m=sma(a,win); const out:number[]=[]; for(let i=0;i<a.length;i++){ if(!Number.isFinite(m[i])){ out.push(NaN); continue; } let v=0; for(let j=i-win+1;j<=i;j++) v+=Math.pow(a[j]-m[i],2); out.push(Math.sqrt(v/win)); } return out; }
export function bollinger(close:number[], win=20, k=2){ const mid=sma(close,win); const sd=stdev(close,win); const upper=mid.map((m,i)=>Number.isFinite(m)&&Number.isFinite(sd[i])? m+k*sd[i] : NaN); const lower=mid.map((m,i)=>Number.isFinite(m)&&Number.isFinite(sd[i])? m-k*sd[i] : NaN); return { mid, upper, lower }; }
export type BBSignals = { strongBuyIdx:number[]; weakBuyIdx:number[]; strongSellIdx:number[]; weakSellIdx:number[]; };
export function computeBBSignals(ohlc:OHLC, bb:{upper:number[];lower:number[]}, opts?:{nearTol?:number; useWicks?:boolean}):BBSignals{
  const nearTol = opts?.nearTol ?? 0.10; const useWicks = opts?.useWicks ?? true;
  const strongBuyIdx:number[]=[]; const weakBuyIdx:number[]=[]; const strongSellIdx:number[]=[]; const weakSellIdx:number[]=[];
  for(let i=0;i<ohlc.close.length;i++){
    const u=bb.upper[i], l=bb.lower[i]; if(!Number.isFinite(u)||!Number.isFinite(l)) continue; const bw=u-l; if(!(bw>0)) continue;
    const priceUp = useWicks ? Math.max(ohlc.high[i], ohlc.close[i]) : ohlc.close[i];
    const priceDn = useWicks ? Math.min(ohlc.low[i],  ohlc.close[i]) : ohlc.close[i];
    if(priceUp >= u){ strongSellIdx.push(i); } else { const nearU = (u - priceUp)/bw; if(nearU>0 && nearU<=nearTol) weakSellIdx.push(i); }
    if(priceDn <= l){ strongBuyIdx.push(i); } else { const nearL = (priceDn - l)/bw; if(nearL>0 && nearL<=nearTol) weakBuyIdx.push(i); }
  }
  return { strongBuyIdx, weakBuyIdx, strongSellIdx, weakSellIdx };
}
