import { describe, expect, it } from 'vitest'
import { effectiveVisibility, initialLayers, isModified, nextVisibility, type VisibilityState } from './visibility'

const state = (patch: Partial<VisibilityState> = {}): VisibilityState => ({ layers: initialLayers(), overrides: {}, isolated: null, ...patch })

describe('Sichtbarkeit', () => {
  it('Startzustand: Haut transparent, Muskeln aus, Skelett und Organe sichtbar', () => {
    const s = state()
    expect(effectiveVisibility('skin', 'skin', s)).toBe('ghost')
    expect(effectiveVisibility('deltoid-r', 'muscles', s)).toBe('hidden')
    expect(effectiveVisibility('femur-r', 'skeleton', s)).toBe('visible')
    expect(effectiveVisibility('heart', 'organs', s)).toBe('visible')
    expect(isModified(s)).toBe(false)
  })

  it('Einzel-Einstellung gilt innerhalb einer sichtbaren oder transparenten Ebene', () => {
    const s = state({ overrides: { heart: 'hidden', 'femur-r': 'ghost' } })
    expect(effectiveVisibility('heart', 'organs', s)).toBe('hidden')
    expect(effectiveVisibility('liver', 'organs', s)).toBe('visible')
    expect(effectiveVisibility('femur-r', 'skeleton', s)).toBe('ghost')
    expect(isModified(s)).toBe(true)
  })

  it('eine ausgeblendete Ebene blendet auch einzeln eingeblendete Strukturen aus', () => {
    const s = state({ layers: { ...initialLayers(), organs: 'hidden' }, overrides: { heart: 'visible' } })
    expect(effectiveVisibility('heart', 'organs', s)).toBe('hidden')
  })

  it('Isolation zeigt nur die isolierten Strukturen, die Haut bleibt zur Orientierung durchscheinend', () => {
    const s = state({ isolated: ['heart'], overrides: { heart: 'hidden' } })
    expect(effectiveVisibility('heart', 'organs', s)).toBe('visible')
    expect(effectiveVisibility('liver', 'organs', s)).toBe('hidden')
    expect(effectiveVisibility('femur-r', 'skeleton', s)).toBe('hidden')
    expect(effectiveVisibility('skin', 'skin', s)).toBe('ghost')
    expect(effectiveVisibility('skin', 'skin', state({ isolated: ['heart'], layers: { ...initialLayers(), skin: 'hidden' } }))).toBe('hidden')
  })

  it('Ebenenschalter durchläuft sichtbar → transparent → aus → sichtbar', () => {
    expect(nextVisibility('visible')).toBe('ghost')
    expect(nextVisibility('ghost')).toBe('hidden')
    expect(nextVisibility('hidden')).toBe('visible')
  })
})
