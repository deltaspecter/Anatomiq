import { describe, expect, it } from 'vitest'
import { LAYER_IDS } from '../layers'
import { MODEL_MESHES } from '../model'
import { SOURCES } from '../sources'
import { getStructure, STRUCTURES } from '.'

describe('Anatomische Strukturen', () => {
  it('haben eindeutige IDs', () => {
    const ids = STRUCTURES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sind jeweils mit vorhandenen Meshes im 3D-Modell verknüpft – in der richtigen Ebene', () => {
    const meshes = new Map(MODEL_MESHES.map((m) => [m.id, m]))
    for (const s of STRUCTURES) {
      expect(s.meshIds.length, s.id).toBeGreaterThan(0)
      for (const meshId of s.meshIds) {
        expect(meshes.has(meshId), `${s.id} → ${meshId}`).toBe(true)
        expect(meshes.get(meshId)!.layer, s.id).toBe(s.layer)
      }
    }
  })

  it('decken jedes Mesh des Modells ab (kein antippbares Mesh ohne Inhalt)', () => {
    const covered = new Set(STRUCTURES.flatMap((s) => s.meshIds))
    const missing = MODEL_MESHES.filter((m) => !covered.has(m.id)).map((m) => m.id)
    expect(missing).toEqual([])
  })

  it('verweisen nur auf existierende verwandte Strukturen und nicht auf sich selbst', () => {
    for (const s of STRUCTURES)
      for (const r of s.relatedStructureIds) {
        expect(getStructure(r), `${s.id} → ${r}`).toBeDefined()
        expect(r, s.id).not.toBe(s.id)
      }
  })

  it('nennen nur bekannte Quellen', () => {
    for (const s of STRUCTURES) {
      expect(s.sourceReferences.length, s.id).toBeGreaterThan(0)
      for (const src of s.sourceReferences) expect(SOURCES[src], `${s.id} → ${src}`).toBeDefined()
    }
  })

  it('haben Pflichtangaben und keine leeren Abschnitte', () => {
    for (const s of STRUCTURES) {
      expect(s.nameDe.trim(), s.id).not.toBe('')
      expect(s.nameLa.trim(), s.id).not.toBe('')
      expect(s.summary.length, s.id).toBeGreaterThan(30)
      for (const [key, value] of Object.entries(s)) {
        if (typeof value === 'string') expect(value.trim(), `${s.id}.${key}`).not.toBe('')
        if (Array.isArray(value) && key !== 'relatedStructureIds') expect(value.length, `${s.id}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('Muskeln nennen Ursprung, Ansatz, Innervation und Funktion', () => {
    for (const s of STRUCTURES.filter((x) => x.layer === 'muscles' && x.id !== 'diaphragm')) {
      expect(s.origin, s.id).toBeTruthy()
      expect(s.insertion, s.id).toBeTruthy()
      expect(s.innervation, s.id).toBeTruthy()
      expect(s.function, s.id).toBeTruthy()
    }
  })

  it('paarige Strukturen tragen die Seite im lateinischen Namen', () => {
    for (const s of STRUCTURES.filter((x) => x.side)) {
      const expected = s.side === 'r' ? /dext/ : /sinist/
      expect(s.nameLa, s.id).toMatch(expected)
    }
  })

  it('jede Ebene hat Inhalte', () => {
    for (const layer of LAYER_IDS) expect(STRUCTURES.some((s) => s.layer === layer), layer).toBe(true)
  })
})
