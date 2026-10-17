/**
 * Lädt die Ebenendateien (GLB, meshopt-komprimiert) bei Bedarf und hängt sie in die Szene.
 * Eine Ebene wird erst geladen, wenn sie das erste Mal sichtbar oder transparent geschaltet wird.
 * Ladefehler betreffen nur die jeweilige Ebene; der Rest der App bleibt benutzbar.
 */
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { BufferGeometry, Group, Mesh } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh'
import { LAYER_IDS, type LayerId } from '@/data/layers'
import { layerUrl } from '@/data/model'
import { useViewer } from '@/state/viewer'
import { registerMeshes, unregisterLayer } from './registry'
import { applyAllVisibility } from './visibilitySync'

// Beschleunigte Strahlverfolgung (BVH) für zuverlässiges und schnelles Antippen auch kleiner Strukturen
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree as unknown as typeof BufferGeometry.prototype.computeBoundsTree
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
Mesh.prototype.raycast = acceleratedRaycast

let loader: GLTFLoader | null = null
function getLoader() {
  if (!loader) {
    loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
  }
  return loader
}

export function AnatomyModel() {
  const root = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  const groups = useRef(new Map<LayerId, Group>())
  const requested = useRef(new Set<LayerId>())
  const layers = useViewer((s) => s.layers)
  const loadStates = useViewer((s) => s.load)

  useEffect(() => {
    for (const layer of LAYER_IDS) {
      const state = useViewer.getState().load[layer]
      if (layers[layer] === 'hidden' || state === 'loading' || state === 'ready') continue
      if (state === 'error' && requested.current.has(layer)) continue
      requested.current.add(layer)
      load(layer)
    }

    function load(layer: LayerId) {
      const { setLoad } = useViewer.getState()
      setLoad(layer, 'loading', 0)
      getLoader().load(
        layerUrl(layer),
        (gltf) => {
          const group = gltf.scene
          group.name = `layer:${layer}`
          const meshes: Mesh[] = []
          group.traverse((obj) => {
            if (obj instanceof Mesh) {
              obj.geometry.computeBoundsTree()
              obj.matrixAutoUpdate = false
              obj.updateMatrix()
              meshes.push(obj)
            }
          })
          // Ein Knoten = eine Struktur; GLTFLoader benennt das Mesh nach dem Knoten
          for (const mesh of meshes) if (!mesh.name && mesh.parent) mesh.name = mesh.parent.name
          groups.current.set(layer, group)
          root.current?.add(group)
          registerMeshes(layer, meshes)
          applyAllVisibility()
          setLoad(layer, 'ready', 1)
          invalidate()
        },
        (event) => {
          if (event.total) useViewer.getState().setLoad(layer, 'loading', event.loaded / event.total)
        },
        (error) => {
          console.warn(`Ebene ${layer} konnte nicht geladen werden`, error)
          useViewer.getState().setLoad(layer, 'error', 0)
        },
      )
    }
  }, [layers, loadStates, invalidate])

  // Beim Verlassen GPU-Ressourcen freigeben
  useEffect(() => {
    const current = groups.current
    return () => {
      for (const [layer, group] of current) {
        group.traverse((obj) => {
          if (obj instanceof Mesh) {
            obj.geometry.disposeBoundsTree?.()
            obj.geometry.dispose()
          }
        })
        unregisterLayer(layer)
      }
      current.clear()
    }
  }, [])

  return <group ref={root} />
}

/** Erneuter Ladeversuch nach einem Fehler (z. B. nach Netzwerkausfall) */
export function retryLayer(layer: LayerId) {
  useViewer.getState().setLoad(layer, 'idle', 0)
}
