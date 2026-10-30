// Making a nudge: ask the server for a model-written line, fall back to a canned one.
// When nudges are due: dated tasks at their due time, then faster and faster until Done or Snooze
// (the tone tops out at level 4); undated tasks once a day at check-in. Sleep hours and snoozes are respected.
import { canNudge } from './schedule.js'

export const MAX_LEVEL = 4
// Ignored nudges come faster: 10 min after the first, then every 5 until Done or Snooze.
const RENUDGE_MS = [10, 5].map((m) => m * 60 * 1000)
const renudgeAfter = (count) => RENUDGE_MS[Math.min(count - 1, RENUDGE_MS.length - 1)]
// Only the first few nudges per task are model-written; after that the stern canned lines rotate (no cost).
export const MODEL_NUDGES = 3
// How long a task can be snoozed for. Snoozing never costs coins.
export const SNOOZE_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
]

const BACKUP_LINES = {
  1: (n, t) => `${n}, "${t}" is coming up. Future you says thanks in advance.`,
  2: (n, t) => `${n}, "${t}" is aging like milk. Shall we?`,
  3: (n, t) => `${n}, I've nudged you three times. I'm basically a woodpecker now. ${t}.`,
  4: (n, t) => `${n}. ${n.toUpperCase()}. "${t}" has filed a missing person report.`,
}
const SHOVES = [
  (n, t) => `${n}, "${t}". Now. I'm a woodpecker with a deadline.`,
  (n, t) => `Still waiting on "${t}", ${n}. My finger is getting tired.`,
  (n, t) => `${n}! "${t}"! Done or Snooze. Pick one. Or I'll be back in five minutes.`,
  (n, t) => `"${t}" is starting to feel left out, ${n}.`,
]

const localIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

// count: how many nudges this task has had before this one.
export async function makeNudge(task, level, name, count = 0, buddy = 'Nudgy') {
  const who = name || 'Friend'
  let text
  if (count >= MODEL_NUDGES) {
    text = SHOVES[count % SHOVES.length](who, task.title)
    return { id: `p${Date.now()}`, taskId: task.id, level, text, at: new Date().toISOString() }
  }
  try {
    const r = await fetch('/api/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: who, buddy, title: task.title, level, due: task.due ? localIso(new Date(task.due)) : null, now: localIso(new Date()) }),
    })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
    text = (await r.json()).text
  } catch (err) {
    console.warn('[nudge] using backup line:', err.message)
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

// Tasks that should be nudged right now, most urgent first.
export function dueNudges(tasks, nudges, schedule, now = new Date()) {
  return tasks
    .filter((t) => {
      if (t.done || !canNudge(t, now, schedule)) return false
      if (t.snoozedUntil && new Date(t.snoozedUntil) > now) return false
      const mine = nudges.filter((p) => p.taskId === t.id)
      const last = mine.length ? new Date(mine[mine.length - 1].at) : null
      if (t.due) {
        return new Date(t.due) <= now && (!last || now - last >= renudgeAfter(mine.length))
      }
      const checkIn = at(now, schedule.checkIn)
      return now >= checkIn && (!last || last < checkIn)
    })
    .sort((a, b) => new Date(a.due ?? Infinity) - new Date(b.due ?? Infinity))
}

// Shows a system notification when the tab isn't in view. Permission is asked for elsewhere, on a tap.
// Goes through the service worker when there is one (needed on Android, and taps open Nudgy).
export async function notify(text, { silent = false } = {}) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return
    const options = { body: text, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'nudgy', renotify: true, requireInteraction: true, silent }
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return reg.showNotification('Nudgy', options)
    const n = new Notification('Nudgy', options)
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}
