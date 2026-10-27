import { useState } from 'react'
import { ChevronIcon } from './Icons.jsx'

// Quick picks, a month calendar and time presets for a task's due date.
// Works in local "YYYY-MM-DD" / "HH:mm" strings; '' means unset.

const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
// Next occurrence of a weekday (0 = Sunday), never today.
const nextWeekday = (d, day) => addDays(d, ((day - d.getDay() + 7) % 7) || 7)

const TIMES = [['Morning', '09:00'], ['Afternoon', '14:00'], ['Evening', '18:00'], ['Night', '21:00']]

export default function DatePicker({ date, time, onChange }) {
  const today = new Date()
  // The month grid stays tucked away until asked for; quick picks cover most cases.
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [month, setMonth] = useState(() => {
    const base = date ? new Date(`${date}T00:00`) : today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const set = (d, t = time) => onChange(d, t)
  const quick = [
    ['Today', ymd(today), time],
    ['Tonight', ymd(today), '20:00'],
    ['Tomorrow', ymd(addDays(today, 1)), time],
    ['This weekend', ymd(today.getDay() === 6 ? today : nextWeekday(today, 6)), time || '10:00'],
    ['Next week', ymd(nextWeekday(today, 1)), time || '09:00'],
  ]

  // Calendar grid: blanks before the 1st, then each day of the month.
  const first = month.getDay()
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
  const todayKey = ymd(today)
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1)

  const chip = (active) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-primary text-on-primary' : 'bg-ink/5 text-ink/70 hover:bg-ink/10'}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {quick.map(([label, d, t]) => (
          <button key={label} type="button" onClick={() => { set(d, t); setMonth(new Date(`${d}T00:00`)) }} className={chip(date === d && (label !== 'Tonight' || time === '20:00'))}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => onChange('', '')} className={chip(!date && !time)}>No date</button>
        <button
          type="button"
          onClick={() => setCalendarOpen((o) => !o)}
          aria-expanded={calendarOpen}
          className={`inline-flex items-center gap-1 ${chip(calendarOpen || (date && !quick.some(([, d]) => d === date)))}`}
        >
          {date && !quick.some(([, d]) => d === date)
            ? new Date(`${date}T00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
            : 'Pick a date'}
          <ChevronIcon size={12} className={`transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {calendarOpen && (
      <div className="rounded-2xl border-[length:var(--bw)] border-line bg-bg p-2">
        <div className="flex items-center justify-between px-1 pb-1">
          <button type="button" disabled={!canGoBack} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-ink/5 disabled:opacity-25">
            <ChevronIcon size={16} className="rotate-90" />
          </button>
          <span className="text-sm font-semibold">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-full text-ink/60 hover:bg-ink/5">
            <ChevronIcon size={16} className="-rotate-90" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-ink/40">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />
            const key = ymd(d)
            const past = key < todayKey
            const selected = key === date
            return (
              <button
                key={key}
                type="button"
                disabled={past}
                onClick={() => { set(key, time || '09:00'); setCalendarOpen(false) }}
                aria-label={d.toDateString()}
                aria-pressed={selected}
                className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm transition-colors disabled:text-ink/20 ${
                  selected ? 'bg-primary font-semibold text-on-primary' : key === todayKey ? 'font-semibold text-primary ring-1 ring-primary/40' : 'hover:bg-ink/5'
                }`}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
      </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {TIMES.map(([label, t]) => (
          <button key={label} type="button" onClick={() => set(date || todayKey, t)} className={chip(time === t)}>
            {label}
          </button>
        ))}
        <input
          type="time"
          value={time}
          onChange={(e) => set(date || todayKey, e.target.value)}
          aria-label="Exact time"
          className="ml-auto rounded-xl border-[length:var(--bw)] border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  )
}
