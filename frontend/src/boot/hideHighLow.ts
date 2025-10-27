import Plotly from"plotly.js-dist-min";
function strip(){
  const nodes=document.querySelectorAll(".js-plotly-plot");
  nodes.forEach((gd:any)=>{
    const d:any[]=gd?.data||gd?._fullData||[];
    const idx:number[]=[];
    d.forEach((tr:any,i:number)=>{
      const name=String(tr?.name||"").toLowerCase();
      const sym=String(tr?.marker?.symbol||"").toLowerCase();
      const isMarker=String(tr?.mode||"").includes("markers");
      if(isMarker&&((name.includes("highs")||name.includes("lows"))||(sym.includes("triangle-up")||sym.includes("triangle-down")))) idx.push(i);
    });
    if(idx.length) Plotly.restyle(gd,{visible:false},idx);
  });
}
if(typeof document!=="undefined"){window.addEventListener("load",()=>{strip();setTimeout(strip,300);});window.addEventListener("resize",()=>setTimeout(strip,200));setInterval(strip,1200);}
export {};
