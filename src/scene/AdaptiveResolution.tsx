/**
 * Passt bei „Darstellungsqualität: Automatisch“ die Pixeldichte an die tatsächliche Leistung an.
 * Gemessen wird nur, während fortlaufend gerendert wird (Drehen, Zoomen, Kamerafahrten) – im Ruhezustand
 * entstehen wegen frameloop="demand" keine Bilder. Liegt die Bildrate dabei dauerhaft unter etwa 30 fps,
 * wird die Pixeldichte stufenweise gesenkt (höchstens bis 1×). Die Auflösung steigt in der Sitzung nicht wieder,
 * damit die Darstellung nicht hin- und herspringt.
 */
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

const SAMPLES = 45
const SLOW_MS = 34
const MAX_GAP_MS = 120
const MAX_GAP_WHILE_TOUCHING_MS = 1500

export function AdaptiveResolution({ enabled }: { enabled: boolean }) {
  const setDpr = useThree((s) => s.setDpr)
  const gl = useThree((s) => s.gl)
  const state = useRef({ last: 0, deltas: [] as number[], pointers: 0 })

  // Solange ein Finger bzw. die Maustaste auf dem Modell liegt, wird interagiert – auch sehr langsame
  // Bildfolgen zählen dann als Bewegung und nicht als Ruhezustand
  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      if (e.target === el) state.current.pointers++
    }
    const up = () => (state.current.pointers = Math.max(0, state.current.pointers - 1))
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl])

  useFrame(() => {
    if (!enabled) return
    const now = performance.now()
    const s = state.current
    const delta = now - s.last
    s.last = now
    // Nur zusammenhängende Bildfolgen werten; eine Pause bedeutet Ruhezustand, keine schlechte Leistung
    if (delta > (s.pointers > 0 ? MAX_GAP_WHILE_TOUCHING_MS : MAX_GAP_MS)) {
      s.deltas = []
      return
    }
    s.deltas.push(delta)
    // Genug Messwerte: 45 Bilder oder – bei sehr langsamer Darstellung – mindestens 3 Bilder in 1,5 s
    const total = s.deltas.reduce((a, b) => a + b, 0)
    if (s.deltas.length < SAMPLES && !(s.deltas.length >= 3 && total >= 1500)) return
    const avg = total / s.deltas.length
    s.deltas = []
    const current = gl.getPixelRatio()
    if (avg > SLOW_MS && current > 1) setDpr(Math.max(1, Math.round((current - 0.5) * 10) / 10))
  })
  return null
}
