import React from "react";
type Props={corner?:"tl"|"tr"|"bl"|"br"};
export default function SignalsHub({corner="tl"}:Props){
  const pos:Record<string,React.CSSProperties>={tl:{top:6,left:8},tr:{top:6,right:8},bl:{bottom:6,left:8},br:{bottom:6,right:8}};
  return <div style={{position:"absolute",zIndex:4,padding:"6px 10px",borderRadius:8,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:12,...pos[corner]}}>Signals ready</div>;
}