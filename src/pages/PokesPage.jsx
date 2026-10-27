import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store.jsx'
import { MAX_LEVEL, makePoke } from '../lib/pokes.js'
import PokeBubble from '../components/PokeBubble.jsx'
import { Button } from '../components/ui.jsx'
import { BellIcon } from '../components/Icons.jsx'

const canNotify = typeof Notification !== 'undefined'

// Browsers only let a page ask for notifications from a tap, so this is a button, not a popup on load.
function NotifyCard() {
  const [permission, setPermission] = useState(canNotify ? Notification.permission : 'unsupported')
  if (permission === 'granted' || permission === 'unsupported') return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border-[length:var(--bw)] border-line bg-soft/60 px-4 py-3">
      <BellIcon size={18} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm leading-snug">
        {permission === 'denied'
          ? "Notifications are blocked. Unblock them in your browser's site settings and I can poke you from other tabs."
          : 'Let me poke you even when you’re in another tab?'}
      </p>
      {permission === 'default' && (
        <button
          type="button"
          onClick={() => Notification.requestPermission().then(setPermission)}
          className="min-h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary"
        >
          Allow
        </button>
      )}
    </div>
  )
}

export default function PokesPage() {
  const { name, tasks, pokes, setPokes, completeTask, snoozeTask } = useStore()
  const [poking, setPoking] = useState(false)

  // Pokes the most important open task right now, with a model-written line.
  async function pokeMeNow() {
    const open = tasks.filter((t) => !t.done)
    if (!open.length || poking) return
    const rank = { high: 0, medium: 1, low: 2 }
    const task = [...open].sort((a, b) => rank[a.priority] - rank[b.priority])[0]
    const level = Math.min(MAX_LEVEL, pokes.filter((p) => p.taskId === task.id).length + 1)
    setPoking(true)
    const poke = await makePoke(task, level, name)
    setPokes((ps) => [...ps, poke])
    setPoking(false)
  }

  // Only the newest poke for each task gets Done/Snooze, so repeats don't stack buttons.
  const latest = new Set(Object.values(Object.fromEntries(pokes.map((p) => [p.taskId, p.id]))))

  return (
    <div className="flex flex-col gap-4 pt-2">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] leading-tight">Pokes</h1>
          <p className="text-sm text-ink/50">Everything I've nudged you about.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={pokeMeNow} disabled={poking} className="shrink-0 px-3.5">
          <BellIcon size={15} /> {poking ? 'Winding up…' : 'Poke me'}
        </Button>
      </header>
      <NotifyCard />
      {pokes.length === 0 ? (
        <p className="py-8 text-center text-ink/50">No pokes. Enjoy the peace while it lasts.</p>
      ) : (
        <ul className="flex flex-col-reverse gap-2">
          <AnimatePresence initial={false}>
          {pokes.map((p) => {
            const task = tasks.find((t) => t.id === p.taskId)
            return (
              <li key={p.id}>
                <PokeBubble
                  poke={p}
                  task={task}
                  onDone={latest.has(p.id) ? () => completeTask(p.taskId) : undefined}
                  onSnooze={latest.has(p.id) ? () => snoozeTask(p.taskId) : undefined}
                />
              </li>
            )
          })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
