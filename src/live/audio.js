export function pcmToBase64(samples) {
  const bytes = new Uint8Array(samples.length * 2), view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i], true);
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodePcm(base64) {
  const binary = atob(base64);
  if (!binary.length || binary.length % 2 || binary.length > 1_000_000) throw new Error('Geçersiz ses paketi.');
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0)), view = new DataView(bytes.buffer), output = new Float32Array(bytes.length / 2);
  for (let i = 0; i < output.length; i++) output[i] = view.getInt16(i * 2, true) / 32768;
  return output;
}
export class PcmPlayer {
  constructor(context, onIdle = () => {}) { this.context = context; this.cursor = 0; this.nodes = new Set(); this.onIdle = onIdle; }
  play(base64, mime = 'audio/pcm;rate=24000') {
    const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000);
    if (![16000, 24000, 48000].includes(rate)) throw new Error('Desteklenmeyen ses hızı.');
    if (this.cursor - this.context.currentTime > 15) throw new Error('Ses bağlantısı yetişemiyor. Yeniden bağlanın.');
    const samples = decodePcm(base64), buffer = this.context.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    const node = this.context.createBufferSource(); node.buffer = buffer; node.connect(this.context.destination);
    this.nodes.add(node); node.onended = () => { node.disconnect(); this.nodes.delete(node); if (!this.nodes.size) this.onIdle(); };
    const start = Math.max(this.cursor, this.context.currentTime + 0.015); this.cursor = start + buffer.duration; node.start(start);
  }
  stop() {
    for (const node of this.nodes) { node.onended = null; try { node.stop(); node.disconnect(); } catch { /* already ended */ } }
    this.nodes.clear(); this.cursor = this.context.currentTime;
  }
}
