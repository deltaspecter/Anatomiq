/**
 * Lokal gespeicherte Daten (nur auf diesem Gerät, localStorage): Favoriten, zuletzt angesehene Strukturen,
 * Einstellungen und Lernfortschritt. Es gibt kein Konto und keine Übertragung an einen Server.
 */
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export type Quality = 'auto' | 'high' | 'low'

export type CardProgress = {
  /** Leitner-Fach 0–4: 0 = neu/falsch, 4 = sicher gewusst */
  box: number
  seen: number
  correct: number
  wrong: number
  last: number
}

export type Prefs = {
  favorites: string[]
  recent: string[]
  quality: Quality
  autoFocus: boolean
  hintsSeen: boolean
  progress: Record<string, CardProgress>
  toggleFavorite: (id: string) => void
  pushRecent: (id: string) => void
  setQuality: (q: Quality) => void
  setAutoFocus: (v: boolean) => void
  setHintsSeen: () => void
  record: (id: string, correct: boolean) => void
  resetProgress: () => void
  resetAll: () => void
}

const RECENT_LIMIT = 12

/** localStorage kann fehlen oder werfen (privater Modus, gesperrte Website-Daten) – dann nur im Speicher */
const memory = new Map<string, string>()
const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      memory.delete(key)
    }
  },
}

const DEFAULTS = { favorites: [] as string[], recent: [] as string[], quality: 'auto' as Quality, autoFocus: true, hintsSeen: false, progress: {} as Record<string, CardProgress> }

export function nextProgress(prev: CardProgress | undefined, correct: boolean, now: number): CardProgress {
  const p = prev ?? { box: 0, seen: 0, correct: 0, wrong: 0, last: 0 }
  return {
    box: correct ? Math.min(4, p.box + 1) : 0,
    seen: p.seen + 1,
    correct: p.correct + (correct ? 1 : 0),
    wrong: p.wrong + (correct ? 0 : 1),
    last: now,
  }
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [id, ...s.favorites] })),
      pushRecent: (id) => set((s) => ({ recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, RECENT_LIMIT) })),
      setQuality: (quality) => set({ quality }),
      setAutoFocus: (autoFocus) => set({ autoFocus }),
      setHintsSeen: () => set({ hintsSeen: true }),
      record: (id, correct) => set((s) => ({ progress: { ...s.progress, [id]: nextProgress(s.progress[id], correct, Date.now()) } })),
      resetProgress: () => set({ progress: {} }),
      resetAll: () => set({ ...DEFAULTS, hintsSeen: true }),
    }),
    { name: 'anatomiq-prefs', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
)
