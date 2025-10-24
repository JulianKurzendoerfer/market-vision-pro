export const COLORS:any = {
  rsi: "#ff3b3b",
  macdUp: "#ff3b3b",
  macdDown: "#2ecc71",
  macdLine: "#1f9100",
  macdSignal: "#0080ff",
  bbUpper: "#ff3935",
  bbLower: "#49a947",
  bbBasis: "#9e90e9",
  candleUp: "#00e067",
  candleDown: "#ff1744",
};

function lastAxisRef(gd:any):string{
  let max = 1;
  for(const k of Object.keys(gd.layout||{})){
    if(!k.startsWith("yaxis")) continue;
    const n = k === "yaxis" ? 1 : parseInt(k.slice(5),10);
    if(n>max) max = n;
  }
  return max === 1 ? "y" : ("y"+max);
}

export async function applyTheme(gd:any){
  if(!gd || !gd.data || !gd.layout) return;
  const data:any[] = gd.data;

  gd.layout.showlegend = false;
  gd.layout.paper_bgcolor = "#ffffff";
  gd.layout.plot_bgcolor  = "#ffffff";

  const lastRef = lastAxisRef(gd);

  for(const t of data){
    const name = String(t.name||"").toLowerCase();

    if(t.type === "candlestick"){
      t.increasing = t.increasing || {};
      t.decreasing = t.decreasing || {};
      t.increasing.line = Object.assign({}, t.increasing.line, {color: COLORS.candleUp});
      t.decreasing.line = Object.assign({}, t.decreasing.line, {color: COLORS.candleDown});
      t.increasing.fillcolor = COLORS.candleUp;
      t.decreasing.fillcolor = COLORS.candleDown;
      t.opacity = 0.95;
      continue;
    }

    if(name.includes("rsi")){
      t.line = Object.assign({}, t.line, {color: COLORS.rsi, width: 2});
      continue;
    }

    if(name.includes("hist")){
      const yy = Array.isArray(t.y) ? t.y : [];
      t.type = "bar";
      t.marker = t.marker || {};
      t.marker.color = yy.map((v:number)=> (v>=0 ? COLORS.macdUp : COLORS.macdDown));
      continue;
    }

    if(name === "macd"){
      t.line = Object.assign({}, t.line, {color: COLORS.macdLine, width: 2});
      continue;
    }

    if(name.includes("signal")){
      t.line = Object.assign({}, t.line, {color: COLORS.macdSignal, width: 2});
      continue;
    }

    if(name.includes("bb upper")){
      t.line = Object.assign({}, t.line, {color: COLORS.bbUpper, width: 2});
      continue;
    }
    if(name.includes("bb lower")){
      t.line = Object.assign({}, t.line, {color: COLORS.bbLower, width: 2});
      continue;
    }
    if(name.includes("bb basis") || name === "bb"){
      t.line = Object.assign({}, t.line, {color: COLORS.bbBasis, width: 2});
      continue;
    }

    if(/^(high|low)$/.test(name) || name.includes("pivot")){
      t.yaxis = lastRef;
      t.marker = Object.assign({size: 6}, t.marker||{});
      continue;
    }
  }

  (window as any).Plotly && (window as any).Plotly.redraw(gd);
}
