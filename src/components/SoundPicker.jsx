import { useStore } from '../lib/store.jsx'
import { AMBIENT_SOUNDS } from '../lib/ambient.js'

// Background sound chips (Off / Rain / Fire / Waves) plus the one volume for every sound. Used on Today, Me and the top bar.
export default function SoundPicker({ compact = false }) {
  const { ambient, setAmbient, volume, setVolume } = useStore()
  return (
    <>
      <div role="radiogroup" aria-label="Background sound" className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2' : 'mt-3'}`}>
        {[[null, '🔇', 'Off'], ...AMBIENT_SOUNDS].map(([id, icon, label]) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={ambient === id}
            onClick={() => setAmbient(id)}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors ${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${ambient === id ? 'bg-primary text-on-primary' : 'bg-ink/5 text-ink/70 hover:bg-ink/10'}`}
          >
            <span aria-hidden>{icon}</span> {label}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-3 text-xs font-medium text-ink/60">
        <span className="shrink-0">Volume <span className="text-ink/40">(all sounds)</span></span>
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume for all sounds" className="flex-1 accent-[var(--primary)]" />
      </label>
    </>
  )
}
