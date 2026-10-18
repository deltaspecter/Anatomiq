/**
 * Optionale Lernfunktionen, die auf dem Modell selbst stattfinden:
 *  – Quiz „Finde …“: Eine Struktur wird genannt, der Nutzer tippt sie im Modell an.
 *  – Lernkarten: Eine Struktur wird im Modell hervorgehoben, der Nutzer nennt (für sich) den Namen und deckt auf.
 * Gefragt werden nur Strukturen, die geladen, deckend sichtbar und mit Inhalten hinterlegt sind.
 */
import { create } from 'zustand'
import { LAYER_IDS, type LayerId } from '@/data/layers'
import { getStructure } from '@/data/structures'
import { effectiveVisibility } from '@/layers/visibility'
import { isReachable } from '@/scene/reach'
import { loadedIds, getMesh } from '@/scene/registry'
import { usePrefs } from '@/state/prefs'
import { useViewer } from '@/state/viewer'
import { pickNext } from './pick'

export type LearnMode = 'off' | 'quiz' | 'cards'
export type Feedback = { id: string; kind: 'correct' | 'wrong' | 'selected' }
/** Thema: eine Ebene gezielt üben oder alles, was gerade sichtbar ist */
export type LearnTopic = 'visible' | Exclude<LayerId, 'skin'>

type LearnState = {
  mode: LearnMode
  target: string | null
  attempts: number
  revealed: boolean
  /** Im Quiz zuletzt falsch angetippte Struktur */
  lastWrong: string | null
  feedback: Feedback | null
  score: { correct: number; total: number }
  start: (mode: Exclude<LearnMode, 'off'>, topic?: LearnTopic) => void
  stop: () => void
  next: () => void
  answer: (id: string | null) => void
  reveal: () => void
  grade: (knewIt: boolean) => void
}

/** Strukturen, die gerade im Modell deckend sichtbar sind */
export function availableTargets(): string[] {
  const viewer = useViewer.getState()
  return loadedIds().filter((id) => {
    const mesh = getMesh(id)
    if (!mesh || !getStructure(id)) return false
    return effectiveVisibility(id, mesh.userData.layer as LayerId, viewer) === 'visible'
  })
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useLearn = create<LearnState>()((set, get) => ({
  mode: 'off',
  target: null,
  attempts: 0,
  revealed: false,
  lastWrong: null,
  feedback: null,
  score: { correct: 0, total: 0 },

  start: (mode, topic = 'visible') => {
    clearTimeout(timer)
    const viewer = useViewer.getState()
    viewer.select(null)
    set({ mode, score: { correct: 0, total: 0 }, target: null })
    if (topic === 'visible') return get().next()
    // Thema einblenden: gewählte Ebene deckend, Skelett zur Orientierung durchscheinend, Rest aus
    viewer.resetDisplay()
    for (const layer of LAYER_IDS) {
      if (layer === 'skin') continue
      viewer.setLayer(layer, layer === topic ? 'visible' : layer === 'skeleton' ? 'ghost' : 'hidden')
    }
    viewer.camera({ kind: 'reset' })
    // Auf das Laden der Ebene warten (z. B. Muskeln beim ersten Mal), dann die erste Aufgabe stellen
    const ready = () => ['ready', 'error'].includes(useViewer.getState().load[topic])
    if (ready()) return get().next()
    const unsubscribe = useViewer.subscribe(() => {
      if (!ready() || get().mode !== mode) return
      unsubscribe()
      // Sichtbarkeit wird nach dem Laden im selben Takt übertragen; danach erst auswählen
      setTimeout(() => get().mode === mode && get().next(), 0)
    })
  },
  stop: () => {
    clearTimeout(timer)
    set({ mode: 'off', target: null, feedback: null, attempts: 0, revealed: false, lastWrong: null })
  },
  next: () => {
    clearTimeout(timer)
    const { mode, target } = get()
    // Zufällig wählen, aber nur Strukturen, die aus irgendeiner Richtung sichtbar sind
    let pool = availableTargets()
    const meshes = pool.map((p) => getMesh(p)!).filter(Boolean)
    let id: string | null = null
    for (let tries = 0; tries < 40 && pool.length; tries++) {
      const candidate = pickNext(pool, usePrefs.getState().progress, target)
      if (!candidate) break
      if (isReachable(candidate, meshes)) {
        id = candidate
        break
      }
      pool = pool.filter((p) => p !== candidate)
    }
    set({ target: id, attempts: 0, revealed: false, lastWrong: null, feedback: mode === 'cards' && id ? { id, kind: 'selected' } : null })
    if (mode === 'cards' && id) useViewer.getState().camera({ kind: 'focus', id })
  },
  answer: (id) => {
    const { target, attempts, mode, score } = get()
    if (mode !== 'quiz' || !target || !id) return
    clearTimeout(timer)
    if (id === target) {
      usePrefs.getState().record(target, attempts === 0)
      set({ feedback: { id, kind: 'correct' }, lastWrong: null, score: { correct: score.correct + (attempts === 0 ? 1 : 0), total: score.total + 1 }, revealed: true })
      timer = setTimeout(() => get().next(), 1400)
    } else if (attempts >= 1) {
      // Zweiter Fehlversuch: Lösung zeigen
      usePrefs.getState().record(target, false)
      set({ feedback: { id: target, kind: 'correct' }, attempts: attempts + 1, lastWrong: id, revealed: true, score: { ...score, total: score.total + 1 } })
      useViewer.getState().camera({ kind: 'focus', id: target })
    } else {
      set({ feedback: { id, kind: 'wrong' }, attempts: attempts + 1, lastWrong: id })
    }
  },
  reveal: () => set({ revealed: true }),
  grade: (knewIt) => {
    const { target, score } = get()
    if (target) usePrefs.getState().record(target, knewIt)
    set({ score: { correct: score.correct + (knewIt ? 1 : 0), total: score.total + 1 } })
    get().next()
  },
}))
