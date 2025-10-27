import React from"react";
import {createRoot}from"react-dom/client";
import TrendPanel from"./components/TrendPanel";
export function mountTrendPanel(){
  const id="mv-trendpanel-root";
  let host=document.getElementById(id);
  if(!host){const parent=(document.querySelector("main") as HTMLElement)||document.body;host=document.createElement("div");host.id=id;parent.appendChild(host);}
  const w=window as any;
  const root=w.__mv_trend_root||createRoot(host!);
  w.__mv_trend_root=root;

}
if(typeof document!=="undefined"){window.addEventListener("load",()=>setTimeout(mountTrendPanel,100));window.addEventListener("resize",()=>setTimeout(mountTrendPanel,150));}
