export type Strength = "strong" | "weak" | "neutral";
export type Direction = "buy" | "sell" | "neutral";

export type OHLC = {
  time:number[]; open:number[]; high:number[]; low:number[]; close:number[];
};

export type Signal = {
  at:number;
  dir:Direction;
  strength:Strength;
  label:string;
  color:string;
};

export type BBResult = {
  last: Signal | null;
  buyStrong:number[]; buyWeak:number[];
  sellStrong:number[]; sellWeak:number[];
  upper:number[]; middle:number[]; lower:number[];
};
