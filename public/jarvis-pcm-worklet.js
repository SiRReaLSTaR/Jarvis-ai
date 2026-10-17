// Streaming 16 kHz PCM with a continuous phase accumulator across input blocks.
class JarvisPcm extends AudioWorkletProcessor {
  constructor() { super(); this.phase = 0; this.sum = 0; this.count = 0; this.samples = []; }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) {
      this.sum += sample; this.count++; this.phase += 16000;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        const value = Math.max(-1, Math.min(1, this.sum / this.count));
        this.samples.push(Math.round(value * (value < 0 ? 32768 : 32767))); this.sum = 0; this.count = 0;
        if (this.samples.length === 320) { const packet = Int16Array.from(this.samples); this.port.postMessage(packet, [packet.buffer]); this.samples = []; }
      }
    }
    return true;
  }
}
registerProcessor('jarvis-pcm', JarvisPcm);
