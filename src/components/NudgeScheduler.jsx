import { useEffect, useRef } from 'react'
import { useStore } from '../lib/store.jsx'
import { IGNORE_COST, MAX_LEVEL, dueNudges, makeNudge, notify } from '../lib/nudges.js'
import { ALARM_MS, playAlarm } from '../lib/alarm.js'

// While the app is open, checks once a minute for a nudge that's due and sends at most one per check,
// so a pile of overdue tasks can't fire a burst of model calls. Renders nothing.
export default function NudgeScheduler() {
  const { name, tasks, nudges, setNudges, schedule, say, alarmOn, muted, buddyName, spendPoints } = useStore()
  const latest = useRef({ name, tasks, nudges, schedule, alarmOn, muted, buddyName })
  latest.current = { name, tasks, nudges, schedule, alarmOn, muted, buddyName }
  const busy = useRef(false)

  useEffect(() => {
    async function tick() {
      if (busy.current) return
      const { name, tasks, nudges, schedule, buddyName } = latest.current
      const task = dueNudges(tasks, nudges, schedule)[0]
      if (!task) return
      busy.current = true
      try {
        const count = nudges.filter((p) => p.taskId === task.id).length
        const level = Math.min(MAX_LEVEL, count + 1)
        const nudge = await makeNudge(task, level, name, count, buddyName)
        setNudges((ps) => [...ps, nudge])
        // From the third nudge on, ignoring costs coins.
        const charged = count >= 2 && spendPoints(IGNORE_COST)
        // Said out loud in the app (Done/Snooze sit on the Today banner and Nudges page), and as a
        // system notification if the tab is in the background.
        // Chime first, then the voice once it has finished, so one doesn't drown out the other.
        const chimed = latest.current.alarmOn && !latest.current.muted && playAlarm()
        notify(nudge.text, { silent: latest.current.muted })
        const line = charged ? `${nudge.text} (−${IGNORE_COST} coins)` : nudge.text
        if (chimed) setTimeout(() => say(line), ALARM_MS)
        else say(line)
      } finally {
        busy.current = false
      }
    }
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
