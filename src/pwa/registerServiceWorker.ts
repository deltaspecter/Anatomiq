/**
 * Registriert den Service Worker (nur im Produktions-Build und nur über https bzw. localhost).
 * Ein neuer Service Worker wartet, bis der Nutzer „Aktualisieren“ wählt – niemand bekommt mitten
 * in der Exploration eine neue Version untergeschoben.
 */
import { create } from 'zustand'

type UpdateState = { waiting: ServiceWorker | null; offlineReady: boolean }
export const useUpdate = create<UpdateState>()(() => ({ waiting: null, offlineReady: false }))

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      if (!reg) return
      const track = (worker: ServiceWorker | null) => {
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) useUpdate.setState({ waiting: worker })
            else useUpdate.setState({ offlineReady: true })
          }
        })
      }
      if (reg.waiting && navigator.serviceWorker.controller) useUpdate.setState({ waiting: reg.waiting })
      track(reg.installing)
      reg.addEventListener('updatefound', () => track(reg.installing))
      // Neu laden nur nach einem bewusst angeforderten Update – nicht, wenn der erste Service Worker
      // die Seite übernimmt (das würde laufende Modell-Downloads abbrechen)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateRequested) location.reload()
      })
    } catch (error) {
      console.warn('Service Worker nicht registriert', error)
    }
  })
}

let updateRequested = false
export function applyUpdate() {
  updateRequested = true
  useUpdate.getState().waiting?.postMessage('SKIP_WAITING')
}
