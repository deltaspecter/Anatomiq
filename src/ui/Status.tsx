/** Statusanzeigen: Ladefortschritt, Fehlermeldungen, kurze Hinweise, Update-Hinweis, Gestenhilfe */
import { Hand, Loader2, Move, Pointer, RefreshCw, TriangleAlert, ZoomIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LAYER_IDS, LAYERS, type LayerId } from '@/data/layers'
import { applyUpdate, useUpdate } from '@/pwa/registerServiceWorker'
import { retryLayer } from '@/scene/AnatomyModel'
import { usePrefs } from '@/state/prefs'
import { useViewer } from '@/state/viewer'

export function LoadingStatus() {
  const load = useViewer((s) => s.load)
  const progress = useViewer((s) => s.progress)
  const layers = useViewer((s) => s.layers)
  const loading = LAYER_IDS.filter((id) => load[id] === 'loading')
  const failed = LAYER_IDS.filter((id) => load[id] === 'error' && layers[id] !== 'hidden')
  const nothingYet = !LAYER_IDS.some((id) => load[id] === 'ready')

  if (failed.length)
    return (
      <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3" style={{ top: 'calc(64px + var(--safe-top))' }}>
        <div className="glass fade-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-[13.5px]" role="alert">
          <TriangleAlert size={18} className="shrink-0 text-bad" aria-hidden />
          <span className="flex-1">
            {failed.map((id: LayerId) => LAYERS[id].label).join(', ')} {failed.length === 1 ? 'konnte' : 'konnten'} nicht geladen werden. Bitte Internetverbindung prüfen.
          </span>
          <button type="button" className="chip" onClick={() => failed.forEach(retryLayer)}>
            <RefreshCw size={14} aria-hidden /> Erneut
          </button>
        </div>
      </div>
    )

  if (!loading.length) return null
  const total = loading.reduce((a, id) => a + progress[id], 0) / loading.length
  if (nothingYet)
    return (
      <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 size={28} className="animate-spin text-accent" aria-hidden />
          <p className="text-sm">3D-Modell wird geladen … {Math.round(total * 100)} %</p>
        </div>
      </div>
    )
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center" style={{ top: 'calc(66px + var(--safe-top))' }} role="status" aria-live="polite">
      <div className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] text-muted">
        <Loader2 size={14} className="animate-spin text-accent" aria-hidden />
        {loading.map((id) => LAYERS[id].label).join(', ')} wird geladen … {Math.round(total * 100)} %
      </div>
    </div>
  )
}

export function Toast({ bottomOffset }: { bottomOffset: number }) {
  const toast = useViewer((s) => s.toast)
  const [visible, setVisible] = useState<typeof toast>(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const t = setTimeout(() => setVisible(null), 2600)
    return () => clearTimeout(t)
  }, [toast])
  if (!visible) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-6" style={{ bottom: `calc(${bottomOffset}px + 72px + var(--safe-bottom))` }} role="status" aria-live="polite">
      <div key={visible.seq} className="glass fade-in max-w-sm rounded-2xl px-4 py-2.5 text-center text-[13.5px]">
        {visible.text}
      </div>
    </div>
  )
}

export function UpdateBanner() {
  const waiting = useUpdate((s) => s.waiting)
  if (!waiting) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-3" style={{ top: 'calc(64px + var(--safe-top))' }}>
      <div className="glass fade-in pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13.5px]">
        Eine neue Version ist verfügbar.
        <button type="button" className="chip text-accent" onClick={applyUpdate}>
          Aktualisieren
        </button>
      </div>
    </div>
  )
}

/** Einmalige Gestenhilfe beim ersten Start; verschwindet nach „Verstanden“ oder der ersten Auswahl */
export function Hints({ bottomOffset }: { bottomOffset: number }) {
  const seen = usePrefs((s) => s.hintsSeen)
  const selected = useViewer((s) => s.selectedId)
  const ready = useViewer((s) => LAYER_IDS.some((id) => s.load[id] === 'ready'))
  useEffect(() => {
    if (selected && !seen) usePrefs.getState().setHintsSeen()
  }, [selected, seen])
  if (seen || !ready) return null
  const touch = window.matchMedia('(pointer: coarse)').matches
  const items = touch
    ? [
        { icon: Hand, text: 'Mit einem Finger drehen' },
        { icon: ZoomIn, text: 'Mit zwei Fingern zoomen und verschieben' },
        { icon: Pointer, text: 'Struktur antippen für Informationen' },
      ]
    : [
        { icon: Hand, text: 'Ziehen zum Drehen' },
        { icon: ZoomIn, text: 'Mausrad zum Zoomen, rechte Taste zum Verschieben' },
        { icon: Pointer, text: 'Struktur anklicken für Informationen' },
      ]
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3" style={{ bottom: `calc(${bottomOffset}px + 132px + var(--safe-bottom))` }}>
      <div className="glass fade-in pointer-events-auto w-[min(360px,100%)] rounded-3xl p-4">
        <ul className="space-y-2.5 text-[14px]">
          {items.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon size={18} className="shrink-0 text-accent" aria-hidden />
              {text}
            </li>
          ))}
          <li className="flex items-center gap-3 text-muted">
            <Move size={18} className="shrink-0" aria-hidden />
            Doppeltippen richtet die Kamera auf eine Struktur aus
          </li>
        </ul>
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => usePrefs.getState().setHintsSeen()}>
          Verstanden
        </button>
      </div>
    </div>
  )
}
