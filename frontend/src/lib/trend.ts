export type TrendInput = {
  time: number[];
  close: number[];
  high: number[];
  low: number[];
};

function extrema(vals: number[], win = 10) {
  const n = vals.length;
  const lowsIdx: number[] = [];
  const highsIdx: number[] = [];
  for (let i = win; i < n - win; i++) {
    let isLow = true, isHigh = true;
    for (let k = i - win; k <= i + win; k++) {
      if (vals[k] < vals[i]) isLow = false;
      if (vals[k] > vals[i]) isHigh = false;
      if (!isLow && !isHigh) break;
    }
    if (isLow) lowsIdx.push(i);
    if (isHigh) highsIdx.push(i);
  }
  return { lowsIdx, highsIdx };
}

function clusterLevels(values: number[], tol = 0.01) {
  if (!values.length) return [] as number[];
  const v = values.slice().sort((a, b) => a - b);
  const out: number[] = [];
  let acc: number[] = [v[0]];
  for (let i = 1; i < v.length; i++) {
    const last = acc[acc.length - 1];
    const ok = Math.abs(v[i] - last) <= tol * Math.max(1, Math.abs(last));
    if (ok) acc.push(v[i]);
    else {
      out.push(acc.reduce((s, x) => s + x, 0) / acc.length);
      acc = [v[i]];
    }
  }
  out.push(acc.reduce((s, x) => s + x, 0) / acc.length);
  return out;
}

export function computeTrend(ohlc: TrendInput, win = 10, tol = 0.01) {
  const c = (ohlc?.close || []).map(Number);
  const t = (ohlc?.time || []).slice();
  const h = (ohlc?.high || []).map(Number);
  const l = (ohlc?.low || []).map(Number);
  const n = Math.min(c.length, t.length);
  const cc = c.slice(0, n);
  const tt = t.slice(0, n);
  const { lowsIdx, highsIdx } = extrema(cc, win);
  const lowVals = lowsIdx.map(i => cc[i]);
  const highVals = highsIdx.map(i => cc[i]);
  const levels = clusterLevels(lowVals.concat(highVals), tol);
  return { time: tt, close: cc, lowsIdx, highsIdx, levels };
}
