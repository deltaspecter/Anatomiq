/**
 * Schreibgeschützter Einblick in den Zustand für den automatisierten Browsertest (scripts/e2e-smoke.ts).
 * Liefert nur Momentaufnahmen; über window.__anatomiq lässt sich nichts verändern.
 */
import type { CameraControlsImpl } from '@react-three/drei'
import { Vector3 } from 'three'
import { loadedIds } from '@/scene/registry'
import { useViewer } from '@/state/viewer'

let controls: CameraControlsImpl | null = null
export const setTestControls = (c: CameraControlsImpl | null) => {
  controls = c
}

declare global {
  interface Window {
    __anatomiq?: { snapshot: () => unknown }
  }
}

window.__anatomiq = {
  snapshot: () => {
    const v = useViewer.getState()
    const target = controls?.getTarget(new Vector3()).toArray()
    const position = controls?.camera.position.toArray()
    return {
      selectedId: v.selectedId,
      panel: v.panel,
      layers: { ...v.layers },
      load: { ...v.load },
      isolated: v.isolated,
      loaded: loadedIds().length,
      camera: controls ? { target, position, distance: controls.distance } : null,
    }
  },
}
