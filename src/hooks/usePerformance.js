import { useEffect, useState } from 'react';
export function usePerformance() {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('jarvis-quality') || 'auto'; } catch { return 'auto'; } });
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const update = () => setReduced(query.matches || Boolean(connection?.saveData));
    update(); query.addEventListener('change', update); connection?.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); connection?.removeEventListener('change', update); };
  }, []);
  return { mode, effective: mode === 'performance' || mode === 'auto' && reduced ? 'performance' : 'quality', setMode(value) {
    if (!['auto', 'quality', 'performance'].includes(value)) return;
    setMode(value); try { localStorage.setItem('jarvis-quality', value); } catch { /* session-only preference */ }
  } };
}
