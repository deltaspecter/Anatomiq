/**
 * Zuordnung: Struktur-ID (= Mesh-Name in den GLB-Dateien) → Bestandteile aus BodyParts3D.
 *
 * Jeder Eintrag fasst ein oder mehrere BodyParts3D-Konzepte (englische FMA-Namen aus
 * partof_element_parts.txt / isa_element_parts.txt) zu genau einem auswählbaren Mesh zusammen.
 * „{side}“ wird bei paarigen Strukturen durch „right“ bzw. „left“ ersetzt.
 * Reguläre Ausdrücke erlauben Gruppen (z. B. alle Handwurzelknochen einer Seite).
 *
 * budget = Ziel-Dreieckszahl nach der Vereinfachung (Kompromiss aus Detail und iPhone-Leistung).
 * Die anatomischen Texte stehen getrennt davon in src/data/structures/ und verweisen über meshIds hierauf.
 */
import type { LayerId } from '../../src/data/layers.ts'

export type Source = string | RegExp
export type CatalogEntry = {
  id: string
  layer: LayerId
  include: Source[]
  exclude?: Source[]
  budget: number
}

const SIDES = [
  ['r', 'right'],
  ['l', 'left'],
] as const

function sideSource(source: Source, side: string): Source {
  if (typeof source === 'string') return source.replaceAll('{side}', side)
  return new RegExp(source.source.replaceAll('\\{side\\}', side).replaceAll('{side}', side), source.flags)
}

/** Paarige Struktur → zwei Einträge <id>-r und <id>-l */
function pair(id: string, layer: LayerId, include: Source[], budget: number, exclude: Source[] = []): CatalogEntry[] {
  return SIDES.map(([suffix, side]) => ({
    id: `${id}-${suffix}`,
    layer,
    include: include.map((s) => sideSource(s, side)),
    exclude: exclude.map((s) => sideSource(s, side)),
    budget,
  }))
}

const one = (id: string, layer: LayerId, include: Source[], budget: number, exclude: Source[] = []): CatalogEntry[] => [{ id, layer, include, exclude, budget }]

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'] as const

const vertebrae: CatalogEntry[] = [
  ...one('atlas', 'skeleton', ['atlas'], 1500),
  ...one('axis', 'skeleton', ['axis'], 1500),
  ...[3, 4, 5, 6, 7].flatMap((n) => one(`vertebra-c${n}`, 'skeleton', [`${ORD[n - 1]} cervical vertebra`], 1200)),
  ...ORD.flatMap((o, i) => one(`vertebra-t${i + 1}`, 'skeleton', [`${o} thoracic vertebra`], 1400)),
  ...ORD.slice(0, 5).flatMap((o, i) => one(`vertebra-l${i + 1}`, 'skeleton', [`${o} lumbar vertebra`], 1600)),
]

const ribs: CatalogEntry[] = ORD.flatMap((o, i) => pair(`rib-${i + 1}`, 'skeleton', [`{side} ${o} rib`], 1200))

