import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BellIcon, HomeIcon, TrophyIcon, UserIcon } from './Icons.jsx'
import { useStore } from '../lib/store.jsx'

const LINKS = [
  { to: '/', label: 'Today', Icon: HomeIcon },
  { to: '/nudges', label: 'Nudges', Icon: BellIcon },
  { to: '/rewards', label: 'Rewards', Icon: TrophyIcon },
  { to: '/settings', label: 'Me', Icon: UserIcon },
]

// True while the user is scrolling down, so the mobile bar can tuck itself away.
function useScrollingDown() {
  const [down, setDown] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) > 6) setDown(y > last && y > 80)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return down
}

// Floating bottom tab bar with a sliding active pill. Tucks away while scrolling down.
export default function Nav() {
  const hidden = useScrollingDown()
  const { account } = useStore()

  return (
      <motion.nav
        animate={{ y: hidden ? 96 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        className="fixed inset-x-0 bottom-3 z-30 px-4"
      >
        <ul className="mx-auto flex max-w-sm rounded-full border-[length:var(--bw)] border-line bg-surface/90 p-1 shadow-card backdrop-blur-md">
          {LINKS.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                aria-label={to === '/settings' && account ? `Me, signed in as ${account.email}` : undefined}
                title={to === '/settings' && account ? `Signed in as ${account.email}` : undefined}
                className="relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-ink/[0.06]"
                        transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      />
                    )}
                    <span className="relative">
                      <Icon size={19} className={isActive ? 'text-primary' : 'text-ink/45'} />
                      {/* Signed in to sync: a small dot on Me. */}
                      {to === '/settings' && account && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-surface" />}
                    </span>
                    <span className={`relative ${isActive ? 'text-ink' : 'text-ink/45'}`}>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </motion.nav>
  )
}
