export type Strength="strong"|"weak"|"neutral";
export type Direction="buy"|"sell"|"neutral";
export type Signal={indicator:string;direction:Direction;strength:Strength;reason:string;confidence:number;at:number};
export type OHLC={time:number[];close:number[];high:number[];low:number[]};
