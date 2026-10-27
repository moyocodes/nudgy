// Prototype state: tasks, pokes, points and streak, kept in localStorage.
// No model calls here; extraction and pokes are mocked until the real routes exist.
import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_SCHEDULE, nextOccurrence } from './schedule.js'
import { applyAccent } from './themes.js'
import { logout, pullState, pushState } from './account.js'

const StoreContext = createContext(null)

// v2 drops the old sample tasks and pokes so everyone starts with an empty list.
try {
  if (localStorage.getItem('pokey:v') !== '2') {
    ;['tasks', 'pokes', 'points', 'streak', 'snoozes'].forEach((k) => localStorage.removeItem(`pokey:${k}`))
    localStorage.setItem('pokey:v', '2')
  }
} catch {}

function load(key, fallback) {
  try {
    const v = localStorage.getItem(`pokey:${key}`)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function usePersisted(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(`pokey:${key}`, JSON.stringify(value))
    } catch {}
  }, [key, value])
  return [value, setValue]
}

export const POINTS_PER_TASK = 10
export const PROOF_BONUS = 15
export const SNOOZE_COST = 1
export const GAME_COST = 5

export function StoreProvider({ children }) {
  const [name, setName] = usePersisted('name', '')
  const [tasks, setTasks] = usePersisted('tasks', [])
  const [pokes, setPokes] = usePersisted('pokes', [])
  const [points, setPoints] = usePersisted('points', 0)
  const [streak, setStreak] = usePersisted('streak', 0)
  const [theme, setTheme] = usePersisted('theme', 'chill')
  const [schedule, setSchedule] = usePersisted('schedule', DEFAULT_SCHEDULE)
  // The welcome intro plays once per visit (tab session), not once ever.
  const [introSeen, setIntroSeenState] = useState(() => {
    try { return sessionStorage.getItem('pokey:introSeen') === '1' } catch { return false }
  })
  function setIntroSeen(seen) {
    setIntroSeenState(seen)
    try { seen ? sessionStorage.setItem('pokey:introSeen', '1') : sessionStorage.removeItem('pokey:introSeen') } catch {}
  }
  const [snoozes, setSnoozes] = usePersisted('snoozes', {})
  const [joke, setJoke] = useState(null)
  // The reminder picked to talk to Pokey about (the @ chip in the brain dump), or null.
  const [aboutTaskId, setAboutTaskId] = useState(null)
  const [buddy, setBuddy] = useState(null)
  const [voiceOn, setVoiceOn] = usePersisted('voiceOn', false)
  const [volume, setVolume] = usePersisted('volume', 0.6)
  // Whether the user has answered "talk out loud?" (yes or no), so the setup card stops asking.
  const [soundAsked, setSoundAsked] = usePersisted('soundAsked', false)
  // True while a full-screen story (rundown or tutorial) is showing, so other pop-ups wait.
  const [storyOpen, setStoryOpen] = useState(false)
  // Alarm chime when a poke fires (lib/alarm.js).
  const [alarmOn, setAlarmOn] = usePersisted('alarmOn', true)
  // Background music during the rundown (lib/music.js).
  const [musicOn, setMusicOn] = usePersisted('musicOn', true)
  // Background sound across the app: null (off), 'rain', 'fire' or 'waves' (lib/ambient.js).
  const [ambient, setAmbient] = usePersisted('ambient', null)
  // One volume for all sounds (lib/volume.js). Background sound plays at a quarter of it.
  const [ambientAsked, setAmbientAsked] = usePersisted('ambientAsked', false)
  // Everything said to and by Pokey in the brain dump, oldest first: { id, at, from: 'you'|'pokey', text, taskIds?, mood? }.
  const [chat, setChat] = usePersisted('chat', [])
  const addChat = (...msgs) =>
    setChat((c) => [...c, ...msgs.map((m, i) => ({ id: `c${Date.now()}${i}`, at: new Date().toISOString(), ...m }))].slice(-500))

  // Pokey's on-screen voice: a speech bubble every time, out loud too when the user turns it on.
  const say = (text) => setBuddy({ text, key: Date.now() })
  const [celebration, setCelebration] = useState(null)
  const [tutorialSeen, setTutorialSeen] = usePersisted('tutorialSeen', false)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  const openTutorial = () => setTutorialOpen(true)
  function closeTutorial() {
    setTutorialOpen(false)
    setTutorialSeen(true)
  }

  // The colour picked within each theme, e.g. { cheeky: 'teal' }. Missing means the theme's own.
  const [accents, setAccents] = usePersisted('accents', {})
  const setAccent = (themeId, accentId) => setAccents((a) => ({ ...a, [themeId]: accentId }))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    applyAccent(theme, accents[theme])
  }, [theme, accents])

  // Signed-in account: { email, session } for this device, or null. See lib/account.js.
  const [account, setAccount] = usePersisted('account', null)
  const synced = { name, tasks, pokes, points, streak, theme, schedule, snoozes, chat, accents, tutorialSeen }
  const setters = { name: setName, tasks: setTasks, pokes: setPokes, points: setPoints, streak: setStreak, theme: setTheme, schedule: setSchedule, snoozes: setSnoozes, chat: setChat, accents: setAccents, tutorialSeen: setTutorialSeen }
  const [hydrated, setHydrated] = useState(false)

  // On sign-in: the account's saved state wins if there is one; otherwise this device's state seeds it.
  useEffect(() => {
    if (!account) return setHydrated(false)
    let cancelled = false
    pullState(account.session)
      .then((saved) => {
        if (cancelled) return
        if (saved?.state) for (const [k, v] of Object.entries(saved.state)) setters[k]?.(v)
        else pushState(account.session, synced).catch(() => {})
        setHydrated(true)
      })
      .catch((err) => { if (err.status === 401) setAccount(null) })
    return () => { cancelled = true }
  }, [account?.session]) // eslint-disable-line react-hooks/exhaustive-deps

  // After that, every change is saved to the account a moment later.
  const syncKey = JSON.stringify(synced)
  useEffect(() => {
    if (!account || !hydrated) return
    const id = setTimeout(() => pushState(account.session, synced).catch((err) => { if (err.status === 401) setAccount(null) }), 1500)
    return () => clearTimeout(id)
  }, [syncKey, hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signOut() {
    try { await logout(account.session) } catch {}
    setAccount(null)
  }

  function addTasks(newTasks) {
    setTasks((ts) => [...newTasks, ...ts])
  }

  // A recurring task never stays done: completing it earns the points and moves it to its next slot.
  function completeTask(id, { proof = false } = {}) {
    const task = tasks.find((t) => t.id === id)
    if (!task || task.done) return
    const next = nextOccurrence(task.repeat)
    if (next) {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, due: next.toISOString(), snoozedUntil: null } : t)))
      setPokes((ps) => ps.filter((p) => p.taskId !== id))
    } else {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: true, proof } : t)))
    }
    const earned = POINTS_PER_TASK + (proof ? PROOF_BONUS : 0)
    setPoints((p) => p + earned)
    setCelebration({ task: task.title, earned, key: Date.now() })
  }

  // A new time makes the old pokes about the old time stale, so they go.
  function updateTask(id, changes) {
    const task = tasks.find((t) => t.id === id)
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t)))
    if ('due' in changes && changes.due !== task?.due) setPokes((ps) => ps.filter((p) => p.taskId !== id))
  }

  function deleteTask(id) {
    setTasks((ts) => ts.filter((t) => t.id !== id))
    setPokes((ps) => ps.filter((p) => p.taskId !== id))
  }

  // Snoozing clears the task's pokes and holds the scheduler off for an hour.
  // The third snooze on the same task earns the joke crash screen.
  // Coins are points: earned by finishing, spent on games, lost by ignoring pokes. Never below zero.
  function spendPoints(n) {
    setPoints((p) => Math.max(0, p - n))
    return true
  }

  function snoozeTask(id) {
    setPokes((ps) => ps.filter((p) => p.taskId !== id))
    updateTask(id, { snoozedUntil: new Date(Date.now() + 3600000).toISOString() })
    spendPoints(SNOOZE_COST)
    const count = (snoozes[id] ?? 0) + 1
    if (count < 3) say(count === 1 ? `Snoozed. I'll be back. I always come back. (−${SNOOZE_COST} coin)` : `Snoozed again? Bold. Noted. (−${SNOOZE_COST} coin)`)
    setSnoozes((s) => ({ ...s, [id]: count >= 3 ? 0 : count }))
    if (count >= 3) setJoke({ taskId: id, key: Date.now() })
  }

  function reopenTask(id) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: false, proof: false } : t)))
  }

  function resetDemo() {
    setTasks([])
    setPokes([])
    setPoints(0)
    setStreak(0)
  }

  return (
    <StoreContext.Provider
      value={{
        name, setName, tasks, addTasks, completeTask, reopenTask, updateTask, deleteTask,
        pokes, setPokes, points, streak, setStreak,
        celebration, setCelebration, resetDemo, theme, setTheme, accents, setAccent,
        account, setAccount, signOut, replaceTasks: setTasks, replacePoints: setPoints, spendPoints, aboutTaskId, setAboutTaskId,
        tutorialSeen, tutorialOpen, openTutorial, closeTutorial,
        schedule, setSchedule, introSeen, setIntroSeen, snoozeTask, joke, setJoke,
        buddy, setBuddy, say, voiceOn, setVoiceOn, soundAsked, setSoundAsked, alarmOn, setAlarmOn, musicOn, setMusicOn, ambient, setAmbient, volume, setVolume, ambientAsked, setAmbientAsked, storyOpen, setStoryOpen, chat, addChat,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}
