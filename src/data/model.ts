/**
 * Angaben zum erzeugten 3D-Modell (aus scripts/build-model.ts): welche Meshes es gibt,
 * in welcher Ebenendatei sie liegen, Mittelpunkt und Größe (für Kamera-Fokus und Tests) und ihre Herkunft.
 */
import manifest from './generated/model-manifest.json'
import type { LayerId } from './layers'

export type ModelMesh = {
  id: string
  layer: LayerId
  triangles: number
  sourceTriangles: number
  center: [number, number, number]
  size: [number, number, number]
  concepts: { fma: string; name: string }[]
  elements: string[]
}

export type LayerFile = { file: string; bytes: number; hash: string; triangles: number }

export const MODEL_SOURCE: string = manifest.source
export const LAYER_FILES = manifest.layers as Record<LayerId, LayerFile>
export const MODEL_MESHES = manifest.structures as ModelMesh[]
const byId = new Map(MODEL_MESHES.map((m) => [m.id, m]))

export const modelMesh = (id: string): ModelMesh | undefined => byId.get(id)
export const layerOf = (id: string): LayerId | undefined => byId.get(id)?.layer

/** URL der Ebenendatei mit Inhalts-Hash, damit Browser und Service Worker nie eine veraltete Fassung verwenden */
export const layerUrl = (layer: LayerId): string => `${LAYER_FILES[layer].file}?v=${LAYER_FILES[layer].hash}`
