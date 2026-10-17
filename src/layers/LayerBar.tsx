/**
 * Kompakte Ebenensteuerung: Ein Knopf öffnet eine schmale Leiste mit den sechs Ebenen.
 * Antippen schaltet zyklisch: sichtbar → transparent → ausgeblendet → sichtbar.
 * Eine Ebene wird beim ersten Einschalten geladen (Fortschritt am Knopf sichtbar).
 */
import { BicepsFlexed, Bone, Brain, Droplets, Eye, EyeOff, Ghost, Heart, Layers, Loader2, PersonStanding, RotateCcw, TriangleAlert, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { LAYER_ORDER, LAYERS, type LayerId, type Visibility } from '@/data/layers'
import { retryLayer } from '@/scene/AnatomyModel'
import { useViewer } from '@/state/viewer'
import { isModified, nextVisibility } from './visibility'

const ICONS: Record<LayerId, ComponentType<{ size?: number; 'aria-hidden'?: boolean; strokeWidth?: number }>> = {
  skin: PersonStanding,
  muscles: BicepsFlexed,
  skeleton: Bone,
  organs: Heart,
  vessels: Droplets,
  nervous: Brain,
}

const STATE_LABEL: Record<Visibility, string> = { visible: 'sichtbar', ghost: 'transparent', hidden: 'aus' }
const STATE_SHORT: Record<Visibility, string> = { visible: 'an', ghost: 'transp.', hidden: 'aus' }
const STATE_ICON: Record<Visibility, ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = { visible: Eye, ghost: Ghost, hidden: EyeOff }

function LayerToggle({ id }: { id: LayerId }) {
  const v = useViewer((s) => s.layers[id])
  const load = useViewer((s) => s.load[id])
  const progress = useViewer((s) => s.progress[id])
  const Icon = ICONS[id]
  const StateIcon = STATE_ICON[v]
  const info = LAYERS[id]
  const loading = load === 'loading' && v !== 'hidden'
  const failed = load === 'error' && v !== 'hidden'
  return (
    <button
      type="button"
      onClick={() => (failed ? retryLayer(id) : useViewer.getState().setLayer(id, nextVisibility(v)))}
      className={`relative flex w-[54px] shrink-0 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] transition-colors ${v === 'hidden' ? 'text-faint' : 'text-ink'}`}
      aria-label={`${info.label}: ${failed ? 'Laden fehlgeschlagen – erneut versuchen' : STATE_LABEL[v]}. Antippen zum Umschalten.`}
    >
      <span
        className="relative grid h-11 w-11 place-items-center rounded-full border transition-colors"
        style={{
          borderColor: v === 'hidden' ? 'rgb(255 255 255 / 0.08)' : `${info.color}88`,
          background: v === 'visible' ? `${info.color}2e` : v === 'ghost' ? `${info.color}12` : 'transparent',
          borderStyle: v === 'ghost' ? 'dashed' : 'solid',
        }}
      >
        <Icon size={20} strokeWidth={1.7} aria-hidden />
        {loading && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-surface-solid text-accent">
            <Loader2 size={13} className="animate-spin" aria-hidden />
          </span>
        )}
        {failed && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-surface-solid text-bad">
            <TriangleAlert size={12} aria-hidden />
          </span>
        )}
      </span>
      <span className="leading-none">{info.label}</span>
      <span className="flex items-center gap-0.5 text-[10px] leading-none text-muted">
        <StateIcon size={10} aria-hidden />
        {loading ? `${Math.round(progress * 100)} %` : failed ? 'Fehler' : STATE_SHORT[v]}
      </span>
    </button>
  )
}

export function LayerBar({ bottomOffset }: { bottomOffset: number }) {
  const open = useViewer((s) => s.layerBarOpen)
  const modified = useViewer((s) => isModified(s))
  const hiddenCount = useViewer((s) => Object.values(s.overrides).filter((o) => o === 'hidden').length)
  const isolated = useViewer((s) => !!s.isolated)
  const { setLayerBarOpen, resetDisplay, isolate } = useViewer.getState()

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10 flex flex-col items-start gap-2 px-3 transition-[bottom] duration-300"
      style={{ bottom: `calc(${bottomOffset}px + 12px + var(--safe-bottom))`, paddingLeft: 'calc(12px + var(--safe-left))' }}
    >
      {open && (
        <div className="glass fade-in pointer-events-auto flex max-w-full items-stretch overflow-x-auto rounded-3xl p-1.5" role="group" aria-label="Darstellungsebenen">
          {LAYER_ORDER.map((id) => (
            <LayerToggle key={id} id={id} />
          ))}
        </div>
      )}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          className={`glass inline-flex h-11 items-center gap-2 rounded-full pl-3.5 pr-4 text-sm font-medium ${open ? 'text-accent' : ''}`}
          onClick={() => setLayerBarOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Ebenenleiste schließen' : 'Ebenen anzeigen'}
        >
          {open ? <X size={18} aria-hidden /> : <Layers size={18} aria-hidden />}
          Ebenen
        </button>
        {modified && (
          <button type="button" className="glass fade-in inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm" onClick={() => (isolated ? isolate(null) : resetDisplay())} aria-label={isolated ? 'Isolation aufheben' : 'Darstellung zurücksetzen: alle Ebenen und Strukturen wie beim Start'}>
            <RotateCcw size={16} aria-hidden />
            {isolated ? 'Isolation aufheben' : hiddenCount ? `${hiddenCount} ausgeblendet · Alle zeigen` : 'Darstellung zurücksetzen'}
          </button>
        )}
      </div>
    </div>
  )
}
