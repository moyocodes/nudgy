// Making a poke: ask the server for a model-written line, fall back to a canned one.
// When pokes are due: dated tasks at their due time, then faster and faster until Done or Snooze
// (the tone tops out at level 4); undated tasks once a day at check-in. Sleep hours and snoozes are respected.
import { canPoke } from './schedule.js'

export const MAX_LEVEL = 4
// Ignored pokes come faster: 10 min after the first, then every 5 until Done or Snooze.
const REPOKE_MS = [10, 5].map((m) => m * 60 * 1000)
const repokeAfter = (count) => REPOKE_MS[Math.min(count - 1, REPOKE_MS.length - 1)]
// Only the first few pokes per task are model-written; after that the stern canned lines rotate (no cost).
export const MODEL_POKES = 3
// Each poke from the third one on costs coins: ignoring Pokey isn't free.
export const IGNORE_COST = 2

const BACKUP_LINES = {
  1: (n, t) => `${n}, "${t}" is coming up. Future you says thanks in advance.`,
  2: (n, t) => `${n}, "${t}" is aging like milk. Shall we?`,
  3: (n, t) => `${n}, I've poked you three times. I'm basically a woodpecker now. ${t}.`,
  4: (n, t) => `${n}. ${n.toUpperCase()}. "${t}" has filed a missing person report.`,
}
const SHOVES = [
  (n, t) => `${n}, "${t}". Now. I'm charging coins for every poke you ignore.`,
  (n, t) => `Still waiting on "${t}", ${n}. My finger is getting tired and your coins are getting fewer.`,
  (n, t) => `${n}! "${t}"! Done or Snooze. Pick one. I'll wait. Ten minutes, to be exact.`,
  (n, t) => `"${t}" called. It says you're ghosting it, ${n}.`,
]

const localIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

// count: how many pokes this task has had before this one.
export async function makePoke(task, level, name, count = 0) {
  const who = name || 'Friend'
  let text
  if (count >= MODEL_POKES) {
    text = SHOVES[count % SHOVES.length](who, task.title)
    return { id: `p${Date.now()}`, taskId: task.id, level, text, at: new Date().toISOString() }
  }
  try {
    const r = await fetch('/api/poke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: who, title: task.title, level, due: task.due ? localIso(new Date(task.due)) : null, now: localIso(new Date()) }),
    })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
    text = (await r.json()).text
  } catch (err) {
    console.warn('[poke] using backup line:', err.message)
    text = BACKUP_LINES[level](who, task.title)
  }
  return { id: `p${Date.now()}`, taskId: task.id, level, text, at: new Date().toISOString() }
}

function at(date, hhmm) {
  const d = new Date(date)
  const [h, m] = hhmm.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

// Tasks that should be poked right now, most urgent first.
export function duePokes(tasks, pokes, schedule, now = new Date()) {
  return tasks
    .filter((t) => {
      if (t.done || !canPoke(t, now, schedule)) return false
      if (t.snoozedUntil && new Date(t.snoozedUntil) > now) return false
      const mine = pokes.filter((p) => p.taskId === t.id)
      const last = mine.length ? new Date(mine[mine.length - 1].at) : null
      if (t.due) {
        return new Date(t.due) <= now && (!last || now - last >= repokeAfter(mine.length))
      }
      const checkIn = at(now, schedule.checkIn)
      return now >= checkIn && (!last || last < checkIn)
    })
    .sort((a, b) => new Date(a.due ?? Infinity) - new Date(b.due ?? Infinity))
}

// Shows a system notification when the tab isn't in view. Permission is asked for elsewhere, on a tap.
// Goes through the service worker when there is one (needed on Android, and taps open Pokey).
export async function notify(text) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return
    const options = { body: text, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'pokey', renotify: true, requireInteraction: true }
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return reg.showNotification('Pokey', options)
    const n = new Notification('Pokey', options)
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}
