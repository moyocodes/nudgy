import { AnimatePresence } from 'framer-motion'
import { useStore } from '../lib/store.jsx'
import Story from './Story.jsx'
import { BellIcon, CameraIcon, CheckIcon, MicIcon, PencilIcon, TrophyIcon } from './Icons.jsx'

// "How to use Pokey", told in the same tap-through story format as the daily rundown.
const SLIDES = [
  { kind: 'tip', Icon: MicIcon, scene: 'dump', try: 'tap the mic.', eyebrow: 'Step 1', title: 'Dump it all.', body: 'Tap the mic or type. "Tomorrow 5pm, go to Yinka\'s" is plenty. Say "send" when you\'re done.' },
  { kind: 'tip', Icon: CheckIcon, scene: 'tasks', try: 'tick the first one, or swipe it right.', eyebrow: 'Step 2', title: 'I sort it into tasks.', body: 'Each one gets a time and priority. Tap the circle when it\'s done.' },
  { kind: 'tip', Icon: PencilIcon, scene: 'edit', try: 'tap the pencil.', eyebrow: 'Step 3', title: 'Got something wrong?', body: 'Tap the pencil (or the time) to change the title, date or priority.' },
  { kind: 'tip', Icon: BellIcon, scene: 'poke', try: 'hit Snooze. See what happens.', eyebrow: 'Step 4', title: 'I poke you.', body: 'When something\'s due I nudge you by name. Ignore me and I get a little louder.' },
  { kind: 'tip', Icon: CameraIcon, scene: 'proof', try: 'tap the shutter.', eyebrow: 'Step 5', title: 'Pics or it didn\'t happen.', body: 'Real-world tasks have a camera. Snap proof for bonus points.' },
  { kind: 'tip', Icon: TrophyIcon, scene: 'badge', try: 'tap the badge.', eyebrow: 'Step 6', title: 'Earn your bragging rights.', body: 'Points, streaks and badges. Tap a badge to see it up close.' },
  { kind: 'end', title: 'That\'s it.', body: 'Each morning I\'ll give you a quick rundown. Tap the left or right side to skip, hold to pause.' },
]

export default function Tutorial() {
  const { tutorialOpen, closeTutorial } = useStore()
  return (
    <AnimatePresence>
      {tutorialOpen && <Story slides={SLIDES} title="How Pokey works" endLabel="Let's go" onClose={closeTutorial} />}
    </AnimatePresence>
  )
}
