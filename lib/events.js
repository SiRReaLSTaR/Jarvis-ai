// Authenticated fetch-based SSE: credentials never appear in URLs.
export function createEventHub({ maxClients = 12 } = {}) {
  const clients = new Set();
  function publish(type, data) {
    const line = `data: ${JSON.stringify({ type, data })}\n\n`;
    for (const res of clients) {
      if (res.destroyed || res.writableLength > 2_000_000) { res.destroy(); clients.delete(res); continue; }
      res.write(line);
    }
  }
  return {
    publish,
    get size() { return clients.size; },
    connect(req, res) {
      if (clients.size >= maxClients) return res.status(429).json({ error: 'En fazla 12 ekran bağlanabilir.' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      publish('presence', { screens: clients.size });
      const timer = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
      timer.unref();
      req.on('close', () => { clearInterval(timer); clients.delete(res); publish('presence', { screens: clients.size }); });
    },
    close() { for (const res of clients) res.end(); clients.clear(); },
  };
}
