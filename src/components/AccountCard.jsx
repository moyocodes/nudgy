import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { deviceName, loginStatus, startLogin, submitCode } from '../lib/account.js'

const field = 'w-full rounded-xl border-[length:var(--bw)] border-line bg-bg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary'
const primaryBtn = 'min-h-10 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-btn disabled:opacity-40'

// Sign in with just an email: Pokey emails a link and a code that confirm this device.
// While waiting, it checks every few seconds in case the link was opened on another device.
export default function AccountCard() {
  const { account, setAccount, signOut } = useStore()
  const [email, setEmail] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pendingId) return
    const id = setInterval(async () => {
      try {
        const s = await loginStatus()
        if (s.session) {
          setAccount({ email: s.email, session: s.session })
          setPendingId(null)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(id)
  }, [pendingId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      setPendingId((await startLogin(email.trim())).pendingId)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function check(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const s = await submitCode(pendingId, code)
      setAccount({ email: s.email, session: s.session })
      setPendingId(null)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (account) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-display text-xl">Synced</span>
          <span className="block truncate text-sm text-ink/55">{account.email} · {deviceName()}</span>
        </span>
        <button type="button" onClick={signOut} className="min-h-10 shrink-0 rounded-full border-[length:var(--bw)] border-line px-4 text-sm font-semibold text-ink/70 hover:bg-ink/5">
          Log out
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-display text-xl">Log in to sync</h2>
      <p className="mt-1 text-sm text-ink/55">
        {pendingId
          ? `I emailed ${email.trim()} a link and a code. Open the link (on any device) or type the code here.`
          : 'Same tasks, chat and points on your phone and laptop. No password: I email you to confirm each device.'}
      </p>
      {pendingId ? (
        <form onSubmit={check} className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            aria-label="Code from the email"
            className={`${field} tracking-widest`}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>Confirm</button>
        </form>
      ) : (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" autoComplete="email" className={field} />
          <button type="submit" disabled={busy || !email.trim()} className={primaryBtn}>{busy ? 'Sending…' : 'Email me'}</button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-accent">{error}</p>}
      {pendingId && (
        <button type="button" onClick={() => { setPendingId(null); setCode(''); setError('') }} className="mt-2 text-xs font-semibold text-ink/50 hover:text-ink">
          Use a different email
        </button>
      )}
    </div>
  )
}
