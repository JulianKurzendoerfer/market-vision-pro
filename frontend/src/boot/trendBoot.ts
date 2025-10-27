import {createRoot} from 'react-dom/client';
import TrendPanel from '../components/TrendPanel';
declare global{interface Window{__mv_trend_boot?:boolean}}
function hideHighLow(gd:any){try{if(!gd||!gd.data)return;const idx:number[]=[];gd.data.forEach((t:any,i:number)=>{const n=(t.name||'').toString().toLowerCase();const sym=(t.marker&&t.marker.symbol)||'';if(n==='highs'||n==='lows'||sym==='triangle-up'||sym==='triangle-down') idx.push(i);}); if(idx.length)(window as any).Plotly.restyle(gd,{visible:false}, idx);}catch(_){}} 
function mount(){if(window.__mv_trend_boot) return; window.__mv_trend_boot=true; const main=document.querySelector('main')||document.body; let host=document.getElementById('mv-trendpanel-root'); if(!host){host=document.createElement('div');host.id='mv-trendpanel-root';main.appendChild(host);} const root=(host as any).__root||(host && createRoot(host)); (host as any).__root=root; root.render(<TrendPanel/>); const gd=document.querySelector('.js-plotly-plot') as any; if(gd&& (window as any).Plotly) hideHighLow(gd);}
if(document.readyState==='complete') setTimeout(mount,0); else window.addEventListener('load',()=>setTimeout(mount,0));
window.addEventListener('resize',()=>setTimeout(mount,100));
