// Soft background music for the rundown, made with Web Audio (no file to load).
// A slow, calm four-chord loop: a quiet pad plus a soft arpeggio. Browsers only let sound start after a
// tap, so startMusic() may begin silent and resumeMusic() is called again on the first tap.
import { getVolume } from './volume.js'

let ctx
let master
let timer

const CHORDS = [
  [261.63, 329.63, 392.0], // C
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 293.66], // G
]
const BEAT = 0.9 // seconds per arpeggio note: slow and calm

function note(freq, at, length, type, volume) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.15)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(gain).connect(master)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

export function startMusic() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    stopMusic()
    master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, ctx.currentTime)
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.35 * getVolume()), ctx.currentTime + 3)
    master.connect(ctx.destination)

    let bar = 0
    let next = ctx.currentTime + 0.1
    // Schedule a bar (8 beats) at a time, a little ahead, so timing stays smooth.
    const schedule = () => {
      while (next < ctx.currentTime + 1) {
        const chord = CHORDS[bar % CHORDS.length]
        chord.forEach((f) => note(f / 2, next, BEAT * 8, 'sine', 0.03))
        // Soft sine arpeggio, every other beat, no octave jumps.
        for (let i = 0; i < 8; i += 2) note(chord[(i / 2) % 3], next + i * BEAT, BEAT * 3, 'sine', 0.035)
        next += BEAT * 8
        bar++
      }
    }
    schedule()
    timer = setInterval(schedule, 250)
  } catch {}
}

export function updateMusicVolume() {
  if (master && ctx) master.gain.setTargetAtTime(Math.max(0.0001, 0.35 * getVolume()), ctx.currentTime, 0.1)
}

export function resumeMusic() {
  if (ctx?.state === 'suspended') ctx.resume()
}

export function stopMusic() {
  clearInterval(timer)
  if (master && ctx) {
    const m = master
    m.gain.cancelScheduledValues(ctx.currentTime)
    m.gain.setValueAtTime(m.gain.value, ctx.currentTime)
    m.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    setTimeout(() => m.disconnect(), 500)
  }
  master = null
}
