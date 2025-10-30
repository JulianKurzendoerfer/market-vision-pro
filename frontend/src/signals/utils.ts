export function near(a:number,b:number,tol:number){return Math.abs(a-b)<=Math.max(1e-9,tol*Math.max(Math.abs(a),Math.abs(b))); }
export function sma(x:number[],w:number){const n=x.length;const r=new Array(n).fill(NaN);if(w<=0||n===0)return r;let s=0;for(let i=0;i<n;i++){s+=x[i];if(i>=w)s-=x[i-w];if(i>=w-1)r[i]=s/w;}return r;}
export function rollingStd(x:number[],w:number){const n=x.length;const r=new Array(n).fill(NaN);if(w<=1||n===0)return r;let s=0,s2=0;for(let i=0;i<n;i++){const v=x[i];s+=v;s2+=v*v;if(i>=w){const o=x[i-w];s-=o;s2-=o*o;}if(i>=w-1){const m=s/w;const v2=s2/w-m*m;r[i]=Math.sqrt(Math.max(0,v2));}}return r;}
export function last<T>(a:T[]){return a[a.length-1];}
