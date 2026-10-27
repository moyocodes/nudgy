import { useEffect, useState } from 'react'

// Chrome/Edge/Android fire "beforeinstallprompt"; we keep it and show our own Install button.
// iPhone has no such event, so it gets the two manual steps instead.
let deferred = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    window.dispatchEvent(new Event('pokey:installable'))
  })
}

const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone

export default function InstallButton({ className = '' }) {
  const [canInstall, setCanInstall] = useState(!!deferred)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    const on = () => setCanInstall(true)
    window.addEventListener('pokey:installable', on)
    return () => window.removeEventListener('pokey:installable', on)
  }, [])

  if (installed()) return null

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={async () => {
          deferred.prompt()
          await deferred.userChoice
          deferred = null
          setCanInstall(false)
        }}
        className={`min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-btn ${className}`}
      >
        Add Pokey to your home screen
      </button>
    )
  }

  if (isIOS) {
    return (
      <div className={className}>
        <button type="button" onClick={() => setShowSteps((s) => !s)} className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary shadow-btn">
          Add Pokey to your home screen
        </button>
        {showSteps && (
          <p className="mt-2 text-sm text-ink/60">Tap <strong>Share</strong> (the square with the arrow) at the bottom of Safari, then <strong>Add to Home Screen</strong>.</p>
        )}
      </div>
    )
  }

  return null
}
