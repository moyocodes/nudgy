import gsap from 'gsap'

// GSAP confetti burst from a point on screen, in the active theme's colours.
// Used for task completions and when a badge is opened.
// Reduced motion gets a small, short burst rather than none, so finishing a task still feels like something.
export function confettiBurst({ x = window.innerWidth / 2, y = window.innerHeight * 0.6, count = 70 } = {}) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (calm) count = Math.min(count, 18)
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  // Above everything, including the rundown and other full-screen layers.
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:100'
  document.body.appendChild(layer)

  const css = getComputedStyle(document.documentElement)
  const colors = ['--primary', '--accent', '--highlight', '--success'].map((v) => css.getPropertyValue(v))
  const w = window.innerWidth
  const h = window.innerHeight
  let left = count
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:7px;height:${7 + Math.random() * 7}px;border-radius:2px;background:${colors[i % colors.length]}`
    layer.appendChild(p)
    gsap.timeline({ onComplete: () => --left === 0 && layer.remove() })
      .to(p, { x: (Math.random() - 0.5) * w * 0.9, y: -h * (0.25 + Math.random() * 0.35), rotate: Math.random() * 720, duration: 0.7, ease: 'power3.out' })
      .to(p, { y: `+=${h * 0.8}`, rotate: '+=360', opacity: 0, duration: 1.4 + Math.random(), ease: 'power1.in' })
  }
}
