import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../lib/store.jsx'

// Full-screen animated gradient behind the app. Colours follow the active theme.
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uMix;
  uniform vec2 uRes;
  uniform vec3 uBg;
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
  float blob(vec2 uv, vec2 c, float r) { return smoothstep(r, 0.0, length(uv - c)); }

  void main() {
    vec2 uv = vUv;
    uv.x *= uRes.x / uRes.y;
    float t = uTime * 0.06;
    vec2 warp = vec2(fbm(uv * 1.6 + t), fbm(uv * 1.6 - t + 4.0));

    vec2 p = uv + warp * 0.35;
    float a = blob(p, vec2(0.25 + 0.15 * sin(t * 3.0), 0.8), 0.75);
    float b = blob(p, vec2(1.1 + 0.2 * cos(t * 2.0), 0.25), 0.8);
    float c = blob(p, vec2(0.7, 0.45 + 0.2 * sin(t * 2.5)), 0.5);

    vec3 col = uBg;
    col = mix(col, uA, a * uMix);
    col = mix(col, uB, b * uMix * 0.8);
    col = mix(col, uC, c * uMix * 0.6);

    // fine grain so gradients don't band
    col += (hash(vUv * uRes + uTime) - 0.5) * 0.025;
    gl_FragColor = vec4(col, 1.0);
  }
`

function readTheme() {
  const css = getComputedStyle(document.documentElement)
  const c = (name) => new THREE.Color(css.getPropertyValue(name).trim() || '#000')
  return {
    bg: c('--bg'),
    a: c('--primary'),
    b: c('--accent'),
    c: c('--highlight'),
    mix: parseFloat(css.getPropertyValue('--bg-mix')) || 0.4,
  }
}

function GradientPlane({ theme, still }) {
  const mat = useRef()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMix: { value: 0.4 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uBg: { value: new THREE.Color() },
      uA: { value: new THREE.Color() },
      uB: { value: new THREE.Color() },
      uC: { value: new THREE.Color() },
    }),
    [],
  )

  // Read the CSS variables after the theme attribute has been applied.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const t = readTheme()
      uniforms.uBg.value.copy(t.bg)
      uniforms.uA.value.copy(t.a)
      uniforms.uB.value.copy(t.b)
      uniforms.uC.value.copy(t.c)
      uniforms.uMix.value = t.mix
    })
    return () => cancelAnimationFrame(id)
  }, [theme, uniforms])

  useFrame(({ clock, size }) => {
    uniforms.uRes.value.set(size.width, size.height)
    if (!still) uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthWrite={false} />
    </mesh>
  )
}

export default function Backdrop() {
  const { theme } = useStore()
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* linear: mix the CSS colours as-is. With colour management on, three.js mixes in linear
          space and re-encodes, which made a 7% tint look like 30%. */}
      <Canvas linear dpr={[1, 1.5]} gl={{ antialias: false, alpha: false }} frameloop={still ? 'demand' : 'always'}>
        <GradientPlane theme={theme} still={still} />
      </Canvas>
    </div>
  )
}
