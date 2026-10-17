/**
 * Optionale Lernfunktionen, die auf dem Modell selbst stattfinden:
 *  – Quiz „Finde …“: Eine Struktur wird genannt, der Nutzer tippt sie im Modell an.
 *  – Lernkarten: Eine Struktur wird im Modell hervorgehoben, der Nutzer nennt (für sich) den Namen und deckt auf.
 * Gefragt werden nur Strukturen, die geladen, deckend sichtbar und mit Inhalten hinterlegt sind.
 */
import { create } from 'zustand'
import type { LayerId } from '@/data/layers'
import { getStructure } from '@/data/structures'
import { effectiveVisibility } from '@/layers/visibility'
import { loadedIds, getMesh } from '@/scene/registry'
import { usePrefs } from '@/state/prefs'
import { useViewer } from '@/state/viewer'
import { pickNext } from './pick'

export type LearnMode = 'off' | 'quiz' | 'cards'
export type Feedback = { id: string; kind: 'correct' | 'wrong' | 'selected' }

type LearnState = {
  mode: LearnMode
  target: string | null
  attempts: number
  revealed: boolean
  /** Im Quiz zuletzt falsch angetippte Struktur */
  lastWrong: string | null
  feedback: Feedback | null
  score: { correct: number; total: number }
  start: (mode: Exclude<LearnMode, 'off'>) => void
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

  start: (mode) => {
    clearTimeout(timer)
    useViewer.getState().select(null)
    set({ mode, score: { correct: 0, total: 0 }, target: null })
    get().next()
  },
  stop: () => {
    clearTimeout(timer)
    set({ mode: 'off', target: null, feedback: null, attempts: 0, revealed: false, lastWrong: null })
  },
  next: () => {
    clearTimeout(timer)
    const { mode, target } = get()
    const id = pickNext(availableTargets(), usePrefs.getState().progress, target)
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
