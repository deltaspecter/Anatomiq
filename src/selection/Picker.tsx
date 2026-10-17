/**
 * Antippen und Anklicken von Strukturen.
 * Ein „Tippen“ ist eine kurze Berührung ohne nennenswerte Bewegung – Drehen, Verschieben und
 * Pinch-Zoom lösen daher nie versehentlich eine Auswahl aus. Getroffen wird die vorderste
 * deckend sichtbare Struktur; durchscheinende und ausgeblendete Strukturen werden durchdrungen.
 * Doppeltippen richtet die Kamera auf die getroffene Struktur aus.
 * Mit der Maus zeigt ein Etikett den Namen der Struktur unter dem Zeiger (gedrosselt auf ein Bild).
 */
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Raycaster, Vector2, type Mesh } from 'three'
import { allMeshes } from '@/scene/registry'
import { useViewer } from '@/state/viewer'
import { handleTap } from './tap'

const MAX_MOVE_PX = 8
const MAX_TAP_MS = 500
const DOUBLE_TAP_MS = 320

const raycaster = new Raycaster()
;(raycaster as Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true

export function Picker() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const el = gl.domElement
    const active = new Map<number, { x: number; y: number; t: number }>()
    let multiTouch = false
    let lastTap = { t: 0, id: null as string | null }

    const pick = (clientX: number, clientY: number): string | null => {
      const rect = el.getBoundingClientRect()
      const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const candidates: Mesh[] = []
      for (const mesh of allMeshes()) if (mesh.visible && mesh.userData.pickable) candidates.push(mesh)
      const hit = raycaster.intersectObjects(candidates, false)[0]
      return (hit?.object.userData.structureId as string | undefined) ?? null
    }

    let hoverFrame = 0
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (e.buttons) {
        if (useViewer.getState().hover) useViewer.getState().setHover(null)
        return
      }
      const { clientX, clientY } = e
      cancelAnimationFrame(hoverFrame)
      hoverFrame = requestAnimationFrame(() => {
        const id = pick(clientX, clientY)
        const current = useViewer.getState().hover
        if (!id) {
          if (current) useViewer.getState().setHover(null)
          el.style.cursor = ''
        } else {
          useViewer.getState().setHover({ id, x: clientX, y: clientY })
          el.style.cursor = 'pointer'
        }
      })
    }
    const leave = () => {
      cancelAnimationFrame(hoverFrame)
      useViewer.getState().setHover(null)
      el.style.cursor = ''
    }

    const down = (e: PointerEvent) => {
      active.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() })
      if (active.size > 1) multiTouch = true
    }
    const up = (e: PointerEvent) => {
      const start = active.get(e.pointerId)
      active.delete(e.pointerId)
      if (!start) return
      const wasMulti = multiTouch
      if (active.size === 0) multiTouch = false
      if (wasMulti || e.button > 0) return
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
      if (moved > MAX_MOVE_PX || performance.now() - start.t > MAX_TAP_MS) return
      const id = pick(e.clientX, e.clientY)
      const now = performance.now()
      const double = now - lastTap.t < DOUBLE_TAP_MS && id !== null && id === lastTap.id
      lastTap = { t: now, id }
      handleTap(id, double)
    }
    const cancel = (e: PointerEvent) => {
      active.delete(e.pointerId)
      if (active.size === 0) multiTouch = false
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(hoverFrame)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
    }
  }, [gl, camera])

  return null
}
