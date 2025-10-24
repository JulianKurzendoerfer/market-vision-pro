export const COLORS = {
  rsi: "#e53935",
  macdUp: "#e53935",
  macdDown: "#43a047",
  macdLine: "#ff9100",
  macdSignal: "#00b0ff",
  bbUpper: "#e53935",
  bbLower: "#43a047",
  bbBasis: "#9e9e9e",
  candleUp: "#00e676",
  candleDown: "#ff1744"
};

export async function applyTheme(gd:any){
  if(!gd || !gd.data || !gd.layout) return;
  const d = gd.data;

  for (const t of d){
    if (t.type === "candlestick"){
      t.increasing = t.increasing || {};
      t.decreasing = t.decreasing || {};
      t.increasing.line = Object.assign({}, t.increasing.line, {color: COLORS.candleUp, width: 1.6});
      t.increasing.fillcolor = COLORS.candleUp;
      t.decreasing.line = Object.assign({}, t.decreasing.line, {color: COLORS.candleDown, width: 1.6});
      t.decreasing.fillcolor = COLORS.candleDown;
      t.opacity = 0.95;
      continue;
    }

    const name = (t.name||"").toLowerCase();

    if (name === "rsi"){
      t.line = Object.assign({}, t.line, {color: COLORS.rsi, width: 2});
    }

    if (name === "bb upper"){
      t.line = Object.assign({}, t.line, {color: COLORS.bbUpper, width: 1.6});
    }
    if (name === "bb lower"){
      t.line = Object.assign({}, t.line, {color: COLORS.bbLower, width: 1.6});
    }
    if (name === "bb basis" || name === "bb basis"){
      t.line = Object.assign({}, t.line, {color: COLORS.bbBasis, width: 1.2, dash: "dot"});
    }

    if (name === "macd"){
      t.line = Object.assign({}, t.line, {color: COLORS.macdLine, width: 2});
    }
    if (name === "signal"){
      t.line = Object.assign({}, t.line, {color: COLORS.macdSignal, width: 2});
    }
    if (name === "hist" && Array.isArray(t.y)){
      t.marker = t.marker || {};
      t.marker.color = (t.y as number[]).map(v => v >= 0 ? COLORS.macdUp : COLORS.macdDown);
      t.opacity = 0.95;
    }
  }

  gd.layout.showlegend = false;
  // minimal grid/bg contrast
  gd.layout.paper_bgcolor = gd.layout.paper_bgcolor || "#0e1320";
  gd.layout.plot_bgcolor  = gd.layout.plot_bgcolor  || "#0e1320";
  (gd.layout as any).font = Object.assign({}, (gd.layout as any).font, {color:"#e9eefb"});

  // re-render with theme applied
  const Plotly = (await import("plotly-js-dist-min")).default || (await import("plotly-js-dist-min"));
  await Plotly.react(gd, d, gd.layout);
}
