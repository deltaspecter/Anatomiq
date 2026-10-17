/**
 * Erzeugt die 3D-Modelle der App aus BodyParts3D (© The Database Center for Life Science, CC BY 4.0).
 *
 *   node scripts/build-model.ts            # lädt die Rohdaten bei Bedarf nach .cache/bodyparts3d/ und baut alles
 *   node scripts/build-model.ts --only skeleton,organs
 *
 * Ablauf je Struktur aus scripts/model/catalog.ts:
 *   1. BodyParts3D-Konzepte → Element-Dateien (FJxxxx.obj) auflösen; jede Element-Datei gehört genau einer Struktur
 *   2. OBJ-Dateien einlesen, zusammenführen, Koordinaten umrechnen (mm, Z oben → m, Y oben, Blick von vorn entlang −Z)
 *   3. Gleiche Punkte verschweißen, mit meshoptimizer auf das Dreiecksbudget vereinfachen, Normalen berechnen
 *   4. Je Ebene eine GLB-Datei (ein benannter Knoten je Struktur), quantisiert und mit EXT_meshopt_compression gepackt
 *
 * Ausgabe:
 *   public/models/<ebene>.glb
 *   src/data/generated/model-manifest.json   (Struktur → Ebene, Dreiecke, Mittelpunkt, Größe, Herkunft)
 *
 * Die erzeugten Dateien liegen im Repository, damit Build und Hosting die 270 MB Rohdaten nicht brauchen.
 */
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import yauzl from 'yauzl'
import { LAYER_IDS, LAYERS, type LayerId } from '../src/data/layers.ts'
import { CATALOG, type CatalogEntry, type Source } from './model/catalog.ts'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const CACHE = join(ROOT, '.cache/bodyparts3d')
const BASE_URL = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'
const ARCHIVES = ['partof_BP3D_4.0_obj_99', 'isa_BP3D_4.0_obj_99']
const TABLES = ['partof_element_parts.txt', 'isa_element_parts.txt', 'partof_parts_list_e.txt', 'isa_parts_list_e.txt']

const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx > 0 ? new Set(process.argv[onlyIdx + 1].split(',')) : null

