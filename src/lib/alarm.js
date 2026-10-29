// A short alarm chime, made with Web Audio so there's no sound file to load.
// Browsers only allow sound after the user has interacted with the page once; before that it stays quiet.
import { getVolume } from './volume.js'

let ctx

// How long the chime lasts, so the voice can wait for it instead of talking over it.
export const ALARM_MS = 1500

// Audio has to be started from a tap. Only called when the user allows the alarm, never behind their back.
export function unlockAlarm() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {}
}

// Returns true if the chime played.
export function playAlarm() {
  if (getVolume() <= 0) return false
  try {
    unlockAlarm()
    if (ctx.state !== 'running') return false
    const start = ctx.currentTime
    // Three rising beeps, twice.
    ;[0, 0.18, 0.36, 0.9, 1.08, 1.26].forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = [880, 988, 1175][i % 3]
      gain.gain.setValueAtTime(0.0001, start + t)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.25 * getVolume()), start + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + t + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start + t)
      osc.stop(start + t + 0.17)
    })
    return true
  } catch {
    return false
  }
}
