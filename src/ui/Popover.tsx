import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

/** Schwebende Karte unter der Kopfzeile (Einstellungen, Favoriten, Lernen); das Modell bleibt sichtbar */
export function Popover({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="glass fade-in absolute z-30 flex max-h-[min(72dvh,640px)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-3xl shadow-2xl"
      style={{ top: 'calc(64px + var(--safe-top))', right: 'calc(12px + var(--safe-right))', background: 'rgb(16 22 30 / 0.94)' }}
      role="dialog"
      aria-label={title}
    >
      <div className="flex items-center justify-between py-2 pl-5 pr-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" className="icon-btn text-muted" onClick={onClose} aria-label={`${title} schließen`}>
          <X size={19} aria-hidden />
        </button>
      </div>
      <div className="scroll-area selectable px-5 pb-5">{children}</div>
    </div>
  )
}
