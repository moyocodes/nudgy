// Ambient background sounds (rain, fire, waves), made from filtered noise with Web Audio, so no files.
// Plays across the whole app until switched off. Browsers need one tap before sound can start.
let ctx
let out
let nodes = []
let timers = []

function noiseBuffer(kind) {
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    // Brown noise (deep rumble) for fire and waves; white for rain.
    last = kind === 'white' ? white : (last + 0.02 * white) / 1.02
    data[i] = kind === 'white' ? white : last * 3.5
  }
  return buf
}

function loop(kind) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(kind)
  src.loop = true
  src.start()
  nodes.push(src)
  return src
}

function chain(...ns) {
  ns.reduce((a, b) => a.connect(b))
  nodes.push(...ns)
  return ns[ns.length - 1]
}

// Short random pops: raindrops or fire crackles.
function pops({ every, freq, length, volume }) {
  const tick = () => {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq * (0.6 + Math.random() * 0.8)
    g.gain.setValueAtTime(volume * Math.random(), t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + length + 0.02)
    timers.push(setTimeout(tick, every * (0.3 + Math.random() * 1.4)))
  }
  tick()
}

const SOUNDS = {
  rain() {
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.6
    const g = ctx.createGain()
    g.gain.value = 0.25
    chain(loop('white'), filter, g).connect(out)
    pops({ every: 90, freq: 2500, length: 0.03, volume: 0.05 })
  },
  fire() {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 500
    const g = ctx.createGain()
    g.gain.value = 0.5
    chain(loop('brown'), filter, g).connect(out)
    pops({ every: 180, freq: 1800, length: 0.02, volume: 0.12 })
  },
  waves() {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const g = ctx.createGain()
    g.gain.value = 0.3
    // A slow swell, roughly one wave every 8 seconds.
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 0.12
    depth.gain.value = 0.25
    lfo.connect(depth).connect(g.gain)
    lfo.start()
    nodes.push(lfo, depth)
    chain(loop('brown'), filter, g).connect(out)
  },
}

export const AMBIENT_SOUNDS = [['rain', '🌧️', 'Rain'], ['fire', '🔥', 'Fire'], ['waves', '🌊', 'Waves']]

export function playAmbient(kind, volume = 0.5) {
  stopAmbient()
  if (!SOUNDS[kind]) return
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, ctx.currentTime)
    out.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + 1.5)
    out.connect(ctx.destination)
    SOUNDS[kind]()
  } catch {}
}

export function setAmbientVolume(volume) {
  if (out && ctx) out.gain.setTargetAtTime(Math.max(0.0001, volume), ctx.currentTime, 0.1)
}

export function resumeAmbient() {
  if (ctx?.state === 'suspended') ctx.resume()
}

export function stopAmbient() {
  timers.forEach(clearTimeout)
  timers = []
  nodes.forEach((n) => { try { n.stop?.() } catch {} try { n.disconnect() } catch {} })
  nodes = []
  try { out?.disconnect() } catch {}
  out = null
}
