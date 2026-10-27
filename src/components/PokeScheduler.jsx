import { useEffect, useRef } from 'react'
import { useStore } from '../lib/store.jsx'
import { IGNORE_COST, MAX_LEVEL, duePokes, makePoke, notify } from '../lib/pokes.js'
import { playAlarm } from '../lib/alarm.js'

// While the app is open, checks once a minute for a poke that's due and sends at most one per check,
// so a pile of overdue tasks can't fire a burst of model calls. Renders nothing.
export default function PokeScheduler() {
  const { name, tasks, pokes, setPokes, schedule, say, alarmOn, spendPoints } = useStore()
  const latest = useRef({ name, tasks, pokes, schedule, alarmOn })
  latest.current = { name, tasks, pokes, schedule, alarmOn }
  const busy = useRef(false)

  useEffect(() => {
    async function tick() {
      if (busy.current) return
      const { name, tasks, pokes, schedule } = latest.current
      const task = duePokes(tasks, pokes, schedule)[0]
      if (!task) return
      busy.current = true
      try {
        const count = pokes.filter((p) => p.taskId === task.id).length
        const level = Math.min(MAX_LEVEL, count + 1)
        const poke = await makePoke(task, level, name, count)
        setPokes((ps) => [...ps, poke])
        // From the third poke on, ignoring costs coins.
        const charged = count >= 2 && spendPoints(IGNORE_COST)
        // Said out loud in the app (Done/Snooze sit on the Today banner and Pokes page), and as a
        // system notification if the tab is in the background.
        say(charged ? `${poke.text} (−${IGNORE_COST} coins)` : poke.text)
        notify(poke.text)
        if (latest.current.alarmOn) playAlarm()
      } finally {
        busy.current = false
      }
    }
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
