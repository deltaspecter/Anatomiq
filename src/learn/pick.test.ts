import { describe, expect, it } from 'vitest'
import { nextProgress } from '@/state/prefs'
import { pickNext } from './pick'

describe('Lernkarten', () => {
  it('wiederholt nicht direkt dieselbe Struktur', () => {
    for (let i = 0; i < 50; i++) expect(pickNext(['a', 'b'], {}, 'a', Math.random)).toBe('b')
  })

  it('liefert null ohne Kandidaten und die einzige Struktur, wenn es nur eine gibt', () => {
    expect(pickNext([], {}, null)).toBeNull()
    expect(pickNext(['a'], {}, 'a')).toBe('a')
  })

  it('bevorzugt Strukturen in niedrigen Leitner-Fächern', () => {
    const progress = { a: { box: 4, seen: 5, correct: 5, wrong: 0, last: 0 } }
    let a = 0
    let r = 0
    const random = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
    for (let i = 0; i < 2000; i++) if (pickNext(['a', 'b'], progress, null, random) === 'a') a++
    // Gewicht a = 1, b = 5 → etwa ein Sechstel
    expect(a / 2000).toBeGreaterThan(0.1)
    expect(a / 2000).toBeLessThan(0.25)
  })

  it('Leitner-Fortschritt: richtig → nächstes Fach (max. 4), falsch → zurück auf 0', () => {
    let p = nextProgress(undefined, true, 1)
    expect(p).toMatchObject({ box: 1, seen: 1, correct: 1, wrong: 0 })
    for (let i = 0; i < 6; i++) p = nextProgress(p, true, 2)
    expect(p.box).toBe(4)
    p = nextProgress(p, false, 3)
    expect(p).toMatchObject({ box: 0, wrong: 1, last: 3 })
  })
})
