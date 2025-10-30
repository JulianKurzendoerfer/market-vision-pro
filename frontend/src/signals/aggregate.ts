import { OHLC, Signal } from "./types";
import { bollinger, bbSignal } from "./indicators/bb";
export function computeSignals(ohlc:OHLC):Signal[]{
  const bb=bollinger(ohlc.close,{});
  const s1=bbSignal(ohlc.time,ohlc.close,bb.up,bb.lo);
  return [s1];
}
export * from "./types";
