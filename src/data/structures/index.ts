/**
 * Alle anatomischen Strukturen mit Inhalten. Die Texte liegen nach Ebenen getrennt in eigenen Dateien
 * und sind unabhängig von der Benutzeroberfläche pflegbar.
 */
import type { AnatomicalStructure } from '../types'
import { MUSCLES } from './muscles'
import { MUSCLES_LIMBS } from './muscles-limbs'
import { MUSCLES_MORE } from './muscles-more'
import { NERVOUS } from './nervous'
import { ORGANS } from './organs'
import { SKELETON } from './skeleton'
import { SKIN } from './skin'
import { VESSELS } from './vessels'

export const STRUCTURES: AnatomicalStructure[] = [...SKIN, ...SKELETON, ...MUSCLES, ...MUSCLES_MORE, ...MUSCLES_LIMBS, ...ORGANS, ...NERVOUS, ...VESSELS]

const byMesh = new Map<string, AnatomicalStructure>()
const byId = new Map<string, AnatomicalStructure>()
for (const s of STRUCTURES) {
  byId.set(s.id, s)
  for (const m of s.meshIds) byMesh.set(m, s)
}

/** Struktur zu einer Mesh-ID (oder Struktur-ID) */
export const getStructure = (id: string): AnatomicalStructure | undefined => byMesh.get(id) ?? byId.get(id)
