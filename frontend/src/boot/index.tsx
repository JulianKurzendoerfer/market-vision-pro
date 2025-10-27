import React from "react";
import {createRoot} from "react-dom/client";
import TrendPanel from "../components/TrendPanel";
function mount(){
  const hostId="mv-trendpanel-root";
  const parent=document.querySelector("main")||document.body;
  let el=document.getElementById(hostId);
  if(!el){el=document.createElement("div");el.id=hostId;parent.appendChild(el);}
  const any=window as any;
  const root=any.__mvTrendRoot||createRoot(el);
  any.__mvTrendRoot=root;
  root.render(<TrendPanel/>);
}
if(typeof document!=="undefined"){window.addEventListener("load",()=>{setTimeout(mount,300);});}
