/**
 * Dezente Bedienelemente am Rand: Kopfzeile (Favoriten, Lernen, Einstellungen) und
 * Kamera-Leiste (Ansicht wechseln, Ausgangsansicht). Sie überdecken den Körper möglichst nicht.
 */
import { GraduationCap, House, Rotate3d, Settings, Star } from 'lucide-react'
import { useState } from 'react'
import { VIEW_CYCLE, VIEWS } from '@/camera/views'
import { useViewer } from '@/state/viewer'
import { IconButton } from './IconButton'

export type Sheet = 'settings' | 'favorites' | 'learn' | null

export function TopBar({ onOpen, active, compact }: { onOpen: (sheet: Sheet) => void; active: Sheet; compact: boolean }) {
  return (
    <header
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-3"
      style={{ paddingTop: 'calc(10px + var(--safe-top))', paddingLeft: 'calc(12px + var(--safe-left))', paddingRight: 'calc(12px + var(--safe-right))' }}
    >
      <h1 className="pointer-events-auto mt-2 select-none text-[17px] font-semibold tracking-tight text-ink/90">
        Anatomiq{!compact && <span className="ml-2 text-sm font-normal text-muted">Der Körper als Atlas</span>}
      </h1>
      <nav className="glass pointer-events-auto flex items-center gap-0.5 rounded-full p-1" aria-label="Werkzeuge">
        <IconButton icon={Star} label="Favoriten und zuletzt angesehen" onClick={() => onOpen(active === 'favorites' ? null : 'favorites')} pressed={active === 'favorites'} />
        <IconButton icon={GraduationCap} label="Lernen: Quiz und Lernkarten" onClick={() => onOpen(active === 'learn' ? null : 'learn')} pressed={active === 'learn'} />
        <IconButton icon={Settings} label="Einstellungen und Informationen" onClick={() => onOpen(active === 'settings' ? null : 'settings')} pressed={active === 'settings'} />
      </nav>
    </header>
  )
}

export function CameraBar({ rightOffset, bottomOffset }: { rightOffset: number; bottomOffset: number }) {
  const [viewIndex, setViewIndex] = useState(0)
  const camera = useViewer((s) => s.camera)
  const showToast = useViewer((s) => s.showToast)
  return (
    <div
      className="glass absolute z-10 flex flex-col gap-0.5 rounded-full p-1 transition-[bottom,right] duration-300"
      style={{ right: `calc(${rightOffset}px + 12px + var(--safe-right))`, bottom: `calc(${bottomOffset}px + 12px + var(--safe-bottom))` }}
      role="group"
      aria-label="Kamera"
    >
      <IconButton
        icon={Rotate3d}
        label="Ansicht wechseln (vorn, rechts, hinten, links)"
        onClick={() => {
          const next = (viewIndex + 1) % VIEW_CYCLE.length
          setViewIndex(next)
          const view = VIEW_CYCLE[next]
          camera({ kind: 'view', view })
          showToast(VIEWS[view].label)
        }}
      />
      <IconButton
        icon={House}
        label="Ausgangsansicht: ganzer Körper von vorn"
        onClick={() => {
          setViewIndex(0)
          camera({ kind: 'reset' })
        }}
      />
    </div>
  )
}
