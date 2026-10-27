import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Pokey: a smiling finger that pokes things. Colours come from the active theme;
// idle wiggle, blinking and poking are GSAP timelines.
const fill = (v) => ({ fill: `var(${v})` })
const line = (v) => ({ stroke: `var(${v})` })

export default function Mascot({ size = 96, poking = false, wiggle = false, talking = false }) {
  const root = useRef(null)
  const body = useRef(null)
  const eyes = useRef(null)
  const mouth = useRef(null)

  // Talking: the mouth opens and closes at a speech-ish rhythm.
  useEffect(() => {
    if (!talking || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tween = gsap.to(mouth.current, {
      scaleY: 2.6, transformOrigin: '50% 0%', duration: 0.11, yoyo: true, repeat: -1, ease: 'sine.inOut',
      repeatRefresh: true,
    })
    return () => {
      tween.kill()
      gsap.set(mouth.current, { scaleY: 1 })
    }
  }, [talking])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.to(eyes.current, {
        scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1,
        repeatDelay: 0.05, delay: 2, ease: 'power1.inOut',
        onComplete() { this.delay(2 + Math.random() * 3).restart(true) },
      })
      if (wiggle) {
        gsap.fromTo(root.current, { rotate: -5 }, { rotate: 5, transformOrigin: '50% 90%', duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      }
      if (poking) {
        gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
          .to(body.current, { x: 10, y: -4, rotate: -8, transformOrigin: '50% 100%', duration: 0.12, ease: 'power2.in' })
          .to(body.current, { x: 0, y: 0, rotate: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' })
          .to(body.current, { x: 10, y: -4, rotate: -8, duration: 0.12, ease: 'power2.in' })
          .to(body.current, { x: 0, y: 0, rotate: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' })
      }
    }, root)
    return () => ctx.revert()
  }, [poking, wiggle])

  return (
    <svg ref={root} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Pokey the poking finger" className="shrink-0 overflow-visible">
      <g ref={body}>
        <rect x="22" y="58" width="58" height="48" rx="22" style={{ ...fill('--mascot'), ...line('--mascot-line') }} strokeWidth="3" />
        <rect x="58" y="14" width="24" height="60" rx="12" style={{ ...fill('--mascot'), ...line('--mascot-line') }} strokeWidth="3" />
        <path d="M63 22h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".6" />
        <path d="M34 72v10M46 70v12" style={line('--mascot-line')} strokeWidth="3" strokeLinecap="round" />
        <g ref={eyes}>
          <circle cx="40" cy="88" r="3.5" style={fill('--mascot-face')} />
          <circle cx="58" cy="88" r="3.5" style={fill('--mascot-face')} />
        </g>
        <path ref={mouth} d="M42 96c4 4 10 4 14 0" style={line('--mascot-face')} strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
      <path d="M98 20l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" style={fill('--highlight')} />
    </svg>
  )
}
