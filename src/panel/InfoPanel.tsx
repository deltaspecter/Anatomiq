/**
 * Informationspanel zur ausgewählten Struktur.
 *   Schmale Bildschirme: Bottom-Sheet mit zwei Stufen (eingeklappt / ausgeklappt), per Griff ziehbar;
 *   auf schmalen Tablet-Fenstern höchstens SHEET_MAX_WIDTH breit und mittig.
 *   Breite Bildschirme (Desktop, iPad): Seitenpanel rechts.
 * Das Panel liegt über der 3D-Ansicht; Schließen ändert die Kameraposition nicht.
 * Scrollen im Panel bewegt das Modell nicht (eigene Touch-Fläche, overscroll-behavior: contain).
 */
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { LAYERS } from '@/data/layers'
import { getStructure } from '@/data/structures'
import { REGION_LABELS, SIDE_LABELS, SYSTEM_LABELS, type AnatomicalStructure } from '@/data/types'
import { useViewer } from '@/state/viewer'
import { peekHeight, SHEET_MAX_WIDTH, sidePanelWidth, useIsWide, useViewport } from '@/ui/useLayout'
import { StructureActions } from './StructureActions'
import { StructureContent } from './StructureContent'

function Header({ s, onClose, children }: { s: AnatomicalStructure; onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="px-5 pt-1">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="panel-title" className="text-[22px] font-semibold leading-tight tracking-tight">
            {s.nameDe}
            {s.side && <span className="ml-2 align-middle text-sm font-normal text-muted">{SIDE_LABELS[s.side]}</span>}
          </h2>
          <p className="mt-0.5 text-[15px] italic text-ink/75">{s.nameLa}</p>
        </div>
        {children}
        <button type="button" className="icon-btn -mr-2 -mt-1 shrink-0 text-muted" onClick={onClose} aria-label="Informationen schließen">
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full" style={{ background: s.color ?? LAYERS[s.layer].color }} aria-hidden />
          {SYSTEM_LABELS[s.system]}
        </span>
        <span className="rounded-full bg-white/5 px-2.5 py-1">{REGION_LABELS[s.region]}</span>
        {s.nameEn && <span className="rounded-full bg-white/5 px-2.5 py-1">engl. {s.nameEn}</span>}
      </div>
      <p className="selectable mt-3 text-[15px] leading-relaxed text-ink">{s.summary}</p>
    </div>
  )
}

export function InfoPanel() {
  const selectedId = useViewer((s) => s.selectedId)
  const panel = useViewer((s) => s.panel)
  const wide = useIsWide()
  const { width, height } = useViewport()
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; moved: number } | null>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const structure = selectedId ? getStructure(selectedId) : undefined

  // Neue Auswahl: Inhalt nach oben scrollen
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [selectedId])

  // Escape schließt das Panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useViewer.getState().selectedId) useViewer.getState().select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!structure || panel === 'closed') return null
  const close = () => useViewer.getState().select(null)
  const setPanel = useViewer.getState().setPanel

  if (wide)
    return (
      <aside
        className="glass fade-in absolute z-20 flex flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ width: sidePanelWidth(width), top: 'calc(68px + var(--safe-top))', right: 'calc(12px + var(--safe-right))', bottom: 'calc(12px + var(--safe-bottom))' }}
        aria-labelledby="panel-title"
      >
        <div ref={scrollRef} className="scroll-area flex-1 pt-4">
          <Header s={structure} onClose={close} />
          <div className="my-4">
            <StructureActions structure={structure} />
          </div>
          <StructureContent structure={structure} />
        </div>
      </aside>
    )

  const full = panel === 'full'
  const sheetHeight = full ? Math.round(height * 0.88) : peekHeight(height)

  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { y: e.clientY, moved: 0 }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current || !sheetRef.current) return
    const dy = e.clientY - drag.current.y
    drag.current.moved = dy
    sheetRef.current.style.transform = `translateY(${Math.max(dy, full ? 0 : -height * 0.4)}px)`
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (sheetRef.current) sheetRef.current.style.transform = ''
    if (!d) return
    if (Math.abs(d.moved) < 6) setPanel(full ? 'peek' : 'full')
    else if (d.moved < -40) setPanel('full')
    else if (d.moved > 60) full ? setPanel('peek') : close()
  }

  return (
    <section
      ref={sheetRef}
      className="glass fade-in absolute inset-x-0 bottom-0 z-20 mx-auto flex flex-col rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] transition-[height] duration-300 ease-out"
      style={{ height: sheetHeight, maxWidth: SHEET_MAX_WIDTH, paddingBottom: 'var(--safe-bottom)', background: full ? 'rgb(16 22 30 / 0.95)' : undefined }}
      aria-labelledby="panel-title"
    >
      <div
        className="flex cursor-grab touch-none select-none flex-col items-center pb-1 pt-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={full ? 'Panel verkleinern' : 'Panel vergrößern'}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPanel(full ? 'peek' : 'full')}
      >
        <span className="h-1.5 w-10 rounded-full bg-white/25" aria-hidden />
        <span className="mt-0.5 text-muted" aria-hidden>
          {full ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </div>
      <div ref={scrollRef} className="scroll-area flex-1">
        <Header s={structure} onClose={close} />
        <div className="my-4">
          <StructureActions structure={structure} />
        </div>
        {!full && (
          <div className="px-5 pb-4">
            <button type="button" className="btn-ghost w-full text-sm" onClick={() => setPanel('full')}>
              Mehr erfahren
            </button>
          </div>
        )}
        {full && <StructureContent structure={structure} />}
      </div>
    </section>
  )
}
