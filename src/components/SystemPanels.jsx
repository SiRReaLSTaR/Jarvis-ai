// Sohbet görünümündeki yan paneller. Yalnızca uygulamanın bildiği gerçek durumu gösterir;
// sahte metrik veya tehdit skoru üretmez.
const AGENT_LABEL = { jarvis: 'DİLAN', atlas: 'LARA', nexus: 'VERA' };

export default function SystemPanels({ state, system, connected, liveActive, activeTask }) {
  const memory = state?.memory || {};
  const memoryCount = Object.values(memory).reduce((n, items) => n + items.length, 0);
  const categories = Object.keys(memory).length;
  const agents = system?.agents || {};
  const configured = Object.values(agents).filter(agent => agent.configured).length;
  const total = Object.keys(AGENT_LABEL).length;
  const lastSuccess = system?.lastSuccess ? new Date(system.lastSuccess).toLocaleTimeString('tr-TR') : 'Henüz yok';
  const accessKeySet = Boolean(sessionStorage.getItem('jarvis-access'));

  return <div className="sysPanels" aria-label="Sistem durumu">
    <section className="sysPanel" aria-labelledby="sys-net">
      <h4 id="sys-net">AĞ</h4>
      <p><span className={`sysDot ${connected ? 'on' : ''}`} aria-hidden="true"/>{connected ? 'Sunucuya bağlı' : 'Bağlanıyor'}</p>
      <p>Son başarılı yanıt: <b>{lastSuccess}</b></p>
      <p>Canlı ses: <b>{liveActive ? 'açık' : 'kapalı'}</b></p>
      <p>Görev: <b>{activeTask ? 'çalışıyor' : 'yok'}</b></p>
    </section>

    <section className="sysPanel" aria-labelledby="sys-mem">
      <h4 id="sys-mem">HAFIZA</h4>
      <p>Kayıt: <b>{memoryCount}</b></p>
      <p>Kategori: <b>{categories}</b></p>
      <p>Görevler: <b>{state?.tasks?.length || 0}</b> kayıtlı</p>
    </section>

    <section className="sysPanel" aria-labelledby="sys-sec">
      <h4 id="sys-sec">GÜVENLİK</h4>
      <p>Anahtarlar: <b>{configured}/{total}</b> ajan hazır</p>
      {Object.entries(AGENT_LABEL).map(([id, name]) => <p key={id}>{name}: <b>{agents[id]?.configured ? 'hazır' : 'anahtar yok'}</b></p>)}
      <p>Erişim anahtarı: <b>{accessKeySet ? 'girildi' : 'girilmedi'}</b></p>
      <p>Dosya ve terminal işlemi: <b>{system?.executionEnabled ? 'açık' : 'kapalı'}</b></p>
    </section>
  </div>;
}
