import { useSyncExternalStore } from 'react'

/**
 * Breite Ansicht: Informationspanel seitlich statt als Bottom-Sheet.
 *   – Desktop und iPad im Querformat (ab 900 px Breite)
 *   – iPad im Hochformat und große Split-View-/Stage-Manager-Fenster (ab 680 × 900 px): Der stehende
 *     Körper ist schmal und hoch – daneben ist Platz, unter einem Bottom-Sheet würde er zur Hälfte verschwinden.
 *   – Smartphone im Querformat (ab 640 px): Ein Bottom-Sheet wäre höher als der halbe Bildschirm.
 */
const QUERY = '(min-width: 900px), (min-width: 680px) and (min-height: 900px), (orientation: landscape) and (min-width: 640px)'

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  window.addEventListener('resize', cb)
  return () => {
    mq.removeEventListener('change', cb)
    window.removeEventListener('resize', cb)
  }
}

export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)
}

export function useViewport(): { width: number; height: number } {
  const key = useSyncExternalStore(subscribe, () => `${window.innerWidth}x${window.innerHeight}`)
  const [width, height] = key.split('x').map(Number)
  return { width, height }
}

/** Höhe des eingeklappten Panels (Bottom-Sheet) in px */
export const peekHeight = (viewportHeight: number) => Math.round(Math.min(Math.max(viewportHeight * 0.42, 250), 400))
/** Breite des Seitenpanels: knapp die Hälfte des Bildschirms, mindestens 320 px (lesbar), höchstens 400 px (große Displays 420 px) */
export const sidePanelWidth = (viewportWidth: number) => Math.round(Math.min(viewportWidth >= 1200 ? 420 : 400, Math.max(320, viewportWidth * 0.46)))
/** Größte Breite des Bottom-Sheets: auf schmalen Tablet-Fenstern (Split View) schwebt es mittig statt über die ganze Breite */
export const SHEET_MAX_WIDTH = 600
