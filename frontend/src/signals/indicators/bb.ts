export type BBRes = {
  strongBuy: number[];
  weakBuy: number[];
  strongSell: number[];
  weakSell: number[];
  label: string;
  color: string;
};

function pctNear(a: number, b: number, tol: number) {
  if (!isFinite(a) || !isFinite(b) || b === 0) return false;
  return Math.abs(a - b) / Math.abs(b) <= tol;
}

/**
 * Bollinger-Signale:
 * - strongSell: close >= upper
 * - weakSell:   close nahe upper (<= tol)
 * - strongBuy:  close <= lower
 * - weakBuy:    close nahe lower (<= tol)
 */
export function bbSignal(
  close: number[],
  upper: number[],
  lower: number[],
  tolPct: number = 0.01
): BBRes {
  const strongBuy: number[] = [];
  const weakBuy: number[] = [];
  const strongSell: number[] = [];
  const weakSell: number[] = [];

  const n = Math.min(close.length, upper.length, lower.length);
  for (let i = 0; i < n; i++) {
    const c = close[i];
    const up = upper[i];
    const lo = lower[i];
    if (!isFinite(c) || !isFinite(up) || !isFinite(lo)) continue;

    const nearUp = pctNear(c, up, tolPct);
    const nearLo = pctNear(c, lo, tolPct);

    if (c >= up) {
      strongSell.push(i);
    } else if (nearUp) {
      weakSell.push(i);
    }

    if (c <= lo) {
      strongBuy.push(i);
    } else if (nearLo) {
      weakBuy.push(i);
    }
  }

  let label = "BB: neutral";
  let color = "#666";
  if (n > 0) {
    const c = close[n - 1];
    const up = upper[n - 1];
    const lo = lower[n - 1];
    if (isFinite(c) && isFinite(up) && isFinite(lo)) {
      if (c >= up || pctNear(c, up, tolPct)) {
        label = pctNear(c, up, tolPct) && c < up ? "BB: weak sell" : "BB: strong sell";
        color = "#b91c1c";
      } else if (c <= lo || pctNear(c, lo, tolPct)) {
        label = pctNear(c, lo, tolPct) && c > lo ? "BB: weak buy" : "BB: strong buy";
        color = "#15803d";
      }
    }
  }

  return { strongBuy, weakBuy, strongSell, weakSell, label, color };
}
