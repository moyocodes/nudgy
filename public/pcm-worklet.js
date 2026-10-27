// Converts mic audio (already 16 kHz via the AudioContext) to 16-bit PCM chunks.
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buf = []
  }
  process(inputs) {
    const ch = inputs[0][0]
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]))
        this.buf.push(s < 0 ? s * 0x8000 : s * 0x7fff)
      }
      // ~100 ms per chunk at 16 kHz
      if (this.buf.length >= 1600) {
        const out = Int16Array.from(this.buf)
        this.buf = []
        this.port.postMessage(out.buffer, [out.buffer])
      }
    }
    return true
  }
}
registerProcessor('pcm-worklet', PcmWorklet)