export const CATALOG: CatalogEntry[] = [
  // ── Oberfläche ───────────────────────────────────────────────
  ...one('skin', 'skin', ['skin'], 40000),

  // ── Skelett: Schädel ────────────────────────────────────────
  ...one('frontal-bone', 'skeleton', ['frontal bone'], 4000),
  ...pair('parietal-bone', 'skeleton', ['{side} parietal bone'], 2500),
  ...one('occipital-bone', 'skeleton', ['occipital bone'], 3500),
  ...pair('temporal-bone', 'skeleton', ['{side} temporal bone'], 3500),
  ...one('sphenoid-bone', 'skeleton', ['sphenoid bone'], 3000),
  ...pair('zygomatic-bone', 'skeleton', ['{side} zygomatic bone'], 1200),
  ...pair('maxilla', 'skeleton', ['{side} maxilla'], 3000),
  ...pair('nasal-bone', 'skeleton', ['{side} nasal bone'], 300),
  ...one('mandible', 'skeleton', ['mandible'], 3500),
  ...one('hyoid-bone', 'skeleton', ['hyoid bone'], 600),
  // ── Skelett: Rumpf ──────────────────────────────────────────
  ...vertebrae,
  ...one('sacrum', 'skeleton', ['sacrum'], 3000),
  ...one('intervertebral-discs', 'skeleton', ['intervertebral disk'], 6000),
  ...one('sternum', 'skeleton', ['sternum'], 2000),
  ...ribs,
  ...pair('costal-cartilages', 'skeleton', ORD.slice(0, 7).map((o) => `{side} ${o} costal cartilage`), 2500),
  // ── Skelett: obere Extremität ────────────────────────────────
  ...pair('clavicle', 'skeleton', ['{side} clavicle'], 1200),
  ...pair('scapula', 'skeleton', ['{side} scapula'], 2500),
  ...pair('humerus', 'skeleton', ['{side} humerus'], 2500),
  ...pair('radius', 'skeleton', ['{side} radius'], 1800),
  ...pair('ulna', 'skeleton', ['{side} ulna'], 1800),
  ...pair('carpal-bones', 'skeleton', [/^{side} (scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate)$/], 2400),
  ...pair('metacarpal-bones', 'skeleton', [/^{side} (first|second|third|fourth|fifth) metacarpal bone$/], 2400),
  ...pair('hand-phalanges', 'skeleton', [/^(proximal|middle|distal) phalanx of {side} (thumb|index finger|middle finger|ring finger|little finger)$/], 3600),
  // ── Skelett: untere Extremität ───────────────────────────────
  ...pair('hip-bone', 'skeleton', ['{side} hip bone'], 4000),
  ...pair('femur', 'skeleton', ['{side} femur'], 2600),
  ...pair('patella', 'skeleton', ['{side} patella'], 700),
  ...pair('tibia', 'skeleton', ['{side} tibia'], 2400),
  ...pair('fibula', 'skeleton', ['{side} fibula'], 1500),
  ...pair('tarsal-bones', 'skeleton', [/^({side} (talus|calcaneus|cuboid bone|medial cuneiform bone|intermediate cuneiform bone|lateral cuneiform bone)|navicular bone of {side} foot)$/], 3000),
  ...pair('metatarsal-bones', 'skeleton', [/^{side} (first|second|third|fourth|fifth) metatarsal bone$/], 2400),
  ...pair('foot-phalanges', 'skeleton', [/^(proximal|middle|distal) phalanx of {side} (great toe|second toe|third toe|fourth toe|little toe)$/], 3000),

  // ── Muskulatur ───────────────────────────────────────────────
  ...pair('sternocleidomastoid', 'muscles', ['{side} sternocleidomastoid'], 1500),
  ...pair('trapezius', 'muscles', ['descending part of {side} trapezius', 'transverse part of {side} trapezius', 'ascending part of {side} trapezius'], 3000),
  ...pair('deltoid', 'muscles', ['clavicular part of {side} deltoid', 'acromial part of {side} deltoid', 'spinal part of {side} deltoid'], 2500),
  ...pair('pectoralis-major', 'muscles', ['{side} pectoralis major'], 2500),
  ...pair('pectoralis-minor', 'muscles', ['{side} pectoralis minor'], 1000),
  ...pair('serratus-anterior', 'muscles', ['{side} serratus anterior'], 2500),
  ...pair('external-oblique', 'muscles', ['{side} external oblique'], 2500),
  ...pair('rhomboid-major', 'muscles', ['{side} rhomboid major'], 1000),
  ...pair('supraspinatus', 'muscles', ['{side} supraspinatus'], 1000),
  ...pair('infraspinatus', 'muscles', ['{side} infraspinatus muscle'], 1200),
  ...pair('teres-major', 'muscles', ['{side} teres major'], 1000),
  ...pair('biceps-brachii', 'muscles', ['long head of {side} biceps brachii', 'short head of {side} biceps brachii'], 2000),
  ...pair('triceps-brachii', 'muscles', ['long head of {side} triceps brachii', 'lateral head of {side} triceps brachii', 'medial head of {side} triceps brachii'], 2500),
  ...pair('brachialis', 'muscles', ['{side} brachialis'], 1200),
  ...pair('brachioradialis', 'muscles', ['{side} brachioradialis'], 1200),
  ...pair('gluteus-maximus', 'muscles', ['{side} gluteus maximus'], 2500),
  ...pair('gluteus-medius', 'muscles', ['{side} gluteus medius'], 1500),
  ...pair('tensor-fasciae-latae', 'muscles', ['{side} tensor fasciae latae'], 1000),
  ...pair('iliacus', 'muscles', ['{side} iliacus'], 1200),
  ...pair('psoas-major', 'muscles', ['{side} psoas major'], 1500),
  ...pair('sartorius', 'muscles', ['{side} sartorius'], 1500),
  ...pair('rectus-femoris', 'muscles', ['{side} rectus femoris'], 1500),
  ...pair('vastus-lateralis', 'muscles', ['{side} vastus lateralis'], 2000),
  ...pair('vastus-medialis', 'muscles', ['{side} vastus medialis'], 1800),
  ...pair('adductor-longus', 'muscles', ['{side} adductor longus'], 1200),
  ...pair('gracilis', 'muscles', ['{side} gracilis'], 1200),
  ...pair('biceps-femoris', 'muscles', ['long head of {side} biceps femoris', 'short head of {side} biceps femoris'], 2000),
  ...pair('semitendinosus', 'muscles', ['{side} semitendinosus'], 1200),
  ...pair('semimembranosus', 'muscles', ['{side} semimembranosus'], 1500),
  ...pair('gastrocnemius', 'muscles', ['medial head of {side} gastrocnemius', 'lateral head of {side} gastrocnemius'], 2000),
  ...pair('soleus', 'muscles', ['{side} soleus'], 1800),
  ...pair('tibialis-anterior', 'muscles', ['{side} tibialis anterior'], 1500),
  ...pair('fibularis-longus', 'muscles', ['{side} fibularis longus'], 1200),
  ...one('diaphragm', 'muscles', ['diaphragm'], 4000),

  // ── Innere Organe ────────────────────────────────────────────
  ...one('heart', 'organs', ['heart'], 16000),
  ...pair('lung', 'organs', ['{side} lung'], 12000),
  ...one('trachea', 'organs', ['trachea'], 2000),
  ...one('esophagus', 'organs', ['esophagus'], 1500),
  ...one('thymus', 'organs', ['thymus'], 1500),
  ...one('liver', 'organs', ['liver'], 12000),
  ...one('gallbladder', 'organs', ['gallbladder'], 1000),
  ...one('stomach', 'organs', ['stomach'], 2500),
  ...one('spleen', 'organs', ['spleen'], 1200),
  ...one('pancreas', 'organs', ['pancreas'], 2000),
  ...one('duodenum', 'organs', ['duodenum'], 2000),
  ...one('jejunum', 'organs', ['jejunum'], 6000),
  ...one('ileum', 'organs', ['ileum'], 6000),
  ...one('cecum', 'organs', ['cecum'], 1200),
  ...one('appendix', 'organs', ['appendix'], 500),
  ...one('ascending-colon', 'organs', ['ascending colon'], 2000),
  ...one('transverse-colon', 'organs', ['transverse colon'], 2500),
  ...one('descending-colon', 'organs', ['descending colon'], 2000),
  ...one('rectum', 'organs', ['rectum'], 1500),
  ...pair('kidney', 'organs', ['{side} kidney'], 1800),
  ...pair('adrenal-gland', 'organs', ['{side} adrenal gland'], 600),
  ...pair('ureter', 'organs', ['{side} ureter'], 800),
  ...one('urinary-bladder', 'organs', ['urinary bladder'], 1500),
  ...one('prostate', 'organs', ['prostate'], 800),
  ...pair('testis', 'organs', ['{side} testis'], 800),
  ...pair('eyeball', 'organs', ['{side} eyeball'], 1500),

  // ── Nervensystem ─────────────────────────────────────────────
  ...pair('cerebral-hemisphere', 'nervous', ['{side} cerebral hemisphere'], 16000),
  ...one('cerebellum', 'nervous', ['cerebellum'], 6000),
  ...one('brainstem', 'nervous', ['brainstem'], 3000),
  ...one('spinal-cord', 'nervous', ['spinal cord'], 3000),
  ...pair('optic-nerve', 'nervous', ['{side} optic nerve'], 400),

  // ── Gefäße ───────────────────────────────────────────────────
  ...one('aorta', 'vessels', ['aorta'], 4000),
  ...one('pulmonary-trunk', 'vessels', ['pulmonary trunk'], 1000),
  ...one('brachiocephalic-trunk', 'vessels', ['brachiocephalic artery'], 600),
  ...pair('common-carotid-artery', 'vessels', ['{side} common carotid artery'], 800),
  ...pair('subclavian-artery', 'vessels', ['{side} subclavian artery'], 800),
  ...pair('common-iliac-artery', 'vessels', ['{side} common iliac artery'], 600),
  ...pair('femoral-artery', 'vessels', ['{side} femoral artery'], 1200),
  ...one('superior-vena-cava', 'vessels', ['superior vena cava'], 600),
  ...one('inferior-vena-cava', 'vessels', ['inferior vena cava'], 1500),
  ...pair('internal-jugular-vein', 'vessels', ['{side} internal jugular vein'], 800),
  ...pair('femoral-vein', 'vessels', ['{side} femoral vein'], 1200),
  ...pair('great-saphenous-vein', 'vessels', ['{side} great saphenous vein'], 1500),
  ...one('hepatic-portal-vein', 'vessels', ['hepatic portal vein'], 1500),
]
