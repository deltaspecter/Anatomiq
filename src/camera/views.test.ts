import { describe, expect, it } from 'vitest'
import { BODY, fitDistance, focusDistance } from './views'

describe('Kamera', () => {
  it('Startabstand zeigt den ganzen Körper in Hoch- und Querformat', () => {
    const tan = Math.tan((35 * Math.PI) / 360)
    const portrait = fitDistance(35, 390 / 844)
    const landscape = fitDistance(35, 16 / 9)
    // sichtbare Höhe und Breite im Abstand d
    expect(2 * portrait * tan).toBeGreaterThanOrEqual(BODY.height)
    expect(2 * portrait * tan * (390 / 844)).toBeGreaterThanOrEqual(BODY.width)
    expect(2 * landscape * tan).toBeGreaterThanOrEqual(BODY.height)
    expect(2 * fitDistance(35, 0.3) * tan * 0.3).toBeGreaterThanOrEqual(BODY.width)
    expect(portrait).toBeGreaterThanOrEqual(landscape)
  })

  it('Fokusabstand bleibt in sinnvollen Grenzen', () => {
    expect(focusDistance([0.01, 0.01, 0.01], 35, 1)).toBeGreaterThanOrEqual(0.18)
    expect(focusDistance([0.7, 1.7, 0.3], 35, 0.5)).toBeLessThanOrEqual(2.4)
    expect(focusDistance([0.12, 0.12, 0.1], 35, 1)).toBeLessThan(focusDistance([0.3, 0.4, 0.2], 35, 1))
  })
})
