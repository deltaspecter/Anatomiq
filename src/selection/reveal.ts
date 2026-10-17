import { layerOf } from '@/data/model'
import { usePrefs } from '@/state/prefs'
import { useViewer } from '@/state/viewer'

/**
 * Struktur auswählen und sicher sichtbar machen (z. B. aus Favoriten oder „Verwandte Strukturen“):
 * Ebene einblenden, Einzel-Ausblendung aufheben, Isolation verlassen, wenn die Struktur nicht dazugehört.
 */
export function revealAndSelect(id: string) {
  const viewer = useViewer.getState()
  const layer = layerOf(id)
  if (!layer) return
  if (viewer.isolated && !viewer.isolated.includes(id)) viewer.isolate(null)
  if (viewer.layers[layer] !== 'visible') {
    // Nur diese Struktur deckend zeigen, die übrige Ebene bleibt wie sie war
    if (viewer.layers[layer] === 'hidden') viewer.setLayer(layer, 'ghost')
    viewer.setOverride(id, 'visible')
  } else if (viewer.overrides[id]) viewer.setOverride(id, null)
  viewer.select(id)
  usePrefs.getState().pushRecent(id)
  viewer.camera({ kind: 'focus', id })
}
