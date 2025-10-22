import { useEffect, useState } from 'react'
import { getJSON } from './lib/api'
const intervals = ['5m','1h','1d'] as const
export default function App(){
  const [ticker,setTicker] = useState('AAPL')
  const [interval,setIntervalVal] = useState<(typeof intervals)[number]>('1d')
  const [data,setData] = useState<any>(null)
  const [err,setErr] = useState(''); const [loading,setLoading] = useState(false)
  async function load(){
    setLoading(true); setErr(''); setData(null)
    try{ setData(await getJSON(`/v1/indicators?ticker=${encodeURIComponent(ticker)}&interval=${encodeURIComponent(interval)}`)) }
    catch(e:any){ setErr(String(e?.message??e)) }
    finally{ setLoading(false) }
  }
  useEffect(()=>{ load() },[ticker,interval])
  return (
    <div style={{padding:16,maxWidth:1200,margin:'0 auto',fontFamily:'system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif'}}>
      <h1 style={{margin:'8px 0 16px'}}>Market Vision Pro</h1>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16}}>
        <label>Ticker:</label>
        <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} style={{padding:'8px 10px'}} />
        <select value={interval} onChange={e=>setIntervalVal(e.target.value as any)} style={{padding:'8px 10px'}}>
          {intervals.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <button onClick={load} style={{padding:'8px 12px'}}>Refresh</button>
        {loading && <span>lädt…</span>}
      </div>
      {err && <div style={{color:'red',marginBottom:12}}>{err}</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {(data?.boxes ?? []).map((b:any)=>(
          <div key={b.id} style={{border:'1px solid #eee',padding:12,borderRadius:8}}>
            <div style={{fontWeight:600,marginBottom:6}}>{b.label}</div>
            <div>{b.value === null ? '—' : String(b.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
