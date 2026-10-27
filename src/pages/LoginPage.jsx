import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import Mascot from '../components/Mascot.jsx'
import AccountCard from '../components/AccountCard.jsx'
import { Card } from '../components/ui.jsx'

// For a new device: log in and pull everything down, instead of starting from scratch.
export default function LoginPage() {
  const { account, name } = useStore()
  const navigate = useNavigate()

  // Once signed in and the account's name has synced down, go straight to Today.
  useEffect(() => {
    if (account && name) navigate('/', { replace: true })
  }, [account, name, navigate])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
      <Mascot size={72} />
      <h1 className="text-center font-display text-[2rem] leading-tight">Welcome back.</h1>
      <Card className="w-full max-w-sm">
        <AccountCard />
      </Card>
      <Link to="/welcome" className="text-sm font-semibold text-ink/50 hover:text-ink">New here? Start fresh</Link>
    </div>
  )
}
