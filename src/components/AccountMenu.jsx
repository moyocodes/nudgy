import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'

// Shows that you're signed in (your initial), and opens a small menu: who you are, Today, Me, Log out.
export default function AccountMenu() {
  const { account, name, signOut } = useStore()
  const [open, setOpen] = useState(false)
  const box = useRef(null)

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

  if (!account) return null
  const initial = (name || account.email || '?').trim().charAt(0).toUpperCase()
  const item = 'block rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-ink/5'

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Signed in as ${account.email}`}
        title={`Signed in as ${account.email}`}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-on-primary"
      >
        {initial}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-bg" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border-[length:var(--bw)] border-line bg-surface p-2 shadow-card">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">Signed in</p>
            <p className="mt-0.5 truncate text-sm font-medium">{account.email}</p>
          </div>
          <Link to="/" onClick={() => setOpen(false)} className={item}>Go to Today</Link>
          <Link to="/settings" onClick={() => setOpen(false)} className={item}>Me and settings</Link>
          <button type="button" onClick={() => { setOpen(false); signOut() }} className={`${item} w-full text-accent`}>Log out</button>
        </div>
      )}
    </div>
  )
}
