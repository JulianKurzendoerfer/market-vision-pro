export type Strength="strong"|"weak"|"neutral";
export type Direction="buy"|"sell"|"neutral";
export type Signal={at:number;dir:Direction;strength:Strength;label:string;color:string}|null;
export type OHLC={time:number[];open:number[];high:number[];low:number[];close:number[]};
