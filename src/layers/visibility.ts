import { LAYER_IDS, LAYERS, type LayerId, type Visibility } from '@/data/layers'

export type VisibilityState = {
  layers: Record<LayerId, Visibility>
  /** Abweichungen einzelner Strukturen von ihrer Ebene */
  overrides: Record<string, Visibility>
  /** Isolierte Strukturen: nur sie sind sichtbar (die Haut bleibt zur Orientierung durchscheinend) */
  isolated: string[] | null
}

export const initialLayers = (): Record<LayerId, Visibility> =>
  Object.fromEntries(LAYER_IDS.map((id) => [id, LAYERS[id].initial])) as Record<LayerId, Visibility>

/**
 * Tatsächliche Darstellung einer Struktur.
 * – Isolation hat Vorrang vor allem anderen.
 * – Eine ausgeblendete Ebene blendet alle ihre Strukturen aus.
 * – Sonst gilt die Einstellung der Struktur, ersatzweise die der Ebene.
 */
export function effectiveVisibility(id: string, layer: LayerId, state: VisibilityState): Visibility {
  if (state.isolated) {
    if (state.isolated.includes(id)) return 'visible'
    if (layer === 'skin') return state.layers.skin === 'hidden' ? 'hidden' : 'ghost'
    return 'hidden'
  }
  const layerVisibility = state.layers[layer]
  if (layerVisibility === 'hidden') return 'hidden'
  return state.overrides[id] ?? layerVisibility
}

/** Nur deckend dargestellte Strukturen lassen sich antippen; durchscheinende lassen den Blick (und den Finger) durch */
export const isPickable = (v: Visibility) => v === 'visible'

/** Hat der Nutzer irgendetwas an der Darstellung verändert? (für „Darstellung zurücksetzen“) */
export function isModified(state: VisibilityState): boolean {
  if (state.isolated) return true
  if (Object.keys(state.overrides).length) return true
  const initial = initialLayers()
  return LAYER_IDS.some((id) => state.layers[id] !== initial[id])
}

/** Ebenen-Schalter: sichtbar → transparent → ausgeblendet → sichtbar */
export function nextVisibility(v: Visibility): Visibility {
  return v === 'visible' ? 'ghost' : v === 'ghost' ? 'hidden' : 'visible'
}
