import type { LayerId } from './layers'

export type SystemId =
  | 'skeletal'
  | 'muscular'
  | 'cardiovascular'
  | 'respiratory'
  | 'digestive'
  | 'urinary'
  | 'reproductive'
  | 'nervous'
  | 'sensory'
  | 'lymphatic'
  | 'endocrine'
  | 'integumentary'

export type RegionId = 'head' | 'neck' | 'thorax' | 'abdomen' | 'pelvis' | 'back' | 'upper-limb' | 'lower-limb' | 'whole-body'

export type Side = 'r' | 'l'

/** Verweis auf einen Eintrag in src/data/sources.ts */
export type SourceId = string

/**
 * Eine anatomische Struktur mit ihren Lerninhalten.
 * Verknüpfung zum 3D-Modell ausschließlich über meshIds (= Knotennamen in public/models/*.glb).
 * Leere Felder werden in der App nicht angezeigt – lieber weglassen als raten.
 */
export type AnatomicalStructure = {
  id: string
  nameDe: string
  nameLa: string
  nameEn?: string
  side?: Side
  system: SystemId
  region: RegionId
  layer: LayerId
  /** Ein bis zwei Sätze: das Wichtigste zuerst */
  summary: string
  location?: string
  /** Aufbau */
  structure?: string
  function?: string
  parts?: string[]
  neighbors?: string
  bloodSupply?: string
  innervation?: string
  /** Muskeln */
  origin?: string
  insertion?: string
  /** Knochen: Gelenkverbindungen */
  joints?: string
  clinical?: string
  terms?: { term: string; meaning: string }[]
  mnemonic?: string
  relatedStructureIds: string[]
  meshIds: string[]
  sourceReferences: SourceId[]
  /** Prüfstatus der Texte */
  status: 'draft' | 'reviewed'
  /** Eigene Farbe (sonst Ebenenfarbe) */
  color?: string
}

export const SYSTEM_LABELS: Record<SystemId, string> = {
  skeletal: 'Skelettsystem',
  muscular: 'Muskelsystem',
  cardiovascular: 'Herz-Kreislauf-System',
  respiratory: 'Atmungssystem',
  digestive: 'Verdauungssystem',
  urinary: 'Harnsystem',
  reproductive: 'Geschlechtsorgane',
  nervous: 'Nervensystem',
  sensory: 'Sinnesorgane',
  lymphatic: 'Lymphatisches System',
  endocrine: 'Hormonsystem (endokrin)',
  integumentary: 'Haut (Integument)',
}

export const REGION_LABELS: Record<RegionId, string> = {
  head: 'Kopf',
  neck: 'Hals',
  thorax: 'Brustkorb',
  abdomen: 'Bauch',
  pelvis: 'Becken',
  back: 'Rücken',
  'upper-limb': 'Obere Extremität',
  'lower-limb': 'Untere Extremität',
  'whole-body': 'Ganzer Körper',
}

export const SIDE_LABELS: Record<Side, string> = { r: 'rechts', l: 'links' }
