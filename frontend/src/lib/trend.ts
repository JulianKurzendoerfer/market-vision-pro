export type Trend = {
  lows: number[];
  highs: number[];
  lvls: number[];
  ct: number[];
  strength: number[];
  now: number;
};
function extremaIdx(a: number[], order = 10) {
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = order; i < a.length - order; i++) {
    let lo = true, hi = true;
    for (let k = 1; k <= order; k++) {
      if (!(a[i] <= a[i - k] && a[i] <= a[i + k])) lo = false;
      if (!(a[i] >= a[i - k] && a[i] >= a[i + k])) hi = false;
      if (!lo && !hi) break;
    }
    if (lo) lows.push(i);
    if (hi) highs.push(i);
  }
  return { lows, highs };
}
export function findTrendLevels(close: number[], order = 10, tol = 0.01, useRelative = true): Trend {
  const n = close.length;
  if (n === 0) return { lows: [], highs: [], lvls: [], ct: [], strength: [], now: 0 };
  const { lows, highs } = extremaIdx(close, order);
  const pts = [...lows.map(i => close[i]), ...highs.map(i => close[i])].sort((a,b)=>a-b);
  const lvls: number[] = [];
  const ct: number[] = [];
  for (const v of pts) {
    if (lvls.length === 0) {
      lvls.push(v); ct.push(1);
    } else {
      const last = lvls[lvls.length - 1];
      const ok = useRelative ? Math.abs(v - last) <= tol * Math.max(1, last) : Math.abs(v - last) <= tol;
      if (ok) {
        const k = lvls.length - 1;
        lvls[k] = (lvls[k] * ct[k] + v) / (ct[k] + 1);
        ct[k] += 1;
      } else {
        lvls.push(v); ct.push(1);
      }
    }
  }
  const minC = Math.min(...ct, 1);
  const maxC = Math.max(...ct, 1);
  const strength = ct.map(c => (c - minC) / Math.max(1e-9, maxC - minC));
  return { lows, highs, lvls, ct, strength, now: close[n - 1] };
}
