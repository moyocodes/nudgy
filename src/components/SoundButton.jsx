import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import SoundPicker from './SoundPicker.jsx'

// Top-bar speaker: opens background sound + the one volume for every sound, from any page.
export default function SoundButton() {
  const { volume, ambient, muted } = useStore()
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  // Tapping anywhere else, or Esc, closes it.
  useEffect(() => {
    if (!open) return
    const away = (e) => !box.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Sound and volume"
        title="Sound and volume"
        className={`grid h-10 w-10 place-items-center rounded-full border-[length:var(--bw)] border-line bg-surface text-base ${ambient && !muted ? 'ring-2 ring-primary/40' : ''}`}
      >
        {muted || volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : '🔊'}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border-[length:var(--bw)] border-line bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">Sound</p>
          <SoundPicker compact />
        </div>
      )}
    </div>
  )
}
