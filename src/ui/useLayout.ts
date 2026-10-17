import { useSyncExternalStore } from 'react'

/**
 * Breite Ansicht (Desktop, Tablet, Smartphone im Querformat): Informationspanel seitlich statt als Bottom-Sheet.
 * Im Querformat wäre ein Bottom-Sheet höher als der halbe Bildschirm und würde das Modell verdecken.
 */
const QUERY = '(min-width: 900px), (orientation: landscape) and (min-width: 640px)'

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
/** Breite des Seitenpanels: höchstens 400 px bzw. knapp die Hälfte des Bildschirms */
export const sidePanelWidth = (viewportWidth: number) => Math.round(Math.min(400, viewportWidth * 0.46))
