// Only explicitly configured light/switch entities are reachable; no arbitrary service calls.
export function createHome({ url = process.env.HOME_ASSISTANT_URL, token = process.env.HOME_ASSISTANT_TOKEN, entities = process.env.HA_ENTITIES || '', fetcher = fetch } = {}) {
  const allowed = new Map(entities.split(',').map(x => x.trim().split('=')).filter(([label, id]) => label && /^(light|switch)\.[a-z0-9_]+$/.test(id)));
  const enabled = Boolean(url && token && allowed.size);
  async function request(path, options = {}) {
    const response = await fetcher(`${url.replace(/\/$/, '')}/api/${path}`, { ...options, signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Home Assistant yanıt vermedi.');
    return response.json();
  }
  async function state() {
    if (!enabled) return { enabled: false, devices: [] };
    const results = await Promise.all([...allowed].map(async ([label, id]) => {
      try { const value = await request(`states/${id}`); return { label, id, state: value.state, available: ['on', 'off'].includes(value.state) }; }
      catch { return { label, id, state: 'unavailable', available: false }; }
    }));
    return { enabled: true, devices: results };
  }
  return { enabled, state, async control(id, on) {
    if (!enabled || ![...allowed.values()].includes(id) || typeof on !== 'boolean') throw new Error('İzin verilmeyen cihaz işlemi.');
    await request(`services/${id.split('.')[0]}/${on ? 'turn_on' : 'turn_off'}`, { method: 'POST', body: JSON.stringify({ entity_id: id }) });
    return state(); // Report observed device state, never a simulated success.
  } };
}
