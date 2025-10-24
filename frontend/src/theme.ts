export const COLORS = {
  rsi: '#ff3b3b',
  macdUp: '#5a9355',
  macdDown: '#4a0a27',
  macdLine: '#1ff100',
  macdSignal: '#0080ff',
  bbUpper: '#e53935',
  bbLower: '#4aa047',
  bbBasis: '#9e9e9e',
  candleUp: '#00e676',
  candleDown: '#ff1744',
};

export async function applyTheme(gd:any){
  if(!gd || !gd.data || !gd.layout) return;
  const d:any[] = gd.data;

  (gd as any).showlegend = false;

  Object.assign(gd.layout, {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    xaxis: { gridcolor:'#eaeaea', zerolinecolor:'#eaeaea' },
    yaxis: { gridcolor:'#eaeaea', zerolinecolor:'#eaeaea' }
  });

  for (const t of d){
    const name = (t.name||'').toLowerCase();

    if (t.type === 'candlestick'){
      t.increasing = t.increasing || {};
      t.decreasing = t.decreasing || {};
      t.increasing.line = Object.assign({}, t.increasing.line, {color: COLORS.candleUp});
      t.decreasing.line = Object.assign({}, t.decreasing.line, {color: COLORS.candleDown});
      t.opacity = 0.95;
      continue;
    }

    if (name === 'rsi'){
      t.line = Object.assign({}, t.line, {color: COLORS.rsi, width: 2.2});
      continue;
    }

    if (name === 'macd'){
      t.line = Object.assign({}, t.line, {color: COLORS.macdLine});
      continue;
    }
    if (name === 'signal'){
      t.line = Object.assign({}, t.line, {color: COLORS.macdSignal});
      continue;
    }

    if (name.includes('bb upper'))  { t.line = Object.assign({}, t.line, {color: COLORS.bbUpper}); continue; }
    if (name.includes('bb lower'))  { t.line = Object.assign({}, t.line, {color: COLORS.bbLower}); continue; }
    if (name.includes('bb basis') || name === 'bb'){
      t.line = Object.assign({}, t.line, {color: COLORS.bbBasis, dash: 'dot'}); continue;
    }
  }
}
