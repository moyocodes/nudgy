import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Number that rolls up to its new value with GSAP.
export default function Counter({ value, className }) {
  const ref = useRef(null)
  const shown = useRef(value)

  useEffect(() => {
    const obj = { n: shown.current }
    const tween = gsap.to(obj, {
      n: value,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.n)
      },
    })
    if (value > shown.current && ref.current) {
      gsap.fromTo(ref.current, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
    }
    shown.current = value
    return () => tween.kill()
  }, [value])

  return <span ref={ref} className={`inline-block ${className ?? ''}`}>{value}</span>
}
