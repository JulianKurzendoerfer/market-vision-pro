export function ema(a:number[], n:number){
  const out=Array(a.length).fill(NaN);
  if(n<=0||!a.length) return out;
  const k=2/(n+1);
  let e=a[0];
  for(let i=0;i<a.length;i++){
    if(i===0){out[i]=a[i];e=a[i];continue;}
    e=a[i]*k+e*(1-k);
    out[i]=e;
  }
  return out;
}
