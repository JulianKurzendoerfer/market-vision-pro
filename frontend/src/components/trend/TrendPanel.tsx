'use client';
import { useEffect, useMemo, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, LineData, SeriesMarker, Time } from 'lightweight-charts';
import { findTrendLevels } from '../../lib/trend';
type Props = {
  times: (number|string|Time)[];
  close: number[];
  height?: number;
  order?: number;
  tol?: number;
  useRelative?: boolean;
};
export default function TrendPanel({ times, close, height=220, order=10, tol=0.01, useRelative=true }: Props) {
  const ref = useRef<HTMLDivElement|null>(null);
  const data: LineData[] = useMemo(()=> times.map((t,i)=>({ time: t as Time, value: close[i] })), [times, close]);
  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#111' },
      grid: { vertLines: { color: 'rgba(0,0,0,0.06)' }, horzLines: { color: 'rgba(0,0,0,0.06)' } },
      rightPriceScale: { borderColor: 'rgba(0,0,0,0.2)' },
      timeScale: { borderColor: 'rgba(0,0,0,0.2)' },
      crosshair: { mode: 1 },
    });
    const series: ISeriesApi<'Line'> = chart.addLineSeries({ color: '#1f78ff', lineWidth: 2 });
    series.setData(data);
    const trend = findTrendLevels(close, order, tol, useRelative);
    trend.lvls.forEach((lvl, idx) => {
      const w = 1.5 + 3 * trend.strength[idx];
      const c = `rgba(${Math.round(255*(1-trend.strength[idx]))},${Math.round(90+120*trend.strength[idx])},255,0.9)`;
      series.createPriceLine({ price: lvl, color: c, lineWidth: Math.max(1, Math.min(5, Math.round(w))), lineStyle: 2, axisLabelVisible: true, title: `${lvl.toFixed(2)} (${trend.ct[idx]})` });
    });
    const markers: SeriesMarker<Time>[] = [];
    trend.lows.forEach(i => { if (data[i]) markers.push({ time: data[i].time, position: 'belowBar', color: '#2ecc71', shape: 'arrowUp', text: 'Low' }); });
    trend.highs.forEach(i => { if (data[i]) markers.push({ time: data[i].time, position: 'aboveBar', color: '#e74c3c', shape: 'arrowDown', text: 'High' }); });
    series.setMarkers(markers);
    const ro = new ResizeObserver(entries => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [ref, data, height, order, tol, useRelative, close]);
  return <div style={{ width: '100%', height }} ref={ref} />;
}
