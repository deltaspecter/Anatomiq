/**
 * Überträgt den Darstellungszustand (Ebenen, Einzel-Einstellungen, Isolation, Auswahl, Quiz-Rückmeldung)
 * auf die geladenen Meshes. Läuft nur bei Zustandsänderungen, nicht pro Bild.
 */
import { LAYERS, type LayerId } from '@/data/layers'
import { getStructure } from '@/data/structures'
import { effectiveVisibility } from '@/layers/visibility'
import { useLearn } from '@/learn/store'
import { useViewer } from '@/state/viewer'
import { getMaterial, type MaterialMode } from './materials'
import { allMeshes } from './registry'

let requestRender: () => void = () => {}
export const setRenderCallback = (fn: () => void) => {
  requestRender = fn
}

export function applyAllVisibility() {
  const viewer = useViewer.getState()
  const feedback = useLearn.getState().feedback
  for (const mesh of allMeshes()) {
    const id = mesh.name
    const layer = mesh.userData.layer as LayerId
    const visibility = effectiveVisibility(id, layer, viewer)
    mesh.visible = visibility !== 'hidden'
    mesh.userData.pickable = visibility === 'visible'
    if (!mesh.visible) continue
    const info = LAYERS[layer]
    const color = getStructure(id)?.color ?? info.color
    let mode: MaterialMode = visibility === 'ghost' ? 'ghost' : 'base'
    if (feedback?.id === id) mode = feedback.kind
    else if (viewer.selectedId === id) mode = 'selected'
    mesh.material = getMaterial(color, info.roughness, mode, layer === 'skin')
    // Durchscheinende Flächen nach den deckenden zeichnen, die Haut ganz zuletzt
    mesh.renderOrder = visibility === 'ghost' ? (layer === 'skin' ? 2 : 1) : 0
  }
  requestRender()
}

let unsubscribers: (() => void)[] = []
export function startVisibilitySync() {
  stopVisibilitySync()
  unsubscribers = [
    useViewer.subscribe((s, p) => {
      if (s.layers !== p.layers || s.overrides !== p.overrides || s.isolated !== p.isolated || s.selectedId !== p.selectedId) applyAllVisibility()
    }),
    useLearn.subscribe((s, p) => {
      if (s.feedback !== p.feedback) applyAllVisibility()
    }),
  ]
  applyAllVisibility()
}
export function stopVisibilitySync() {
  unsubscribers.forEach((u) => u())
  unsubscribers = []
}
