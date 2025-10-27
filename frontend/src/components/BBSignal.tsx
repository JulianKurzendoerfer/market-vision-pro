import React,{useEffect,useState} from "react"
import { computeBBSignal } from "../lib/signals/bb"
export default function BBSignal(){
  const [sig,setSig]=useState({label:"BB: neutral", bg:"#6b7280", fg:"#ffffff"})
  useEffect(()=>{ 
    const run=()=>{ 
      const el=document.querySelector(".js-plotly-plot") as any
      if(!el) return
      const data:any[]=(el._fullData||el.data||[])
      let tr:any=data.find(t=>String(t?.name||"").toLowerCase().includes("close"))||data.find(t=>t?.y&&t?.mode==="lines")
      if(!tr?.y) return
      const close=(tr.y as any[]).map((v:any)=>Number(v)).filter((v:any)=>isFinite(v))
      const r=computeBBSignal(close)
      setSig(r)
    }
    run()
    const id=setInterval(run,1200)
    window.addEventListener("resize",run)
    return ()=>{ clearInterval(id); window.removeEventListener("resize",run) }
  },[])
  return (
    <div style={{position:"absolute",left:8,top:8,padding:"2px 10px",fontSize:12,borderRadius:8,
                 backgroundColor:sig.bg,color:sig.fg,border:"1px solid rgba(0,0,0,0.2)",pointerEvents:"none",zIndex:40}}>
      {sig.label}
    </div>
  )
}
