export function rsi(c:number[], n=14){
  const out=Array(c.length).fill(NaN);
  if(c.length<n+1) return out;
  let gain=0,loss=0;
  for(let i=1;i<=n;i++){
    const d=c[i]-c[i-1];
    gain+=Math.max(d,0);
    loss+=Math.max(-d,0);
  }
  gain/=n; loss/=n;
  out[n]=100-(100/(1+(loss===0?Infinity:gain/loss)));
  const k=1/n;
  for(let i=n+1;i<c.length;i++){
    const d=c[i]-c[i-1];
    const g=Math.max(d,0), l=Math.max(-d,0);
    gain=(gain*(n-1)+g)/n;
    loss=(loss*(n-1)+l)/n;
    const rs=(loss===0?Infinity:gain/loss);
    out[i]=100-(100/(1+rs));
  }
  return out;
}
