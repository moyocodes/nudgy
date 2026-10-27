import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { badgeStats, mockExtract, nextBadge } from '../lib/mockData.js'
import { countdown, friendlyDue, isOverdue, nextDue, savedSummary } from '../lib/format.js'
import { describeRepeat, nextOccurrence } from '../lib/schedule.js'
import BrainDump from '../components/BrainDump.jsx'
import SoundPicker from '../components/SoundPicker.jsx'
import TaskCard from '../components/TaskCard.jsx'
import Story from '../components/Story.jsx'
import Mascot from '../components/Mascot.jsx'
import { BellIcon, ChevronIcon, TrophyIcon } from '../components/Icons.jsx'


// What Pokey says while the model reads a brain dump. One at random each time.
const THINKING = [
  'Untangling your thoughts. Bring snacks.',
  'Sorting the to-dos from the oh-nos…',
  'Decoding brain soup. Mmm, chunky.',
  'Rummaging through your brain drawer…',
  'Hold on, sharpening my poking finger.',
  'Turning chaos into a checklist. Very wizardly.',
  'Reading between the lines. And the umms.',
  'One sec, filing this under "future you".',
]

// The rundown plays by itself once per page load (every reload), not on every return to Today.
let rundownShownThisLoad = false
function useDailyStory(ready) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!ready || rundownShownThisLoad) return
    rundownShownThisLoad = true
    setOpen(true)
  }, [ready])
  return [open, () => setOpen(true), () => setOpen(false)]
}

// Buckets for the list: overdue, today, later, no date.
function groupTasks(tasks) {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const groups = { Overdue: [], Today: [], Later: [], Someday: [] }
  for (const t of tasks) {
    if (!t.due) groups.Someday.push(t)
    else if (isOverdue(t)) groups.Overdue.push(t)
    else if (new Date(t.due) <= endOfToday) groups.Today.push(t)
    else groups.Later.push(t)
  }
  for (const list of Object.values(groups)) list.sort((a, b) => new Date(a.due ?? 0) - new Date(b.due ?? 0))
  return Object.entries(groups).filter(([, list]) => list.length)
}

// Re-renders once a minute so countdowns stay honest.
function useMinuteClock() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}

const SOON_MS = 24 * 60 * 60 * 1000

// A collapsible group. Collapsed, it still shows anything due in the next 24 hours.
function TaskGroup({ label, list, now }) {
  const [expanded, setExpanded] = useState(false)
  // A task arriving in this group after it first rendered (just added or moved here) opens it,
  // so new things never land out of sight.
  const seen = useRef(null)
  useEffect(() => {
    const ids = list.map((t) => t.id)
    if (seen.current && ids.some((id) => !seen.current.has(id))) setExpanded(true)
    seen.current = new Set(ids)
  }, [list])
  const soon = list.filter((t) => !t.done && t.due && new Date(t.due) - now < SOON_MS && new Date(t.due) - now > 0)
  const shown = expanded ? list : soon
  const hidden = list.length - shown.length
  return (
    <section>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className={`mb-2 flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${label === 'Overdue' ? 'text-accent' : 'text-ink/45'}`}
      >
        <ChevronIcon size={14} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        {label} · {list.length}
        {!expanded && soon.length > 0 && <span className="normal-case tracking-normal text-primary">· {soon.length} due soon</span>}
      </button>
      {shown.length > 0 && (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {shown.map((t) => <TaskCard key={t.id} task={t} />)}
          </AnimatePresence>
        </ul>
      )}
      {!expanded && hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-xs font-semibold text-ink/50 hover:text-ink">
          Show {hidden} more
        </button>
      )}
    </section>
  )
}

const card = 'rounded-2xl border-[length:var(--bw)] border-line bg-surface p-4 shadow-card'

