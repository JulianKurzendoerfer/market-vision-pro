export const API = import.meta.env.VITE_API_BASE ?? ''
export async function getJSON(path: string){
  const url = `${API}${path}`
  const res = await fetch(url)
  const ct = res.headers.get('content-type') || ''
  if(!res.ok) throw new Error(`HTTP ${res.status}`)
  if(!ct.includes('application/json')) throw new Error(`Kein JSON: ${ct}`)
  return res.json()
}
