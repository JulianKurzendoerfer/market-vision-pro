import React, { useMemo } from "react";

type OhlcLike = { close: number[] };
type Props = {
  close?: number[];
  ohlc?: OhlcLike;
  win?: number;
  k?: number;
  tolerancePct?: number;
  style?: React.CSSProperties;
};

function rollingStd(v: number[], w: number) {
  const out: number[] = [];
  let sum = 0, sumsq = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    sum += x; sumsq += x * x;
    if (i >= w) { const y = v[i - w]; sum -= y; sumsq -= y * y; }
    if (i >= w - 1) {
      const n = w, mean = sum / n;
      const variance = Math.max(0, sumsq / n - mean * mean);
      out.push(Math.sqrt(variance));
    } else out.push(NaN);
  }
  return out;
}

function computeBB(close: number[], win: number, k: number) {
  const up: number[] = [], lo: number[] = [];
  let sum = 0; const stdev = rollingStd(close, win);
  for (let i = 0; i < close.length; i++) {
    sum += close[i]; if (i >= win) sum -= close[i - win];
    const mean = i >= win - 1 ? sum / win : NaN;
    if (Number.isFinite(mean) && Number.isFinite(stdev[i])) {
      up.push(mean + k * stdev[i]); lo.push(mean - k * stdev[i]);
    } else { up.push(NaN); lo.push(NaN); }
  }
  return { up, lo };
}

export default function BBSignal({
  close, ohlc, win = 20, k = 2, tolerancePct = 0.01, style,
}: Props) {
  const series = close ?? ohlc?.close ?? [];
  const { label, bg, fg } = useMemo(() => {
    if (!series.length) return { label: "BB: neutral", bg: "#666", fg: "#fff" };
    const bb = computeBB(series, win, k);
    const c = series[series.length - 1];
    const up = bb.up[bb.up.length - 1];
    const lo = bb.lo[bb.lo.length - 1];
    if (!Number.isFinite(c) || !Number.isFinite(up) || !Number.isFinite(lo))
      return { label: "BB: neutral", bg: "#666", fg: "#fff" };
    const nearUp = Math.abs(c - up) / up <= tolerancePct;
    const nearLo = Math.abs(c - lo) / lo <= tolerancePct;
    if (c >= up)  return { label: "BB: STRONG SELL", bg: "#e11d48", fg: "#fff" };
    if (nearUp)   return { label: "BB: SELL",        bg: "#f43f5e", fg: "#fff" };
    if (c <= lo)  return { label: "BB: STRONG BUY",  bg: "#16a34a", fg: "#fff" };
    if (nearLo)   return { label: "BB: BUY",         bg: "#22c55e", fg: "#0a0a0a" };
    return { label: "BB: neutral", bg: "#666", fg: "#fff" };
  }, [series, win, k, tolerancePct]);

  return (
    <div style={{
      position:"absolute", top:8, left:8, padding:"6px 10px", borderRadius:8,
      fontSize:12, fontWeight:600, background:bg, color:fg,
      boxShadow:"0 2px 8px rgba(0,0,0,.15)", userSelect:"none", pointerEvents:"none",
      ...style
    }}>
      {label}
    </div>
  );
}
