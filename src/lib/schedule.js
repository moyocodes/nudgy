// When Nudgy is allowed to nudge. Plain functions with no browser APIs, so the nudge agent
// on the server can import the same rules later.
//
// settings = { sleepStart: '23:00', sleepEnd: '07:00', checkIn: '10:00' }
// - Undated tasks get nudged once a day at checkIn.
// - During sleep hours only medium and high priority tasks may nudge; low waits until sleepEnd.

export const DEFAULT_SCHEDULE = { sleepStart: '23:00', sleepEnd: '07:00', checkIn: '10:00' }

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Sleep can wrap midnight (23:00 to 07:00) or not (01:00 to 09:00).
export function isAsleep(date, { sleepStart, sleepEnd }) {
  const now = date.getHours() * 60 + date.getMinutes()
  const start = minutes(sleepStart)
  const end = minutes(sleepEnd)
  return start <= end ? now >= start && now < end : now >= start || now < end
}

export function canNudge(task, date, schedule) {
  if (task.done) return false
  return task.priority !== 'low' || !isAsleep(date, schedule)
}

function at(date, hhmm) {
  const d = new Date(date)
  const [h, m] = hhmm.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

// The next moment this task would nudge: its due time (or the next check-in if undated),
// pushed to wake-up time when it lands in sleep hours and the task is low priority.
export function nextNudgeTime(task, schedule, now = new Date()) {
  if (task.done) return null
  let when
  if (task.due) {
    when = new Date(task.due)
    if (when < now) when = now
  } else {
    when = at(now, schedule.checkIn)
    if (when <= now) when.setDate(when.getDate() + 1)
  }
  if (!canNudge(task, when, schedule)) {
    const wake = at(when, schedule.sleepEnd)
    if (wake <= when) wake.setDate(wake.getDate() + 1)
    when = wake
  }
  return when
}

// Recurring tasks: repeat = [{ days: [0-6, Sunday first], time: 'HH:mm' }, ...].
// The next slot strictly after `from`, looking up to a week ahead.
export function nextOccurrence(repeat, from = new Date()) {
  if (!repeat?.length) return null
  let best = null
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset)
    for (const slot of repeat) {
      if (!slot.days.includes(day.getDay())) continue
      const when = at(day, slot.time)
      if (when > from && (!best || when < best)) best = when
    }
    if (best) return best
  }
  return best
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "Daily 8:00 AM", "Weekdays 7:00 AM", "Mon, Fri 9:00 AM · Daily 8:00 PM".
export function describeRepeat(repeat) {
  if (!repeat?.length) return ''
  return repeat
    .map(({ days, time }) => {
      const key = [...days].sort().join('')
      const label = key === '0123456' ? 'Daily' : key === '12345' ? 'Weekdays' : key === '06' ? 'Weekends' : [...days].sort().map((d) => DAY_NAMES[d]).join(', ')
      return `${label} ${formatClock(time)}`
    })
    .join(' · ')
}

export function formatClock(hhmm) {
  return at(new Date(), hhmm).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
