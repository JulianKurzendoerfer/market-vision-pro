import React, { useEffect, useMemo, useState } from "react";
type Props = { win?: number; k?: number; tol?: number; host?: HTMLElement|null };
function computeLabel(close:number[], win:number, k:number, tol:number){
  if (close.length < win) return {text:"BB: neutral", bg:"#666", fg:"#fff"};
  const n = win, end = close.length;
  let sum=0, sumsq=0;
  for(let i=end-n;i<end;i++){ const x=close[i]; sum+=x; sumsq+=x*x; }
  const mean=sum/n; const variance=Math.max(0, sumsq/n - mean*mean);
  const sd=Math.sqrt(variance);
  const up=mean + k*sd, lo=mean - k*sd, c=close[end-1];
  const nearUp = Math.abs(c-up)/up <= tol;
  const nearLo = Math.abs(c-lo)/lo <= tol;
  if (c >= up)  return {text:"BB: STRONG SELL", bg:"#e11d48", fg:"#fff"};
  if (nearUp)   return {text:"BB: SELL",        bg:"#f43f5e", fg:"#fff"};
  if (c <= lo)  return {text:"BB: STRONG BUY",  bg:"#16a34a", fg:"#fff"};
  if (nearLo)   return {text:"BB: BUY",         bg:"#22c55e", fg:"#0a0a0a"};
  return {text:"BB: neutral", bg:"#666", fg:"#fff"};
}
export default function BBHud({win=20,k=2,tol=0.01,host}:Props){
  const [label,setLabel]=useState<{text:string,bg:string,fg:string}>({text:"BB: neutral",bg:"#666",fg:"#fff"});
  const probe = useMemo(() => {
    return () => {
      const el = (host ?? document.querySelector(".js-plotly-plot")) as any;
      if (!el || !el.data) return;
      const data = el.data as any[];
      const cTrace = data.find(t=>t?.type==="candlestick" && Array.isArray(t.close));
      const close:number[] =
        (cTrace?.close as number[] | undefined)
        ?? (data.find(t=>t?.name?.toLowerCase?.()==="close")?.y as number[] | undefined)
        ?? [];
      if (!close.length) return;
      setLabel(computeLabel(close, win, k, tol));
      const Plotly = (window as any).Plotly;
      if (Plotly && Array.isArray(el.data)) {
        const idx = el.data.map((t:any,i:number)=> (t?.name==="Highs"||t?.name==="Lows")?i:-1).filter((i:number)=>i>=0);
        if (idx.length) Plotly.restyle(el, {visible:false}, idx);
      }
    };
  },[host,win,k,tol]);
  useEffect(()=>{
    const run=()=>probe();
    run();
    const iv=setInterval(run,1200);
    window.addEventListener("resize",run);
    return ()=>{ clearInterval(iv); window.removeEventListener("resize",run); };
  },[probe]);
  return (
    <div style={{
      position:"absolute", top:8, left:8, zIndex:10,
      padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:700,
      background:label.bg, color:label.fg, boxShadow:"0 2px 8px rgba(0,0,0,.15)",
      userSelect:"none", pointerEvents:"none"
    }}>{label.text}</div>
  );
}