// ── 1. Rohdaten ────────────────────────────────────────────────
async function download(url: string, file: string) {
  console.log(`↓ ${url}`)
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download fehlgeschlagen: ${url} (${res.status})`)
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file))
}

function extract(zipFile: string, targetDir: string): Promise<void> {
  mkdirSync(targetDir, { recursive: true })
  return new Promise((resolve, reject) => {
    yauzl.open(zipFile, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err)
      zip.on('entry', (entry: yauzl.Entry) => {
        const name = entry.fileName.split('/').pop() ?? ''
        if (!name.endsWith('.obj')) return zip.readEntry()
        zip.openReadStream(entry, (e, stream) => {
          if (e || !stream) return reject(e)
          stream.pipe(createWriteStream(join(targetDir, name))).on('finish', () => zip.readEntry())
        })
      })
      zip.on('end', resolve)
      zip.on('error', reject)
      zip.readEntry()
    })
  })
}

async function ensureRawData() {
  mkdirSync(CACHE, { recursive: true })
  for (const table of TABLES) if (!existsSync(join(CACHE, table))) await download(BASE_URL + table, join(CACHE, table))
  for (const archive of ARCHIVES) {
    if (existsSync(join(CACHE, archive))) continue
    const zip = join(CACHE, `${archive}.zip`)
    if (!existsSync(zip)) await download(`${BASE_URL}${archive}.zip`, zip)
    console.log(`⇢ entpacke ${archive}`)
    await extract(zip, join(CACHE, archive))
  }
}

// ── 2. Tabellen: Konzept → Element-Dateien ──────────────────────
type Concept = { fma: string; name: string; elements: Set<string> }
const concepts = new Map<string, Concept>()

function loadTables() {
  for (const table of ['partof_element_parts.txt', 'isa_element_parts.txt']) {
    for (const line of readFileSync(join(CACHE, table), 'utf8').split('\n').slice(1)) {
      const [fma, name, element] = line.split('\t').map((s) => s?.trim())
      if (!element) continue
      let concept = concepts.get(name)
      if (!concept) concepts.set(name, (concept = { fma, name, elements: new Set() }))
      concept.elements.add(element)
    }
  }
}

/** Spezifischstes Konzept je Element (kleinste Elementmenge; bei Gleichstand der kürzere, allgemeinere Name) */
const mostSpecific = new Map<string, string>()
function computeMostSpecific() {
  for (const concept of concepts.values())
    for (const element of concept.elements) {
      const prev = mostSpecific.get(element)
      const p = prev ? concepts.get(prev)! : null
      if (!p || concept.elements.size < p.elements.size || (concept.elements.size === p.elements.size && concept.name.length < p.name.length)) mostSpecific.set(element, concept.name)
    }
}

function resolveSource(source: Source): Concept[] {
  if (typeof source === 'object' && !(source instanceof RegExp)) {
    const own = concepts.get(source.own)
    if (!own) throw new Error(`BodyParts3D-Konzept nicht gefunden: „${source.own}“`)
    const within = source.within ? concepts.get(source.within) : null
    if (source.within && !within) throw new Error(`BodyParts3D-Konzept nicht gefunden: „${source.within}“`)
    const elements = new Set([...own.elements].filter((e) => mostSpecific.get(e) === own.name && (!within || within.elements.has(e))))
    if (!elements.size) throw new Error(`Keine eigenen Elemente: ${JSON.stringify(source)}`)
    return [{ fma: within?.fma ?? own.fma, name: within?.name ?? own.name, elements }]
  }
  if (typeof source === 'string') {
    const concept = concepts.get(source)
    if (!concept) throw new Error(`BodyParts3D-Konzept nicht gefunden: „${source}“`)
    return [concept]
  }
  const found = [...concepts.values()].filter((c) => source.test(c.name))
  if (!found.length) throw new Error(`Kein BodyParts3D-Konzept passt zu ${source}`)
  return found
}

function elementFile(element: string): string | null {
  for (const archive of ARCHIVES) {
    const file = join(CACHE, archive, `${element}.obj`)
    if (existsSync(file)) return file
  }
  return null
}

// ── 3. Geometrie ───────────────────────────────────────────────
type Geometry = { positions: Float32Array<ArrayBuffer>; indices: Uint32Array<ArrayBuffer> }

/** Liest eine BodyParts3D-OBJ-Datei (nur v und f, Dreiecke) und rechnet in App-Koordinaten um */
function readObj(file: string, out: { positions: number[]; indices: number[] }) {
  const base = out.positions.length / 3
  const local: number[] = []
  const faces: number[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number)
      // BodyParts3D: mm, X = links(+)/rechts(−) des Körpers, Y = vorn(−)/hinten(+), Z = oben
      // App: m, X gleich, Y = oben, Z = vorn(+) – eine echte Drehung, keine Spiegelung
      local.push(x / 1000, z / 1000, -y / 1000)
    } else if (line.startsWith('f ')) {
      const parts = line.trim().split(/\s+/).slice(1)
      const idx = parts.map((p) => Number(p.split('/')[0]) - 1)
      for (let i = 1; i + 1 < idx.length; i++) faces.push(idx[0], idx[i], idx[i + 1])
    }
  }
  // Ausrichtung prüfen: geschlossene Flächen sollen nach außen zeigen (positives Volumen)
  let volume = 0
  for (let i = 0; i < faces.length; i += 3) {
    const [a, b, c] = [faces[i] * 3, faces[i + 1] * 3, faces[i + 2] * 3]
    volume +=
      local[a] * (local[b + 1] * local[c + 2] - local[b + 2] * local[c + 1]) -
      local[a + 1] * (local[b] * local[c + 2] - local[b + 2] * local[c]) +
      local[a + 2] * (local[b] * local[c + 1] - local[b + 1] * local[c])
  }
  if (volume < 0) for (let i = 0; i < faces.length; i += 3) [faces[i + 1], faces[i + 2]] = [faces[i + 2], faces[i + 1]]
  for (const v of local) out.positions.push(v)
  for (const f of faces) out.indices.push(f + base)
}

/** Verschweißt Punkte, die auf 0,05 mm übereinstimmen */
function weld(positions: number[], indices: number[]): Geometry {
  const map = new Map<string, number>()
  const remap = new Uint32Array(positions.length / 3)
  const out: number[] = []
  const q = (v: number) => Math.round(v * 20000)
  for (let i = 0; i < remap.length; i++) {
    const key = `${q(positions[i * 3])},${q(positions[i * 3 + 1])},${q(positions[i * 3 + 2])}`
    let target = map.get(key)
    if (target === undefined) {
      target = out.length / 3
      map.set(key, target)
      out.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
    }
    remap[i] = target
  }
  const tri: number[] = []
  for (let i = 0; i < indices.length; i += 3) {
    const a = remap[indices[i]], b = remap[indices[i + 1]], c = remap[indices[i + 2]]
    if (a !== b && b !== c && a !== c) tri.push(a, b, c)
  }
  return { positions: new Float32Array(out), indices: new Uint32Array(tri) }
}

function simplify(geo: Geometry, budget: number): Geometry {
  const triangles = geo.indices.length / 3
  if (triangles <= budget) return geo
  const [indices] = MeshoptSimplifier.simplify(geo.indices, geo.positions, 3, budget * 3, 0.05, [])
  // Unbenutzte Punkte entfernen
  const remap = new Int32Array(geo.positions.length / 3).fill(-1)
  const positions: number[] = []
  const out = new Uint32Array(indices.length)
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i]
    if (remap[v] < 0) {
      remap[v] = positions.length / 3
      positions.push(geo.positions[v * 3], geo.positions[v * 3 + 1], geo.positions[v * 3 + 2])
    }
    out[i] = remap[v]
  }
  return { positions: new Float32Array(positions), indices: out }
}

function computeNormals(geo: Geometry): Float32Array<ArrayBuffer> {
  const n = new Float32Array(geo.positions.length)
  const p = geo.positions
  for (let i = 0; i < geo.indices.length; i += 3) {
    const a = geo.indices[i] * 3, b = geo.indices[i + 1] * 3, c = geo.indices[i + 2] * 3
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2]
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    for (const k of [a, b, c]) {
      n[k] += nx
      n[k + 1] += ny
      n[k + 2] += nz
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const len = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1
    n[i] /= len
    n[i + 1] /= len
    n[i + 2] /= len
  }
  return n
}

function bounds(positions: Float32Array) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  return { min, max }
}

// ── 3b. HRA-Referenzlunge ──────────────────────────────────────
const HRA_LUNG_URL = 'https://cdn.humanatlas.io/digital-objects/ref-organ/lung-male/v1.4/assets/3d-vh-m-lung.glb'
const HRA_CACHE = join(ROOT, '.cache/hra')
type RawGeometry = { positions: number[]; indices: number[] }
let hraNodes: Map<string, RawGeometry> | null = null

/** Lädt die HRA-Lunge und liefert je Knoten die Geometrie in Weltkoordinaten (m; Achsen wie die App: rechts −X, vorn +Z, oben +Y) */
async function loadHraLung(): Promise<Map<string, RawGeometry>> {
  if (hraNodes) return hraNodes
  mkdirSync(HRA_CACHE, { recursive: true })
  const file = join(HRA_CACHE, '3d-vh-m-lung.glb')
  if (!existsSync(file)) await download(HRA_LUNG_URL, file)
  const doc = await new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).read(file)
  hraNodes = new Map()
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    const m = node.getWorldMatrix()
    const geo: RawGeometry = { positions: [], indices: [] }
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')!
      const base = geo.positions.length / 3
      const v = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v)
        geo.positions.push(m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14])
      }
      const idx = prim.getIndices()
      if (idx) for (let i = 0; i < idx.getCount(); i++) geo.indices.push(idx.getScalar(i) + base)
      else for (let i = 0; i < pos.getCount(); i++) geo.indices.push(i + base)
    }
    hraNodes.set(node.getName(), geo)
  }
  return hraNodes
}

const rawBounds = (positions: number[]) => bounds(new Float32Array(positions))

/**
 * Einpassen: Die HRA-Lunge einer Seite (alle Segmentflächen) wird achsenweise so skaliert und verschoben,
 * dass sie den Bronchialbaum derselben Seite aus BodyParts3D mit anatomisch begründeten Abständen umschließt:
 * Lungenspitze etwas über, Lungenbasis (Recessus) deutlich unter den letzten Bronchien, außen und vorn/hinten wenige mm.
 */
async function hraLobe(entry: CatalogEntry, offset: number[]): Promise<RawGeometry> {
  const nodes = await loadHraLung()
  const { side } = entry.hra!
  const sidePattern = side === 'right' ? /^VH_M_(right_.*bronchopulmonary_segment|hilum_(upper|middle|lower)_R)$/ : /^VH_M_(left_.*bronchopulmonary_segment|hilum_(upper|lower)_L)$/
  const all: number[] = []
  for (const [name, geo] of nodes) if (sidePattern.test(name)) all.push(...geo.positions)
  const h = rawBounds(all)
  const tree = { positions: [] as number[], indices: [] as number[] }
  for (const element of concepts.get(`${side} bronchial tree`)!.elements) readObj(elementFile(element)!, tree)
  for (let i = 0; i < tree.positions.length; i += 3) for (let k = 0; k < 3; k++) tree.positions[i + k] += offset[k]
  const t = rawBounds(tree.positions)
  const lateral = 0.008, medial = 0, sagittal = 0.008, apex = 0.012, base = 0.028
  const tmin = [side === 'right' ? t.min[0] - lateral : t.min[0] - medial, t.min[1] - base, t.min[2] - sagittal]
  const tmax = [side === 'right' ? t.max[0] + medial : t.max[0] + lateral, t.max[1] + apex, t.max[2] + sagittal]
  const out: RawGeometry = { positions: [], indices: [] }
  for (const [name, geo] of nodes) {
    if (!entry.hra!.nodes.test(name)) continue
    const base0 = out.positions.length / 3
    for (let i = 0; i < geo.positions.length; i += 3)
      for (let k = 0; k < 3; k++) out.positions.push(tmin[k] + ((geo.positions[i + k] - h.min[k]) / (h.max[k] - h.min[k])) * (tmax[k] - tmin[k]))
    for (const idx of geo.indices) out.indices.push(idx + base0)
  }
  if (!out.indices.length) throw new Error(`${entry.id}: keine HRA-Knoten gefunden`)
  return out
}

// ── 4. Ablauf ──────────────────────────────────────────────────
await ensureRawData()
loadTables()
computeMostSpecific()
await MeshoptSimplifier.ready
await MeshoptEncoder.ready

// Element-Dateien zuordnen. Gehört ein Element zu mehreren Einträgen, gewinnt das spezifischere Konzept
// (kleinere Elementmenge) – so landet z. B. die Pfortader nicht zusätzlich in der Leber.
type Claim = { entry: CatalogEntry; specificity: number }
const claims = new Map<string, Claim>()
const conceptsOf = new Map<string, Concept[]>()
for (const entry of CATALOG) {
  const included = entry.include.flatMap(resolveSource)
  const excluded = new Set((entry.exclude ?? []).flatMap(resolveSource).flatMap((c) => [...c.elements]))
  conceptsOf.set(entry.id, included)
  for (const concept of included)
    for (const element of concept.elements) {
      if (excluded.has(element)) continue
      const prev = claims.get(element)
      if (!prev || concept.elements.size < prev.specificity) claims.set(element, { entry, specificity: concept.elements.size })
    }
}
const elementsOf = new Map<string, string[]>()
for (const [element, claim] of claims) {
  const list = elementsOf.get(claim.entry.id) ?? []
  list.push(element)
  elementsOf.set(claim.entry.id, list)
}

// Gesamtausrichtung aus der Haut: Körpermitte auf x = z = 0, Fußsohlen auf y = 0
const skinRaw = { positions: [] as number[], indices: [] as number[] }
for (const element of elementsOf.get('skin') ?? []) readObj(elementFile(element)!, skinRaw)
const skinBounds = bounds(new Float32Array(skinRaw.positions))
const offset = [-(skinBounds.min[0] + skinBounds.max[0]) / 2, -skinBounds.min[1], -(skinBounds.min[2] + skinBounds.max[2]) / 2]

type ManifestEntry = {
  id: string
  layer: LayerId
  source: 'bodyparts3d' | 'hra-lung-male-v1.4'
  triangles: number
  sourceTriangles: number
  center: number[]
  size: number[]
  concepts: { fma: string; name: string }[]
  elements: string[]
}
const manifestFile = join(ROOT, 'src/data/generated/model-manifest.json')
const previous: { layers: Record<string, unknown>; structures: ManifestEntry[] } = existsSync(manifestFile)
  ? JSON.parse(readFileSync(manifestFile, 'utf8'))
  : { layers: {}, structures: [] }
const manifest: ManifestEntry[] = []
const layerInfo: Record<string, { file: string; bytes: number; hash: string; triangles: number }> = {}

for (const layer of LAYER_IDS) {
  if (ONLY && !ONLY.has(layer)) {
    manifest.push(...previous.structures.filter((s) => s.layer === layer))
    if (previous.layers[layer]) layerInfo[layer] = previous.layers[layer] as never
    continue
  }
  const entries = CATALOG.filter((e) => e.layer === layer)
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene(layer)
  const rgb = [1, 3, 5].map((i) => (Number.parseInt(LAYERS[layer].color.slice(i, i + 2), 16) / 255) ** 2.2)
  const material = doc.createMaterial(layer).setBaseColorFactor([rgb[0], rgb[1], rgb[2], 1]).setRoughnessFactor(LAYERS[layer].roughness).setMetallicFactor(0).setDoubleSided(true)
  let layerTriangles = 0
  for (const entry of entries) {
    const elements = (elementsOf.get(entry.id) ?? []).sort()
    let raw: RawGeometry
    if (entry.hra) raw = await hraLobe(entry, offset)
    else {
      if (!elements.length) throw new Error(`${entry.id}: keine Element-Dateien (alle von spezifischeren Einträgen beansprucht?)`)
      raw = { positions: [], indices: [] }
      for (const element of elements) {
        const file = elementFile(element)
        if (!file) throw new Error(`${entry.id}: Element-Datei ${element}.obj fehlt`)
        readObj(file, raw)
      }
      for (let i = 0; i < raw.positions.length; i += 3) for (let k = 0; k < 3; k++) raw.positions[i + k] += offset[k]
    }
    const sourceTriangles = raw.indices.length / 3
    const geo = simplify(weld(raw.positions, raw.indices), entry.budget)
    const normals = computeNormals(geo)
    const { min, max } = bounds(geo.positions)
    const triangles = geo.indices.length / 3
    layerTriangles += triangles

    const position = doc.createAccessor().setType('VEC3').setArray(geo.positions).setBuffer(buffer)
    const normal = doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer)
    const indexArray = geo.positions.length / 3 < 65536 ? new Uint16Array(geo.indices) : geo.indices
    const index = doc.createAccessor().setType('SCALAR').setArray(indexArray).setBuffer(buffer)
    const prim = doc.createPrimitive().setAttribute('POSITION', position).setAttribute('NORMAL', normal).setIndices(index).setMaterial(material)
    const mesh = doc.createMesh(entry.id).addPrimitive(prim)
    scene.addChild(doc.createNode(entry.id).setMesh(mesh))

    const r = (v: number) => Math.round(v * 10000) / 10000
    manifest.push({
      id: entry.id,
      layer,
      triangles,
      sourceTriangles,
      center: min.map((v, k) => r((v + max[k]) / 2)),
      size: min.map((v, k) => r(max[k] - v)),
      source: entry.hra ? 'hra-lung-male-v1.4' : 'bodyparts3d',
      concepts: entry.hra ? [{ fma: 'HRA', name: entry.hra.nodes.source.replace(/[\^$()]/g, '') }] : (conceptsOf.get(entry.id) ?? []).map((c) => ({ fma: c.fma, name: c.name })),
      elements,
    })
    console.log(`  ${entry.id.padEnd(28)} ${String(sourceTriangles).padStart(7)} → ${String(triangles).padStart(6)} Dreiecke`)
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizeNormal: 8, quantizePosition: 14 }))
  const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  const glb = await io.writeBinary(doc)
  mkdirSync(join(ROOT, 'public/models'), { recursive: true })
  writeFileSync(join(ROOT, `public/models/${layer}.glb`), glb)
  const hash = createHash('sha256').update(glb).digest('hex').slice(0, 10)
  layerInfo[layer] = { file: `/models/${layer}.glb`, bytes: glb.byteLength, hash, triangles: layerTriangles }
  console.log(`✓ ${layer}.glb – ${entries.length} Strukturen, ${layerTriangles} Dreiecke, ${(glb.byteLength / 1024).toFixed(0)} KB`)
}

writeFileSync(manifestFile, JSON.stringify({ source: 'BodyParts3D 4.0 (DBCLS), CC BY 4.0; Lungenlappen: HRA 3D Reference Organ Lung, Male v1.4 (Browne & Schlehlein 2024), CC BY 4.0', layers: layerInfo, structures: manifest }, null, 1) + '\n')
console.log(`✓ Manifest: ${manifest.length} Strukturen`)
