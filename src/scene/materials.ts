/**
 * Materialien werden nach (Farbe, Zustand) zwischengespeichert und von allen Meshes gemeinsam benutzt –
 * 227 Strukturen teilen sich so gut zwei Dutzend Materialien (weniger Shader-Wechsel, weniger GPU-Speicher).
 */
import { Color, DoubleSide, FrontSide, MeshStandardMaterial } from 'three'

export type MaterialMode = 'base' | 'ghost' | 'selected' | 'correct' | 'wrong'

const cache = new Map<string, MeshStandardMaterial>()
const HIGHLIGHT = new Color('#22c3ee')
const CORRECT = new Color('#4ccf7a')
const WRONG = new Color('#ef5f5f')

/**
 * Durchscheinende Darstellung mit Fresnel-Anteil: Flächen, die schräg zum Blick stehen, bleiben sichtbarer.
 * So bleibt die Kontur erkennbar, ohne die darunterliegenden Strukturen zu verdecken.
 */
function applyFresnel(material: MeshStandardMaterial, strength: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.fresnelStrength = { value: strength }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float fresnelStrength;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float facing = abs(dot(normalize(vViewPosition), normal));
        gl_FragColor.a = clamp(gl_FragColor.a * mix(fresnelStrength, 1.0, pow(1.0 - facing, 2.0)) * 1.6, 0.0, 1.0);`,
      )
  }
  material.customProgramCacheKey = () => `fresnel-${strength}`
}

/**
 * Hervorhebung als leuchtender Rand: Die Eigenfarbe der Struktur bleibt erhalten,
 * zum Rand hin (flacher Blickwinkel) leuchtet die Akzentfarbe auf.
 */
function applyRim(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rim = 1.0 - abs(dot(normalize(vViewPosition), normal));
      totalEmissiveRadiance *= 0.07 + 1.5 * pow(rim, 2.4);`,
    )
  }
  material.customProgramCacheKey = () => 'rim'
}

export function getMaterial(color: string, roughness: number, mode: MaterialMode, isSkin = false): MeshStandardMaterial {
  const key = `${color}|${roughness}|${mode}|${isSkin}`
  let material = cache.get(key)
  if (material) return material
  const base = new Color(color)
  material = new MeshStandardMaterial({ color: base, roughness, metalness: 0, side: DoubleSide })
  if (mode === 'ghost') {
    material.transparent = true
    material.opacity = isSkin ? 0.16 : 0.12
    material.depthWrite = false
    material.side = FrontSide
    applyFresnel(material, isSkin ? 0.15 : 0.3)
  } else if (mode === 'selected') {
    material.color = base.clone().lerp(HIGHLIGHT, 0.05)
    material.emissive = HIGHLIGHT.clone()
    material.emissiveIntensity = 1
    applyRim(material)
  } else if (mode === 'correct' || mode === 'wrong') {
    const tint = mode === 'correct' ? CORRECT : WRONG
    material.color = base.clone().lerp(tint, 0.6)
    material.emissive = tint.clone()
    material.emissiveIntensity = 0.3
  }
  cache.set(key, material)
  return material
}

export function disposeMaterials() {
  for (const material of cache.values()) material.dispose()
  cache.clear()
}
