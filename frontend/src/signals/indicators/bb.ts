export type BBRes={label:string;color:string;strongBuyIdx:number[];weakBuyIdx:number[];strongSellIdx:number[];weakSellIdx:number[]}
export function bbSignal(close:number[],upper:number[],lower:number[],nearPct=1):BBRes{
  const strongBuy:number[]=[];const weakBuy:number[]=[];const strongSell:number[]=[];const weakSell:number[]=[]
  const n=Math.min(close.length,upper.length,lower.length)
  for(let i=0;i<n;i++){
    const c=close[i],up=upper[i],lo=lower[i];if(!isFinite(c)||!isFinite(up)||!isFinite(lo))continue
    const nearUp=Math.abs(c-up)/up*100<=nearPct
    const nearLo=Math.abs(c-lo)/lo*100<=nearPct
    if(c>=up)strongSell.push(i);else if(nearUp)weakSell.push(i)
    if(c<=lo)strongBuy.push(i);else if(nearLo)weakBuy.push(i)
  }
  let label="BB: neutral",color="#666"
  if(n>0){
    const i=n-1,c=close[i],up=upper[i],lo=lower[i]
    if(isFinite(c)&&isFinite(up)&&isFinite(lo)){
      const nearUp=Math.abs(c-up)/up*100<=nearPct
      const nearLo=Math.abs(c-lo)/lo*100<=nearPct
      if(c>=up||nearUp&&c>up*0.995){label="BB: weak sell";color="#b91c1c"}
      else if(c<=lo||nearLo&&c<lo*1.005){label="BB: weak buy";color="#15803d"}
    }
  }
  return {label,color,strongBuyIdx:strongBuy,weakBuyIdx:weakBuy,strongSellIdx:strongSell,weakSellIdx:weakSell}
}
