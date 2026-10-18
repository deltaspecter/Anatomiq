/**
 * Ist eine Struktur von außen zu sehen? Strahlen aus sechs Richtungen (vorn, hinten, links, rechts, oben, unten)
 * auf Mittelpunkt und vier Randpunkte der Struktur; trifft einer davon zuerst diese Struktur, ist sie erreichbar.
 * Quiz und Lernkarten fragen damit nur ab, was man auch antippen bzw. sehen kann – nicht z. B. den kleinen
 * Brustmuskel, solange der große ihn vollständig verdeckt.
 */
import { Raycaster, Vector3, type Mesh } from 'three'
import { modelMesh } from '@/data/model'

const DIRECTIONS = [
  [0, 0, 1],
  [0, 0, -1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
].map(([x, y, z]) => new Vector3(x, y, z))

const raycaster = new Raycaster()
;(raycaster as Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true
const origin = new Vector3()
const target = new Vector3()
const direction = new Vector3()

export function isReachable(id: string, meshes: Mesh[]): boolean {
  const info = modelMesh(id)
  if (!info) return false
  const [cx, cy, cz] = info.center
  const [sx, sy, sz] = info.size.map((v) => v * 0.25)
  const points = [
    [cx, cy, cz],
    [cx + sx, cy, cz],
    [cx - sx, cy, cz],
    [cx, cy + sy, cz],
    [cx, cy - sy, cz + sz],
  ]
  for (const d of DIRECTIONS)
    for (const [x, y, z] of points) {
      target.set(x, y, z)
      origin.copy(target).addScaledVector(d, 1.5)
      direction.copy(d).negate()
      raycaster.set(origin, direction)
      raycaster.far = 1.6
      const hit = raycaster.intersectObjects(meshes, false)[0]
      if (hit?.object.userData.structureId === id) return true
    }
  return false
}
