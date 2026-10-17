import type { CardProgress } from '@/state/prefs'

/**
 * Wählt die nächste Struktur für Quiz oder Lernkarte.
 * Strukturen in niedrigen Leitner-Fächern (neu oder zuletzt falsch) kommen häufiger dran;
 * die zuletzt gefragte Struktur wird nicht direkt wiederholt.
 */
export function pickNext(candidates: string[], progress: Record<string, CardProgress>, last: string | null, random: () => number = Math.random): string | null {
  const pool = candidates.length > 1 ? candidates.filter((id) => id !== last) : candidates
  if (!pool.length) return null
  const weights = pool.map((id) => 5 - (progress[id]?.box ?? 0))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r < 0) return pool[i]
  }
  return pool[pool.length - 1]
}
