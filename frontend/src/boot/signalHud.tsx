import React from "react";
import { createRoot } from "react-dom/client";
import BBHud from "../components/BBHud";
function mount(){
  const main = document.querySelector(".js-plotly-plot") as HTMLElement | null;
  const host = (main?.parentElement ?? document.body);
  if (!host) return;
  let hud = document.getElementById("bb-signal-hud");
  if (!hud){
    hud = document.createElement("div");
    hud.id = "bb-signal-hud";
    hud.style.position = "relative";
    host.appendChild(hud);
  }
  const root = (window as any).__bbhud_root || createRoot(hud);
  (window as any).__bbhud_root = root;
  root.render(React.createElement("div",{style:{position:"absolute",inset:0}},
    React.createElement(BBHud,{host: main})
  ));
}
export function initHud(){
  const kick = ()=> mount();
  if (document.readyState === "complete") kick();
  else window.addEventListener("load", kick, {once:true});
}
