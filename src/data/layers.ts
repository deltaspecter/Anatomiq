/**
 * Anatomische Darstellungsebenen. Jede Struktur gehört genau einer Ebene an;
 * jede Ebene wird als eigene GLB-Datei geladen (public/models/<id>.glb),
 * damit selten benötigte Ebenen (z. B. Muskulatur) erst bei Bedarf geladen werden.
 */
export const LAYER_IDS = ['skin', 'skeleton', 'muscles', 'organs', 'nervous', 'vessels'] as const
export type LayerId = (typeof LAYER_IDS)[number]

/** Sichtbarkeit einer Ebene oder Struktur: sichtbar, transparent (durchscheinend, nicht antippbar) oder ausgeblendet */
export type Visibility = 'visible' | 'ghost' | 'hidden'

export type LayerInfo = {
  id: LayerId
  label: string
  /** Darstellung beim ersten Start */
  initial: Visibility
  /** Grundfarbe der Ebene (sRGB) */
  color: string
  /** Rauheit des Materials */
  roughness: number
}

export const LAYERS: Record<LayerId, LayerInfo> = {
  skin: { id: 'skin', label: 'Haut', initial: 'ghost', color: '#d9b6a0', roughness: 0.75 },
  muscles: { id: 'muscles', label: 'Muskeln', initial: 'hidden', color: '#b5463f', roughness: 0.6 },
  skeleton: { id: 'skeleton', label: 'Skelett', initial: 'visible', color: '#e8dfcc', roughness: 0.55 },
  organs: { id: 'organs', label: 'Organe', initial: 'visible', color: '#c27a6a', roughness: 0.5 },
  vessels: { id: 'vessels', label: 'Gefäße', initial: 'visible', color: '#b8343a', roughness: 0.45 },
  nervous: { id: 'nervous', label: 'Nerven', initial: 'visible', color: '#e5c97a', roughness: 0.55 },
}

/** Reihenfolge von außen nach innen – so erscheinen die Ebenen in der Ebenenleiste */
export const LAYER_ORDER: LayerId[] = ['skin', 'muscles', 'skeleton', 'organs', 'vessels', 'nervous']
