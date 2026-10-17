import type { ViewId } from '@/state/viewer'

/**
 * Feste Blickrichtungen (Azimut um die Körperlängsachse, 0 = von vorn).
 * Der Körper steht mit Blick in +Z; seine rechte Seite liegt bei −X.
 */
export const VIEWS: Record<ViewId, { label: string; azimuth: number }> = {
  front: { label: 'Vorderansicht', azimuth: 0 },
  right: { label: 'Rechte Seite', azimuth: -Math.PI / 2 },
  back: { label: 'Rückansicht', azimuth: Math.PI },
  left: { label: 'Linke Seite', azimuth: Math.PI / 2 },
}

export const VIEW_CYCLE: ViewId[] = ['front', 'right', 'back', 'left']

/** Körpermaße des Modells (m): Höhe ≈ 1,72, Mittelpunkt in Hüfthöhe */
export const BODY = { height: 1.72, width: 0.68, center: [0, 0.88, 0] as const }

/** Abstand, bei dem der ganze Körper in das Bild passt (vertikales Sichtfeld fovDeg) */
export function fitDistance(fovDeg: number, aspect: number, height = BODY.height, width = BODY.width, margin = 1.12): number {
  const tan = Math.tan((fovDeg * Math.PI) / 360)
  const byHeight = height / 2 / tan
  const byWidth = width / 2 / (tan * aspect)
  return Math.max(byHeight, byWidth) * margin
}

/** Sinnvoller Betrachtungsabstand für eine Struktur der Größe size (m) */
export function focusDistance(size: readonly number[], fovDeg: number, aspect: number): number {
  const extent = Math.max(size[1], Math.max(size[0], size[2]) / Math.min(aspect, 1))
  const tan = Math.tan((fovDeg * Math.PI) / 360)
  return Math.min(Math.max((extent / 2 / tan) * 1.9, 0.18), 2.4)
}
