export type BBSignal = {
  label: string
  color: string
  strongBuyIdx: number[]
  weakBuyIdx: number[]
  strongSellIdx: number[]
  weakSellIdx: number[]
}
export function computeBBSignal(close:number[], upper:number[], lower:number[], tolPct=0.01): BBSignal {
  const strongBuy:number[]=[]; const weakBuy:number[]=[]
  const strongSell:number[]=[]; const weakSell:number[]=[]
  const near = (p:number, ref:number)=> Math.abs(p-ref) <= Math.abs(ref)*tolPct
  for(let i=0;i<close.length;i++){
    const c=close[i], up=upper[i], lo=lower[i]
    if (!isFinite(c)||!isFinite(up)||!isFinite(lo)) continue
    if (c>=up) strongSell.push(i)
    else if (near(c,up)) weakSell.push(i)
    else if (c<=lo) strongBuy.push(i)
    else if (near(c,lo)) weakBuy.push(i)
  }
  let label = "BB: neutral", color="#666666"
  if (strongSell.length) { label="BB: strong sell"; color="#b91c1c" }
  else if (weakSell.length) { label="BB: weak sell"; color="#ef4444" }
  else if (strongBuy.length) { label="BB: strong buy"; color="#15803d" }
  else if (weakBuy.length) { label="BB: weak buy"; color="#16a34a" }
  return { label, color, strongBuyIdx:strongBuy, weakBuyIdx:weakBuy, strongSellIdx:strongSell, weakSellIdx:weakSell }
}
