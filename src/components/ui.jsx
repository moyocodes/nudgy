// Shared buttons and badges.
import { motion } from 'framer-motion'
import { CheckIcon } from './Icons.jsx'

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const styles = {
    // shadow-btn is the theme's button shadow: hard offset in Sassy, none elsewhere.
    primary: 'bg-primary text-on-primary shadow-btn hover:bg-primary-dark',
    secondary: 'bg-primary text-on-primary shadow-btn hover:bg-primary-dark',
    ghost: 'border-[length:var(--bw)] border-line bg-surface text-ink shadow-btn hover:bg-ink/5',
  }
  const sizes = {
    sm: 'min-h-10 px-4 text-sm',
    md: 'min-h-12 px-5 text-[15px]',
  }
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-40 ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

const PRIORITY = {
  high: 'bg-primary',
  medium: 'bg-highlight',
  low: 'bg-ink/25',
}

// A coloured dot rather than a loud pill: priority is a hint, not a headline.
export function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink/50" title={`${priority} priority`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY[priority]}`} />
      <span className="capitalize">{priority}</span>
    </span>
  )
}

// "Complete" badge for a proof photo. Compact = just the tick, for thumbnails.
export function ProofBadge({ complete, compact = false, className = '' }) {
  // Only ever says "Complete"; there is no "Incomplete" state. Without proof, nothing is shown.
  if (!complete) return null
  if (compact) {
    return (
      <span title="Proof complete" className={`grid h-4 w-4 place-items-center rounded-full bg-success text-on-primary ring-2 ring-surface ${className}`}>
        <CheckIcon size={10} strokeWidth={3} />
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-on-primary shadow-card ${className}`}>
      <CheckIcon size={12} strokeWidth={2.5} /> Complete
    </span>
  )
}

export function Card({ className = '', ...props }) {
  return (
    <div
      className={`rounded-3xl bg-surface p-5 shadow-card border-[length:var(--bw)] border-line ${className}`}
      {...props}
    />
  )
}
