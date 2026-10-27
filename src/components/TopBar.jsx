import { Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import Mascot from './Mascot.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'
import Counter from './Counter.jsx'
import SoundButton from './SoundButton.jsx'
import { StarIcon } from './Icons.jsx'

export default function TopBar() {
  const { points, openTutorial, account, signOut } = useStore()
  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-2 lg:max-w-5xl">
        <Link to="/" className="flex items-center gap-1.5">
          <Mascot size={28} />
          <span className="font-display text-xl">Pokey</span>
        </Link>
        <Link
          to="/rewards"
          className="ml-auto flex min-h-10 items-center gap-1.5 rounded-full border-[length:var(--bw)] border-line bg-surface px-3 text-sm font-semibold"
          aria-label={`${points} points`}
        >
          <StarIcon size={16} className="text-ink/50" /> <Counter value={points} />
        </Link>
        <button
          type="button"
          onClick={openTutorial}
          aria-label="How to use Pokey"
          title="How to use Pokey"
          className="hidden h-10 w-10 place-items-center rounded-full border-[length:var(--bw)] border-line bg-surface text-sm font-semibold text-ink/60 hover:text-ink sm:grid"
        >
          ?
        </button>
        {/* On phones the speaker takes the "?" spot; help lives on the Me page there. */}
        <SoundButton />
        <ThemeSwitcher />
        {account ? (
          <button
            type="button"
            onClick={signOut}
            title={`Log out of ${account.email}`}
            className="hidden min-h-10 items-center rounded-full border-[length:var(--bw)] border-line bg-surface px-3 text-sm font-semibold text-ink/60 hover:text-ink sm:flex"
          >
            Log out
          </button>
        ) : (
          // Entering your name isn't an account; this is the optional email login that syncs devices.
          <Link to="/settings#account" title="Log in with your email to sync your phone and laptop" className="hidden min-h-10 items-center rounded-full border-[length:var(--bw)] border-line bg-surface px-3 text-sm font-semibold text-ink/60 hover:text-ink sm:flex">
            Sync devices
          </Link>
        )}
      </div>
    </header>
  )
}
