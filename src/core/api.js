const memoryBridge = { ready:false, pending:Promise.resolve() }
function authHeaders(){ return { 'Content-Type':'application/json', ...(sessionStorage.getItem('jarvis-access') ? {Authorization:`Bearer ${sessionStorage.getItem('jarvis-access')}`} : {}) } }
async function api(path, options={}) {
  const response = await fetch(path, {...options, headers:authHeaders()})
  const data = await response.json()
  if(!response.ok) throw new Error(data.error || 'Bağlantı hatası')
  return data
}

export { memoryBridge, api }
