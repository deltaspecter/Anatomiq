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

/**
 * string: alle Elemente eines Konzepts (inklusive aller Unterteile)
 * RegExp: alle Konzepte, deren Name passt
 * { own, within }: nur die Elemente, die eigentlich zu „own“ gehören (dessen spezifischstes Konzept es ist),
 *   optional eingeschränkt auf die Elemente von „within“ (z. B. die Körperseite). Nötig bei Gefäßen, deren
 *   BodyParts3D-Konzept den gesamten nachgeschalteten Gefäßbaum einschließt.
 */
export type Source = string | RegExp | { own: string; within?: string }
export type CatalogEntry = {
  id: string
  layer: LayerId
  include: Source[]
  exclude?: Source[]
  budget: number
  /**
   * Geometrie aus der HRA-Referenzlunge (Human Reference Atlas, CC BY 4.0) statt aus BodyParts3D:
   * Knoten nach Namen, eingepasst auf den Bronchialbaum derselben Körperseite (siehe build-model.ts)
   */
  hra?: { nodes: RegExp; side: 'right' | 'left' }
}

const SIDES = [
  ['r', 'right'],
  ['l', 'left'],
] as const

function sideSource(source: Source, side: string): Source {
  if (typeof source === 'string') return source.replaceAll('{side}', side)
  if (!(source instanceof RegExp)) return { own: source.own.replaceAll('{side}', side), within: source.within?.replaceAll('{side}', side) }
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
  ...one('ethmoid-bone', 'skeleton', ['ethmoid'], 2500),
  ...pair('lacrimal-bone', 'skeleton', ['{side} lacrimal bone'], 300),
  ...pair('palatine-bone', 'skeleton', ['{side} palatine bone'], 700),
  ...one('vomer', 'skeleton', ['vomer'], 1200),
  ...pair('inferior-nasal-concha', 'skeleton', ['{side} inferior nasal concha'], 500),
  ...one('mandible', 'skeleton', ['mandible'], 3500),
  ...one('upper-teeth', 'skeleton', [/^(left|right) upper .*tooth$/], 4200),
  ...one('lower-teeth', 'skeleton', [/^(left|right) lower .*tooth$/], 4200),
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
  ...pair('levator-scapulae', 'muscles', ['{side} levator scapulae'], 1000),
  ...pair('splenius-capitis', 'muscles', ['{side} splenius capitis'], 1200),
  ...pair('scalenus-anterior', 'muscles', ['{side} scalenus anterior'], 800),
  ...pair('scalenus-medius', 'muscles', ['{side} scalenus medius'], 1000),
  ...pair('iliocostalis-lumborum', 'muscles', ['{side} iliocostalis lumborum'], 1800),
  ...pair('longissimus-thoracis', 'muscles', ['{side} longissimus thoracis'], 1800),
  ...pair('teres-minor', 'muscles', ['{side} teres minor'], 500),
  ...pair('subscapularis', 'muscles', ['{side} subscapularis'], 1200),
  ...pair('coracobrachialis', 'muscles', ['{side} coracobrachialis'], 450),
  ...pair('flexor-carpi-radialis', 'muscles', ['{side} flexor carpi radialis'], 1000),
  ...pair('palmaris-longus', 'muscles', ['{side} palmaris longus'], 1000),
  ...pair('flexor-digitorum-superficialis', 'muscles', ['{side} flexor digitorum superficialis'], 1600),
  ...pair('flexor-digitorum-profundus', 'muscles', ['{side} flexor digitorum profundus'], 1400),
  ...pair('extensor-carpi-radialis-longus', 'muscles', ['{side} extensor carpi radialis longus'], 1000),
  ...pair('extensor-digitorum', 'muscles', ['{side} extensor digitorum'], 1400),
  ...pair('extensor-carpi-ulnaris', 'muscles', ['{side} extensor carpi ulnaris'], 1000),
  ...pair('supinator', 'muscles', ['{side} supinator'], 900),
  ...pair('gluteus-minimus', 'muscles', ['{side} gluteus minimus'], 1200),
  ...pair('piriformis', 'muscles', ['{side} piriformis'], 700),
  ...pair('adductor-magnus', 'muscles', ['{side} adductor magnus'], 1800),
  ...pair('vastus-intermedius', 'muscles', ['{side} vastus intermedius'], 1400),
  ...pair('tibialis-posterior', 'muscles', ['{side} tibialis posterior'], 1400),
  ...pair('extensor-digitorum-longus', 'muscles', ['{side} extensor digitorum longus'], 1400),
  ...pair('fibularis-brevis', 'muscles', ['{side} fibularis brevis'], 900),

  // ── Innere Organe ────────────────────────────────────────────
  ...one('heart', 'organs', ['heart'], 16000),
  // BodyParts3D enthält keine Lungenoberfläche – nur Bronchial- und Gefäßbäume der Segmente
  ...pair('bronchial-tree', 'organs', ['{side} lung'], 12000),
  // Lungenlappen aus der HRA-Referenzlunge (männlich, v1.4), Segmentflächen je Lappen
  { id: 'lung-upper-lobe-r', layer: 'organs', include: [], budget: 5000, hra: { side: 'right', nodes: /^VH_M_(right_(apical|posterior|anterior)_bronchopulmonary_segment|hilum_upper_R)$/ } },
  { id: 'lung-middle-lobe-r', layer: 'organs', include: [], budget: 3000, hra: { side: 'right', nodes: /^VH_M_(right_(lateral|medial)_bronchopulmonary_segment|hilum_middle_R)$/ } },
  { id: 'lung-lower-lobe-r', layer: 'organs', include: [], budget: 5000, hra: { side: 'right', nodes: /^VH_M_(right_(superior|anterior_basal|lateral_basal|medial_basal|posterior_basal)_bronchopulmonary_segment|hilum_lower_R)$/ } },
  { id: 'lung-upper-lobe-l', layer: 'organs', include: [], budget: 5000, hra: { side: 'left', nodes: /^VH_M_(left_(apical|posterior|anterior|lingula_superior|lingula_inferior)_bronchopulmonary_segment|hilum_upper_L)$/ } },
  { id: 'lung-lower-lobe-l', layer: 'organs', include: [], budget: 5000, hra: { side: 'left', nodes: /^VH_M_(left_(superior|anterior_basal|lateral_basal|medial_basal|posetrior_basal|posterior_basal)_bronchopulmonary_segment|hilum_lower_L)$/ } },
  ...one('trachea', 'organs', ['trachea'], 2000),
  ...one('esophagus', 'organs', ['esophagus'], 1500),
  ...one('tongue', 'organs', ['tongue'], 600),
  ...one('epiglottis', 'organs', ['epiglottis'], 1200),
  ...one('thyroid-cartilage', 'organs', ['thyroid cartilage'], 1500),
  ...one('cricoid-cartilage', 'organs', ['cricoid cartilage'], 1200),
  ...pair('submandibular-gland', 'organs', ['{side} submandibular gland'], 250),
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
  // Nur die Gefäße selbst, ohne ihren nachgeschalteten Gefäßbaum (siehe Source.own)
  ...one('aorta', 'vessels', ['aorta'], 4000),
  ...one('pulmonary-trunk', 'vessels', ['pulmonary trunk'], 1000),
  ...one('brachiocephalic-trunk', 'vessels', [{ own: 'brachiocephalic artery' }], 600),
  ...pair('common-carotid-artery', 'vessels', [{ own: 'common carotid artery', within: '{side} common carotid artery' }], 800),
  ...pair('internal-carotid-artery', 'vessels', [{ own: 'internal carotid artery', within: '{side} internal carotid artery' }], 800),
  ...pair('vertebral-artery', 'vessels', [{ own: 'vertebral artery', within: '{side} vertebral artery' }], 800),
  ...pair('subclavian-artery', 'vessels', [{ own: 'subclavian artery', within: '{side} subclavian artery' }], 600),
  ...pair('axillary-artery', 'vessels', [{ own: '{side} axillary artery' }], 500),
  ...pair('brachial-artery', 'vessels', [{ own: '{side} brachial artery' }], 700),
  ...pair('radial-artery', 'vessels', [{ own: 'radial artery', within: '{side} radial artery' }], 600),
  ...pair('ulnar-artery', 'vessels', [{ own: 'ulnar artery', within: '{side} ulnar artery' }], 600),
  ...one('celiac-trunk', 'vessels', [{ own: 'celiac trunk' }], 300),
  ...one('superior-mesenteric-artery', 'vessels', [{ own: 'superior mesenteric artery' }], 800),
  ...pair('renal-artery', 'vessels', [{ own: 'renal artery', within: '{side} renal artery' }], 400),
  ...pair('common-iliac-artery', 'vessels', [{ own: 'common iliac artery', within: '{side} common iliac artery' }], 400),
  ...pair('internal-iliac-artery', 'vessels', [{ own: '{side} internal iliac artery' }], 400),
  ...pair('external-iliac-artery', 'vessels', [{ own: 'external iliac artery', within: '{side} external iliac artery' }], 500),
  ...pair('femoral-artery', 'vessels', [{ own: 'femoral artery', within: '{side} femoral artery' }], 900),
  ...pair('popliteal-artery', 'vessels', [{ own: '{side} popliteal artery' }], 400),
  ...pair('anterior-tibial-artery', 'vessels', [{ own: 'anterior tibial artery', within: '{side} anterior tibial artery' }], 600),
  ...pair('posterior-tibial-artery', 'vessels', [{ own: '{side} posterior tibial artery' }], 600),
  ...one('superior-vena-cava', 'vessels', ['superior vena cava'], 600),
  ...one('inferior-vena-cava', 'vessels', [{ own: 'inferior vena cava' }], 1500),
  // Rechts heißt das eigene Element allgemein „brachiocephalic vein“, links „left brachiocephalic vein“
  ...one('brachiocephalic-vein-r', 'vessels', [{ own: 'brachiocephalic vein', within: 'right brachiocephalic vein' }], 400),
  ...one('brachiocephalic-vein-l', 'vessels', [{ own: 'left brachiocephalic vein' }], 400),
  ...pair('internal-jugular-vein', 'vessels', [{ own: '{side} internal jugular vein' }], 500),
  ...pair('subclavian-vein', 'vessels', [{ own: '{side} subclavian vein' }], 300),
  ...pair('cephalic-vein', 'vessels', [{ own: '{side} cephalic vein' }], 600),
  ...pair('basilic-vein', 'vessels', [{ own: '{side} basilic vein' }], 600),
  ...pair('renal-vein', 'vessels', [{ own: '{side} renal vein' }], 300),
  ...pair('common-iliac-vein', 'vessels', [{ own: '{side} common iliac vein' }], 400),
  ...pair('femoral-vein', 'vessels', [{ own: '{side} femoral vein' }], 700),
  ...pair('great-saphenous-vein', 'vessels', [{ own: '{side} great saphenous vein' }], 1200),
  ...pair('small-saphenous-vein', 'vessels', [{ own: '{side} small saphenous vein' }], 500),
  ...one('hepatic-portal-vein', 'vessels', [{ own: 'hepatic portal vein' }], 500),
  ...one('splenic-vein', 'vessels', [{ own: 'splenic vein' }], 400),
  ...one('superior-mesenteric-vein', 'vessels', [{ own: 'superior mesenteric vein' }], 500),
  ...one('azygos-vein', 'vessels', [{ own: 'azygos vein' }], 500),
]
