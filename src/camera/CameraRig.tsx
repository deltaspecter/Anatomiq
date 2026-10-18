/**
 * Kamerasteuerung (camera-controls über drei):
 *   Ein Finger / linke Maustaste: drehen · Zwei Finger: Pinch-Zoom und verschieben · Mausrad: zoomen (zum Zeiger hin)
 *   Rechte Maustaste: verschieben · Trackpad (iPad, Mac): zwei Finger scrollen oder Pinch zoomt
 *   Tastatur (iPad mit Tastatur, Desktop): Pfeiltasten drehen, + / − zoomen, 0 Ausgangsansicht
 * Befehle aus dem Zustand (Zurücksetzen, feste Ansichten, Fokus auf eine Struktur) werden weich animiert;
 * jede Berührung unterbricht eine laufende Animation – der Nutzer behält immer die Kontrolle.
 *
 * Bei geöffnetem Informationspanel wird der Bildausschnitt per setViewOffset verschoben, damit die
 * ausgewählte Struktur nicht unter dem Panel verschwindet. Die Kameraposition selbst bleibt unverändert.
 */
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, PerspectiveCamera, Vector3 } from 'three'
import { modelMesh } from '@/data/model'
import { setTestControls } from '@/debug/testHook'
import { useViewer } from '@/state/viewer'
import { BODY, fitDistance, focusDistance, VIEWS } from './views'

const { ACTION } = CameraControlsImpl
export const FOV = 35

/** Bewegungsraum des Drehpunkts: etwas größer als der Körper */
const BOUNDARY = new Box3(new Vector3(-0.6, -0.1, -0.5), new Vector3(0.6, 1.9, 0.5))

export function CameraRig({ panelOffset }: { panelOffset: { x: number; y: number } }) {
  const ref = useRef<CameraControlsImpl>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const command = useViewer((s) => s.command)
  const offset = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const reset = (animate: boolean) => {
    const c = ref.current
    if (!c) return
    const d = fitDistance(FOV, size.width / size.height)
    c.setLookAt(0, BODY.center[1] + 0.05, d, 0, BODY.center[1], 0, animate)
  }

  // Grundeinstellungen und Startansicht
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.minDistance = 0.12
    c.maxDistance = 5
    c.smoothTime = 0.28
    c.draggingSmoothTime = 0.08
    c.dollyToCursor = true
    c.dollySpeed = 0.8
    c.azimuthRotateSpeed = 1
    c.polarRotateSpeed = 1
    c.setBoundary(BOUNDARY)
    c.mouseButtons.left = ACTION.ROTATE
    c.mouseButtons.right = ACTION.TRUCK
    c.mouseButtons.middle = ACTION.DOLLY
    c.mouseButtons.wheel = ACTION.DOLLY
    c.touches.one = ACTION.TOUCH_ROTATE
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK
    c.touches.three = ACTION.TOUCH_TRUCK
    reset(false)
    setTestControls(c)
    return () => setTestControls(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kamera-Befehle
  useEffect(() => {
    const c = ref.current
    if (!c || !command) return
    if (command.kind === 'reset') reset(true)
    else if (command.kind === 'view') {
      c.rotateTo(VIEWS[command.view].azimuth, Math.PI / 2, true)
    } else if (command.kind === 'focus') {
      const mesh = modelMesh(command.id)
      if (!mesh) return
      const [x, y, z] = mesh.center
      const ideal = focusDistance(mesh.size, FOV, size.width / size.height)
      // Sanfter Fokus (beim Antippen): nur heranholen, wenn die Struktur sehr klein im Bild ist
      const distance = command.close === false ? Math.min(c.distance, ideal * 2.6) : ideal
      c.moveTo(x, y, z, true)
      c.dollyTo(distance, true)
    }
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  useEffect(() => invalidate(), [panelOffset.x, panelOffset.y, size.width, size.height, invalidate])

  // Pinch auf dem Trackpad (Safari auf iPad und Mac meldet ihn als „gesture“-Ereignis, nicht als Touch).
  // Bei Pinch mit den Fingern auf dem Bildschirm kommen dieselben Ereignisse zusätzlich – dort zoomt
  // bereits camera-controls, daher wird dann nichts getan. Ebenso, wenn der Browser Strg+Mausrad schickt.
  const el = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const touches = new Set<number>()
    let lastWheel = 0
    let lastScale = 1
    const down = (e: PointerEvent) => e.pointerType === 'touch' && touches.add(e.pointerId)
    const up = (e: PointerEvent) => touches.delete(e.pointerId)
    const wheel = () => (lastWheel = performance.now())
    const start = (e: Event) => {
      lastScale = (e as Event & { scale?: number }).scale ?? 1
    }
    const change = (e: Event) => {
      const scale = (e as Event & { scale?: number }).scale
      const c = ref.current
      if (!c || !scale || touches.size || performance.now() - lastWheel < 300) return
      c.dollyTo(c.distance * (lastScale / scale), false)
      lastScale = scale
      invalidate()
    }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)
    el.addEventListener('wheel', wheel, { passive: true })
    el.addEventListener('gesturestart', start)
    el.addEventListener('gesturechange', change)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', up, true)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('gesturestart', start)
      el.removeEventListener('gesturechange', change)
    }
  }, [el, invalidate])

  // Tastatur: nur wenn kein Eingabe-/Bedienelement den Fokus hat und keine Zusatztaste gedrückt ist
  useEffect(() => {
    const STEP = Math.PI / 12
    const onKey = (e: KeyboardEvent) => {
      const c = ref.current
      const t = e.target as HTMLElement | null
      if (!c || e.metaKey || e.ctrlKey || e.altKey || t?.closest('input, textarea, select, [role="dialog"], [contenteditable]')) return
      if (t?.closest('button') && (e.key === 'Enter' || e.key === ' ')) return
      const actions: Record<string, () => void> = {
        ArrowLeft: () => c.rotate(STEP, 0, true),
        ArrowRight: () => c.rotate(-STEP, 0, true),
        ArrowUp: () => c.rotate(0, STEP / 2, true),
        ArrowDown: () => c.rotate(0, -STEP / 2, true),
        '+': () => c.dollyTo(c.distance / 1.25, true),
        '=': () => c.dollyTo(c.distance / 1.25, true),
        '-': () => c.dollyTo(c.distance * 1.25, true),
        '0': () => reset(true),
      }
      const action = actions[e.key]
      if (!action) return
      e.preventDefault()
      action()
      invalidate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height])

  // Bildausschnitt bei geöffnetem Panel verschieben (weich)
  useFrame(() => {
    const o = offset.current
    const dx = panelOffset.x - o.x
    const dy = panelOffset.y - o.y
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      // Auch nach Größenänderung (Drehen des iPads, Split View, Stage Manager) neu setzen
      if (o.x !== panelOffset.x || o.y !== panelOffset.y || o.w !== size.width || o.h !== size.height) {
        o.x = panelOffset.x
        o.y = panelOffset.y
        apply()
      }
      return
    }
    o.x += dx * 0.18
    o.y += dy * 0.18
    apply()
    invalidate()
    function apply() {
      o.w = size.width
      o.h = size.height
      if (o.x === 0 && o.y === 0) camera.clearViewOffset()
      else camera.setViewOffset(size.width, size.height, o.x, o.y, size.width, size.height)
    }
  })

  return <CameraControls ref={ref} makeDefault />
}