function NextBadge({ next, stats, className = '' }) {
  return (
    <Link to="/rewards" className={`flex items-center gap-3 rounded-2xl border-[length:var(--bw)] border-line bg-surface px-4 py-2.5 hover:bg-ink/[0.02] ${className}`}>
      <TrophyIcon size={18} className="shrink-0 text-ink/45" />
      <span className="min-w-0 flex-1">
        <span className="flex justify-between text-[13px]">
          <span className="truncate">Next: <span className="font-medium">{next.label}</span></span>
          <span className="text-ink/45">{stats[next.stat]}/{next.goal}</span>
        </span>
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-ink/10">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${(stats[next.stat] / next.goal) * 100}%` }} />
        </span>
      </span>
    </Link>
  )
}

// The week ahead at a glance: one column per day, a dot per task due. Tapping a day jumps the list to it.
function WeekGlance({ tasks, day, onPickDay }) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  return (
    <div className={card}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">This week</h2>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          const key = d.toDateString()
          const due = tasks.filter((t) => !t.done && t.due && new Date(t.due).toDateString() === key).length
          const picked = day === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(picked ? null : key)}
              aria-pressed={picked}
              aria-label={`${d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}, ${due} due`}
              className={`rounded-xl py-2 transition-colors ${picked ? 'bg-primary text-on-primary' : i === 0 ? 'bg-soft hover:bg-ink/10' : 'hover:bg-ink/5'}`}
            >
              <span className={`block text-[10px] font-medium uppercase ${picked ? 'text-on-primary/70' : 'text-ink/45'}`}>{d.toLocaleDateString([], { weekday: 'narrow' })}</span>
              <span className={`block text-sm ${i === 0 && !picked ? 'font-semibold text-primary' : ''}`}>{d.getDate()}</span>
              <span className="mt-1 flex h-1.5 justify-center gap-0.5">
                {Array.from({ length: Math.min(due, 3) }, (_, j) => <span key={j} className={`h-1.5 w-1.5 rounded-full ${picked ? 'bg-on-primary' : 'bg-primary'}`} />)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// "hey Pokey", "hi Moyo", "good morning!" with nothing else: a hello, not a task.
const GREETING = /^\s*(hey|hi|hiya|hello|heya|yo|sup|howdy|good (morning|afternoon|evening))\b[\s,!.]*(\p{L}+)?[\s,!.?]*$/iu
const GREETING_REPLIES = [
  (n) => `Hey ${n}! Pokey at your service, finger warmed up.`,
  (n) => `Hi ${n}! Missed me? I missed poking you.`,
  (n) => `Well hello, ${n}.`,
  (n) => `${n}! There you are.`,
]

// Backup for the model's "overwhelmed" mood, and the only check when the model is unreachable.
const OVERWHELMED = /\b(overwhelm\w*|swamped|stressed|too much|drowning|can'?t cope|close (my|the|all|every)\w*|clear (it|my|the|every)\w*|hide (it|every)\w*)\b/i

// One task instead of a list: overdue first, then the soonest, then the most important.
function CalmView({ tasks, onExit }) {
  const rank = { high: 0, medium: 1, low: 2 }
  const focus = [...tasks].sort((a, b) =>
    isOverdue(b) - isOverdue(a) || (a.due ? new Date(a.due) : Infinity) - (b.due ? new Date(b.due) : Infinity) || rank[a.priority] - rank[b.priority],
  )[0]
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">Just this one</h2>
        <button type="button" onClick={onExit} className="rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-ink/5">
          Show everything ({tasks.length})
        </button>
      </div>
      {focus ? (
        <ul><TaskCard task={focus} /></ul>
      ) : (
        <p className="py-4 text-center text-ink/50">Nothing on your plate. Genuinely. Go stare at a cloud.</p>
      )}
      <Link to="/play" className={`${card} flex items-center gap-3 hover:bg-ink/[0.02]`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soft"><Mascot size={26} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Take a 30-second poke break?</span>
          <span className="block text-xs text-ink/50">Whack a few pokes, then come back lighter.</span>
        </span>
        <span className="text-sm font-semibold text-primary">Play</span>
      </Link>
    </section>
  )
}

// The list narrowed to one day, picked from the week strip.
function DayView({ day, tasks, onClear }) {
  const list = tasks
    .filter((t) => t.due && new Date(t.due).toDateString() === day)
    .sort((a, b) => a.done - b.done || new Date(a.due) - new Date(b.due))
  const label = new Date(day).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">{label} · {list.length}</h2>
        <button type="button" onClick={onClear} className="rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-ink/5">Show all</button>
      </div>
      {list.length ? (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {list.map((t) => <TaskCard key={t.id} task={t} />)}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="py-6 text-center text-ink/50">Nothing that day. Pencil in a nap?</p>
      )}
    </section>
  )
}

// The panels beside the list: rundown, next badge, recent pokes, the week, poke break.
// A right rail on desktop; below the list on mobile.
function RailContent({ open, overdue, pokes, tasks, next, stats, onRundown, upcoming, now, day, onPickDay }) {
  const recent = [...pokes].reverse().slice(0, 3)
  return (
    <>
      <div className={`${card} flex items-center gap-3`}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-soft ring-2 ring-primary ring-offset-2 ring-offset-surface">
          <Mascot size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Today's rundown</span>
          <span className="block text-xs text-ink/50">
            {open} open{overdue ? ` · ${overdue} overdue` : ''}{upcoming ? ` · next in ${countdown(new Date(upcoming.due) - now)}` : ''}
          </span>
          {upcoming && <span className="block truncate text-xs font-medium">{upcoming.title}</span>}
        </span>
        <button type="button" onClick={onRundown} className="min-h-9 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary">Play</button>
      </div>

      {next && <NextBadge next={next} stats={stats} />}

      <div className={card}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">Recent pokes</h2>
          <Link to="/pokes" className="text-xs font-semibold text-primary">See all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">Quiet. Suspiciously quiet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recent.map((p) => (
              <li key={p.id}>
                <Link to="/pokes" className="-mx-2 flex gap-2.5 rounded-xl px-2 py-1 hover:bg-ink/5">
                  <BellIcon size={15} className="mt-0.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-[13px] leading-snug">{p.text}</span>
                    <span className="block text-[11px] text-ink/45">{tasks.find((t) => t.id === p.taskId)?.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WeekGlance tasks={tasks} day={day} onPickDay={onPickDay} />

      <div className={card}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">Background sound</h2>
        <SoundPicker compact />
      </div>

      <Link to="/play" className={`${card} flex items-center gap-3 hover:bg-ink/[0.02]`}>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Poke break</span>
          <span className="block text-xs text-ink/50">30 seconds of whack-a-poke.</span>
        </span>
        <span className="text-sm font-semibold text-primary">Play</span>
      </Link>
    </>
  )
}

export default function HomePage() {
  const { name, tasks, addTasks, introSeen, pokes, completeTask, snoozeTask, updateTask, deleteTask, replaceTasks, replacePoints, points, aboutTaskId, setAboutTaskId, streak, tutorialSeen, openTutorial, say, chat, addChat } = useStore()
  const [storyOpen, openStory, closeStory] = useDailyStory(tutorialSeen && introSeen)
  const [askingProof, setAskingProof] = useState(false)
  // A day picked from the week strip ("Wed Oct 28 2026"), or null for the full list.
  const [day, setDay] = useState(null)
  const listRef = useRef(null)
  // Calm view: the user said they're swamped, so the list folds down to one task.
  const [calm, setCalm] = useState(false)
  function goCalm() {
    setCalm(true)
    setDay(null)
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  function pickDay(key) {
    setCalm(false)
    setDay(key)
    if (key) setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // First visit: show how things work before the daily rundown takes over.
  useEffect(() => {
    if (!tutorialSeen) openTutorial()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Prototype: local mock extraction. Swap for POST /api/extract later.
  // Muse Spark reads the dump and replies; the local parser is only a fallback if the call fails.
  // The task list just before the last brain dump changed it, so it can be undone.
  const [lastChange, setLastChange] = useState(null)
  function undoLast() {
    if (!lastChange) return say('Nothing to undo. Clean slate, clean conscience.')
    replaceTasks(lastChange.before)
    replacePoints(lastChange.points)
    setLastChange(null)
    const line = 'Undone. Like it never happened.'
    say(line)
    addChat({ from: 'pokey', text: line })
  }

  // Applies the model's actions on existing reminders and describes what really changed.
  function applyActions(actions, listed) {
    const said = []
    for (const a of actions) {
      const task = listed[a.n - 1]
      if (!task) continue
      if (a.type === 'done') { completeTask(task.id); said.push(`Ticked off "${task.title}".`) }
      if (a.type === 'delete') { deleteTask(task.id); said.push(`Binned "${task.title}".`) }
      if (a.type === 'snooze') { snoozeTask(task.id); said.push(`Snoozed "${task.title}" for an hour.`) }
      if (a.type === 'update') {
        const changes = {}
        if (a.due) changes.due = new Date(a.due).toISOString()
        if (a.title) changes.title = a.title
        if (a.priority) changes.priority = a.priority
        if ('repeat' in a) {
          changes.repeat = a.repeat
          if (a.repeat && !a.due) changes.due = nextOccurrence(a.repeat)?.toISOString() ?? task.due
        }
        // Setting a time or name answers any question Pokey had about this task.
        if (changes.due || changes.title) changes.ask = null
        updateTask(task.id, changes)
        const title = a.title || task.title
        said.push(
          'repeat' in a
            ? a.repeat ? `"${title}" now repeats: ${describeRepeat(a.repeat)}.` : `"${title}" won't repeat any more.`
            : a.due ? `Moved "${title}" to ${friendlyDue(changes.due).toLowerCase()}.`
            : a.priority ? `"${title}" is now ${a.priority} priority.`
            : a.title ? `Renamed it "${a.title}".` : `Updated "${title}".`,
        )
      }
    }
    return said.join(' ')
  }

  // Dumps still being worked on. The page stays usable meanwhile; this just shows a "Pokey's on it" pill.
  const [thinking, setThinking] = useState(0)
  async function handleDump(text) {
    setThinking((n) => n + 1)
    try {
      await processDump(text)
    } finally {
      setThinking((n) => n - 1)
    }
  }

  async function processDump(text) {
    // A bare greeting ("hey Pokey", "hi Moyo", "good morning") gets a hello back, no model call.
    if (GREETING.test(text)) {
      const open = tasks.filter((t) => !t.done)
      const next = nextDue(tasks)
      const hello = GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)](name || 'friend')
      const status = open.length
        ? `${open.length} ${open.length === 1 ? 'thing' : 'things'} on${next ? `, next up: ${next.title}` : ''}. What's on your mind?`
        : 'Your list is empty. Suspicious. What are we remembering?'
      const line = `${hello} ${status}`
      say(line)
      return addChat({ from: 'you', text }, { from: 'pokey', text: line })
    }
    // A bare "undo" needs no model call.
    if (/^\s*(undo( that| it)?|take (that|it) back)[.!\s]*$/i.test(text)) {
      addChat({ from: 'you', text })
      return undoLast()
    }
    say(THINKING[Math.floor(Math.random() * THINKING.length)])
    const local = new Date()
    const now = new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    // Numbered for the model; actions come back as numbers and are matched to ids here.
    // A reminder picked with @ goes first, as number 1, and the text is about it.
    const about = tasks.find((t) => t.id === aboutTaskId && !t.done)
    const listed = [...(about ? [about] : []), ...tasks.filter((t) => !t.done && t !== about)].slice(0, 25)
    setAboutTaskId(null)
    const said = about ? `About "${about.title}": ${text}` : text
    try {
      const r = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text, now, name,
          history: chat.slice(-4).map(({ from, text }) => ({ from, text })),
          selected: about ? 1 : null,
          reminders: listed.map((t) => ({ title: t.title, due: t.due ? new Date(new Date(t.due).getTime() - local.getTimezoneOffset() * 60000).toISOString() : null, ask: t.ask?.text ?? null })),
        }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
      const { reply, mood, actions = [], tasks: found } = await r.json()
      if (mood === 'overwhelmed' || OVERWHELMED.test(text)) goCalm()
      if (actions.some((a) => a.type === 'undo')) {
        addChat({ from: 'you', text: said })
        return undoLast()
      }
      const before = tasks
      const changed = applyActions(actions, listed)
      const saved = found.map((t, i) => ({
        id: `x${Date.now()}${i}`,
        title: t.title,
        due: t.due ? new Date(t.due).toISOString() : t.repeat ? nextOccurrence(t.repeat)?.toISOString() ?? null : null,
        priority: t.priority,
        physical: t.proof,
        ask: t.ask,
        repeat: t.repeat,
        done: false,
      }))
      addTasks(saved)
      if (saved.length || changed) setLastChange({ before, points })
      // The quip is the model's; the "Set: ..." and action parts come from what was really changed.
      // Keep the conversation going: ask about a new task first, else the next one still waiting.
      const answered = new Set(actions.filter((a) => a.type !== 'update' || a.due || a.title).map((a) => listed[a.n - 1]?.id))
      const question = saved.find((t) => t.ask)?.ask.text ?? listed.find((t) => t.ask && !answered.has(t.id))?.ask.text
      const line = [reply || (saved.length || changed ? '' : 'Nothing to do in there. Just vibes.'), changed, savedSummary(saved), question].filter(Boolean).join(' ')
      say(line)
      addChat({ from: 'you', text: said, mood }, { from: 'pokey', text: line, taskIds: saved.map((t) => t.id) })
    } catch (err) {
      console.warn('[extract] falling back to local parser:', err.message)
      if (OVERWHELMED.test(text)) {
        goCalm()
        const line = "Deep breath. I've folded everything away. Just one thing for now."
        say(line)
        return addChat({ from: 'you', text: said, mood: 'overwhelmed' }, { from: 'pokey', text: line })
      }
      // The local parser only handles simple lists. A reply to Pokey's question, an @ instruction
      // or a long sentence would just become a junk task, so say so instead.
      if (about || listed.some((t) => t.ask) || text.split(/\s+/).length > 12) {
        const line = `I couldn't reach my brain just now (${err.message}), so I didn't touch anything. Try again in a moment?`
        say(line)
        return addChat({ from: 'you', text: said }, { from: 'pokey', text: line })
      }
      const found = mockExtract(text)
      if (found.length) setLastChange({ before: tasks, points })
      addTasks(found)
      const line = found.length ? `My brain's offline, so I winged it. ${savedSummary(found)} Check the times.` : 'Nothing to do in there. Just vibes.'
      say(line)
      addChat({ from: 'you', text: said }, { from: 'pokey', text: line, taskIds: found.map((t) => t.id) })
    }
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const overdue = open.filter(isOverdue).length
  const latest = pokes[pokes.length - 1]
  const latestTask = latest && tasks.find((t) => t.id === latest.taskId)
  const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
  const stats = badgeStats(tasks, streak)
  const next = nextBadge(stats)
  const now = useMinuteClock()
  const upcoming = nextDue(tasks, now)
  const rail = { open: open.length, overdue, pokes, tasks, next, stats, onRundown: openStory, upcoming, now, day, onPickDay: pickDay }

  return (
    <div className="pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
      <AnimatePresence>{storyOpen && <Story onClose={closeStory} />}</AnimatePresence>
      <div className="flex min-w-0 flex-col gap-4">

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink/50">{today}</p>
          <h1 className="mt-1 font-display text-[1.75rem] leading-tight">
            Hey {name || 'you'}, <em>{open.length || 'nothing'}</em> {open.length === 1 ? 'thing' : 'things'} on.
          </h1>
          {overdue > 0 && <p className="mt-1 text-sm text-ink/60">{overdue} overdue. No judgement. Mostly.</p>}
          {upcoming && (
            <p className="mt-1 text-sm text-ink/60">
              Next up in <span className="font-semibold text-ink">{countdown(new Date(upcoming.due) - now)}</span>: {upcoming.title}
            </p>
          )}
        </div>
        <button type="button" onClick={openStory} className="flex shrink-0 flex-col lg:hidden items-center gap-1 text-[11px] font-medium text-ink/60">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface ring-2 ring-primary ring-offset-2 ring-offset-bg">
            <Mascot size={28} />
          </span>
          Rundown
        </button>
      </header>

      {/* On phones: a short block up top with nothing to scroll. The rundown button is in the header,
          sound is in the top bar, so that card isn't repeated. */}
      <section aria-label="Your day" className="grid grid-cols-2 gap-3 lg:hidden">
        {next && <NextBadge next={next} stats={stats} className="!px-3" />}
        <Link to="/play" className={`${card} flex flex-col justify-center !p-3 hover:bg-ink/[0.02] ${next ? '' : 'col-span-2'}`}>
          <span className="text-sm font-semibold">Poke break</span>
          <span className="text-xs text-ink/50">30-second game</span>
        </Link>
        <div className="col-span-2"><WeekGlance tasks={tasks} day={day} onPickDay={pickDay} /></div>
        {pokes.length > 0 && (
          <div className={`${card} col-span-2 !py-3`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">Recent pokes</h2>
              <Link to="/pokes" className="text-xs font-semibold text-primary">See all</Link>
            </div>
            <ul className="mt-2 space-y-1">
              {[...pokes].reverse().slice(0, 2).map((p) => (
                <li key={p.id}>
                  <Link to="/pokes" className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-ink/5">
                    <BellIcon size={14} className="shrink-0 text-primary" />
                    <span className="truncate text-[13px]">{p.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <AnimatePresence>
        {latest && latestTask && !latestTask.done && (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-2xl border-[length:var(--bw)] border-line bg-soft/60 px-4 py-3"
          >
            <BellIcon size={18} className="shrink-0 text-primary" />
            <Link to="/pokes" className="min-w-0 flex-1 text-sm leading-snug">{latest.text}</Link>
            {/* Proof tasks ask first, same as the task card. */}
            {askingProof ? (
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => { setAskingProof(false); completeTask(latestTask.id) }} className="rounded-full px-2 py-1 text-sm font-semibold text-ink/60 hover:bg-ink/5">
                  Trust me
                </button>
                <Link to={`/proof/${latestTask.id}`} className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-on-primary">Snap +15</Link>
              </span>
            ) : (
              <span className="flex shrink-0 items-center">
                <button type="button" onClick={() => snoozeTask(latestTask.id)} className="rounded-full px-2 py-1 text-sm font-semibold text-ink/50 hover:bg-ink/5">
                  Snooze
                </button>
                <button type="button" onClick={() => (latestTask.physical ? setAskingProof(true) : completeTask(latestTask.id))} className="rounded-full px-2 py-1 text-sm font-semibold text-primary hover:bg-ink/5">
                  Done
                </button>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BrainDump
        onSubmit={handleDump}
        reminders={open}
        about={open.find((t) => t.id === aboutTaskId)}
        onPickAbout={setAboutTaskId}
        thinking={thinking}
        question={open.find((t) => t.ask)?.ask.text}
      />
      {(chat.length > 0 || lastChange) && (
        <div className="-mt-2 flex items-center justify-end gap-3">
          {lastChange && (
            <button type="button" onClick={undoLast} className="text-xs font-semibold text-primary hover:underline">
              ↶ Undo last change
            </button>
          )}
          {chat.length > 0 && (
            <Link to="/history" className="text-xs font-semibold text-ink/50 hover:text-primary">
              Our chat so far →
            </Link>
          )}
        </div>
      )}



      <div ref={listRef} className="flex scroll-mt-20 flex-col gap-4">
      {calm ? (
        <CalmView tasks={open} onExit={() => setCalm(false)} />
      ) : day ? (
        <DayView day={day} tasks={tasks} onClear={() => setDay(null)} />
      ) : (
        <>
        {open.length === 0 ? (
          <p className="py-6 text-center text-ink/50">All clear. Suspiciously productive.</p>
        ) : (
          groupTasks(open).map(([label, list]) => (
            <TaskGroup key={label} label={label} list={list} now={now} />
          ))
        )}

        {/* Done always sits last, under Someday, even when empty. */}
        <TaskGroup label="Done" list={done} now={now} />
        </>
      )}
      </div>
      </div>

      <aside className="sticky top-20 hidden flex-col gap-3 lg:flex"><RailContent {...rail} /></aside>
    </div>
  )
}
