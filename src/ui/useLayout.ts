import { useSyncExternalStore } from 'react'

/** Breite Ansicht (Tablet quer, Desktop): Informationspanel seitlich statt als Bottom-Sheet */
const QUERY = '(min-width: 900px)'

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
export const SIDE_PANEL_WIDTH = 400
