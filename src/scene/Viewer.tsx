/**
 * Die 3D-Ansicht: Canvas, Licht, Umgebung, Modell, Kamera und Auswahl.
 * Gerendert wird nur bei Bedarf (frameloop="demand") – im Ruhezustand verbraucht die App keine GPU-Zeit.
 */
import { Canvas, useThree } from '@react-three/fiber'
import { Component, useEffect, useMemo, type ReactNode } from 'react'
import { PMREMGenerator, type WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CameraRig, FOV } from '@/camera/CameraRig'
import { Picker } from '@/selection/Picker'
import { usePrefs } from '@/state/prefs'
import { AnatomyModel } from './AnatomyModel'
import { disposeMaterials } from './materials'
import { setRenderCallback, startVisibilitySync, stopVisibilitySync } from './visibilitySync'

/** Neutrale Studio-Umgebung für weiche Reflexe – lokal erzeugt, ohne HDR-Download */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Sync() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    setRenderCallback(invalidate)
    startVisibilitySync()
    return () => {
      stopVisibilitySync()
      disposeMaterials()
    }
  }, [invalidate])
  return null
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function useDpr(): number | [number, number] {
  const quality = usePrefs((s) => s.quality)
  return useMemo(() => {
    if (quality === 'low') return 1
    if (quality === 'high') return [1, 2]
    // Automatisch: hochauflösend, aber nicht mehr als 2× (iPhones melden bis zu 3×)
    return [1, Math.min(window.devicePixelRatio || 1, 2)]
  }, [quality])
}

export function Viewer({ panelOffset }: { panelOffset: { x: number; y: number } }) {
  const dpr = useDpr()
  const quality = usePrefs((s) => s.quality)
  return (
    <ViewerErrorBoundary>
      <Canvas
        key={quality === 'low' ? 'low' : 'high'}
        className="viewer-canvas"
        frameloop="demand"
        dpr={dpr}
        camera={{ fov: FOV, near: 0.01, far: 30, position: [0, 0.9, 3.4] }}
        gl={{ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }: { gl: WebGLRenderer }) => {
          gl.setClearColor(0x000000, 0)
        }}
        aria-label="Interaktives 3D-Modell des menschlichen Körpers"
      >
        <hemisphereLight args={['#f4f1ea', '#3a4150', 0.9]} />
        <directionalLight position={[1.2, 2.6, 2.4]} intensity={1.6} />
        <directionalLight position={[-1.8, 1.2, -1.6]} intensity={0.7} color="#cfe0ff" />
        <directionalLight position={[0, -1, 1.5]} intensity={0.25} />
        <StudioEnvironment />
        <AnatomyModel />
        <Sync />
        <Picker />
        <CameraRig panelOffset={panelOffset} />
      </Canvas>
    </ViewerErrorBoundary>
  )
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.warn('3D-Ansicht abgestürzt', error)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="absolute inset-0 grid place-items-center p-8 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-lg font-semibold">Die 3D-Ansicht konnte nicht gestartet werden.</p>
          <p className="text-sm text-[--muted]">Möglicherweise ist der Grafikspeicher erschöpft. Ein Neuladen hilft meistens; in den Einstellungen lässt sich zusätzlich die einfache Darstellung wählen.</p>
          <button className="btn-primary" onClick={() => location.reload()}>
            Neu laden
          </button>
        </div>
      </div>
    )
  }
}
