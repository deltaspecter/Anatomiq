/**
 * Verzeichnis der geladenen Meshes: Struktur-ID → THREE.Mesh.
 * Bewusst außerhalb von React gehalten – Auswahl, Sichtbarkeit und Kamera greifen direkt darauf zu,
 * ohne bei jeder Änderung Komponenten neu zu rendern.
 */
import type { Mesh } from 'three'
import type { LayerId } from '@/data/layers'

const meshes = new Map<string, Mesh>()
const listeners = new Set<() => void>()

export function registerMeshes(layer: LayerId, list: Mesh[]) {
  for (const mesh of list) {
    mesh.userData.structureId = mesh.name
    mesh.userData.layer = layer
    meshes.set(mesh.name, mesh)
  }
  listeners.forEach((l) => l())
}

export function unregisterLayer(layer: LayerId) {
  for (const [id, mesh] of meshes) if (mesh.userData.layer === layer) meshes.delete(id)
  listeners.forEach((l) => l())
}

export const getMesh = (id: string): Mesh | undefined => meshes.get(id)
export const allMeshes = (): IterableIterator<Mesh> => meshes.values()
export const loadedIds = (): string[] => [...meshes.keys()]

export function onRegistryChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
