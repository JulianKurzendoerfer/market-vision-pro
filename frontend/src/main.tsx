
import React from "react";
import { createRoot } from "react-dom/client";

const el = document.getElementById("root")!;
async function boot(){
  let App: any;
  try {
    const mod = await import("./components/ChartDashboard");
    App = mod.default ?? (()=>null);
  } catch {
    App = () => <div style={{padding:16,fontFamily:"system-ui"}}>App läuft – ChartDashboard.tsx nicht gefunden.</div>;
  }
  createRoot(el).render(<React.StrictMode><App/></React.StrictMode>);
}
boot();
