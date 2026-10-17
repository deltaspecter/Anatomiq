/**
 * Sitzungszustand des Viewers: Auswahl, Informationspanel, Darstellung der Ebenen und Strukturen,
 * Ladezustand der Modelldateien und Kamera-Befehle. Wird nicht gespeichert – jeder Start beginnt mit der Grundansicht.
 */
import { create } from 'zustand'
import { LAYER_IDS, type LayerId, type Visibility } from '@/data/layers'
import { layerOf } from '@/data/model'
import { initialLayers, type VisibilityState } from '@/layers/visibility'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
export type ViewId = 'front' | 'back' | 'left' | 'right'
export type CameraCommand = { kind: 'reset' } | { kind: 'view'; view: ViewId } | { kind: 'focus'; id: string; close?: boolean }
export type PanelState = 'closed' | 'peek' | 'full'

type ViewerState = VisibilityState & {
  selectedId: string | null
  panel: PanelState
  load: Record<LayerId, LoadState>
  progress: Record<LayerId, number>
  command: (CameraCommand & { seq: number }) | null
  toast: { text: string; seq: number } | null
  layerBarOpen: boolean
  /** Struktur unter dem Mauszeiger (nur Maus, nicht Touch) */
  hover: { id: string; x: number; y: number } | null

  select: (id: string | null) => void
  setPanel: (panel: PanelState) => void
  setLayer: (layer: LayerId, v: Visibility) => void
  setOverride: (id: string, v: Visibility | null) => void
  isolate: (ids: string[] | null) => void
  resetDisplay: () => void
  setLoad: (layer: LayerId, state: LoadState, progress?: number) => void
  camera: (command: CameraCommand) => void
  showToast: (text: string) => void
  setLayerBarOpen: (open: boolean) => void
  setHover: (hover: { id: string; x: number; y: number } | null) => void
}

let seq = 0

export const useViewer = create<ViewerState>()((set) => ({
  layers: initialLayers(),
  overrides: {},
  isolated: null,
  selectedId: null,
  panel: 'closed',
  load: Object.fromEntries(LAYER_IDS.map((id) => [id, 'idle'])) as Record<LayerId, LoadState>,
  progress: Object.fromEntries(LAYER_IDS.map((id) => [id, 0])) as Record<LayerId, number>,
  command: null,
  toast: null,
  layerBarOpen: false,
  hover: null,

  select: (id) => set((s) => ({ selectedId: id, panel: id ? (s.panel === 'full' ? 'full' : 'peek') : 'closed' })),
  setPanel: (panel) => set((s) => ({ panel, selectedId: panel === 'closed' ? null : s.selectedId })),
  setLayer: (layer, v) =>
    set((s) => {
      // Eine Ebene neu einstellen hebt die Einzel-Einstellungen ihrer Strukturen auf
      const overrides = Object.fromEntries(Object.entries(s.overrides).filter(([id]) => layerOf(id) !== layer))
      return { layers: { ...s.layers, [layer]: v }, overrides, isolated: null }
    }),
  setOverride: (id, v) =>
    set((s) => {
      const overrides = { ...s.overrides }
      if (v === null) delete overrides[id]
      else overrides[id] = v
      return { overrides }
    }),
  isolate: (ids) => set({ isolated: ids && ids.length ? ids : null }),
  resetDisplay: () => set({ layers: initialLayers(), overrides: {}, isolated: null }),
  setLoad: (layer, state, progress) =>
    set((s) => ({ load: { ...s.load, [layer]: state }, progress: progress === undefined ? s.progress : { ...s.progress, [layer]: progress } })),
  camera: (command) => set({ command: { ...command, seq: ++seq } }),
  showToast: (text) => set({ toast: { text, seq: ++seq } }),
  setLayerBarOpen: (layerBarOpen) => set({ layerBarOpen }),
  setHover: (hover) => set({ hover }),
}))
