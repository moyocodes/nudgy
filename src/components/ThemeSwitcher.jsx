import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store.jsx'
import { THEMES } from '../lib/themes.js'
import { CheckIcon, ChevronIcon } from './Icons.jsx'

function Swatch({ colors, size = 'h-4 w-4' }) {
  return (
    <span className="flex -space-x-1.5">
      {colors.slice(0, 3).map((c) => (
        <span key={c} className={`${size} rounded-full ring-2 ring-surface outline outline-1 -outline-offset-1 outline-ink/10`} style={{ background: c }} />
      ))}
    </span>
  )
}

// Always-visible personality/theme picker in the top bar.
export default function ThemeSwitcher() {
  const { theme, setTheme, name } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Personality: ${current.name}`}
        className="flex min-h-10 items-center gap-1.5 rounded-full border-[length:var(--bw)] border-line bg-surface px-2.5 text-sm font-semibold"
      >
        <Swatch colors={current.swatch} />
        <span className="hidden sm:inline">{current.name}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink/50"><ChevronIcon size={16} /></motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border-[length:var(--bw)] border-line bg-surface p-1.5 shadow-card"
          >
            {THEMES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={theme === t.id}
                  onClick={() => {
                    setTheme(t.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-ink/5 ${
                    theme === t.id ? 'bg-ink/5' : ''
                  }`}
                >
                  <Swatch colors={t.swatch} size="h-5 w-5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t.name}</span>
                    <span className="block text-xs text-ink/55">“{t.sample(name || 'Friend')}”</span>
                  </span>
                  {theme === t.id && <CheckIcon size={18} className="text-primary" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
