/**
 * Die 24 freien Wirbel (C1–C7, T1–T12, L1–L5). Gemeinsame Merkmale je Abschnitt,
 * Besonderheiten einzelner Wirbel (Atlas, Axis, C6, C7, T1, T11/T12, L5) werden ergänzt.
 */
import type { AnatomicalStructure } from '../types'
import { single } from './define'

const BONE = '#e8dfcc'
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

const neighbors = (prefix: string, n: number, max: number, before: string | null, after: string | null) => [
  n > 1 ? `${prefix}${n - 1}` : before,
  n < max ? `${prefix}${n + 1}` : after,
]

const cervical: AnatomicalStructure[] = [
  single('atlas', 'skeleton', {
    nameDe: '1. Halswirbel (Atlas)',
    nameLa: 'Atlas (Vertebra cervicalis I)',
    nameEn: 'Atlas (C1)',
    system: 'skeletal',
    region: 'neck',
    color: BONE,
    summary: 'Oberster Halswirbel, der den Kopf trägt. Er hat keinen Wirbelkörper, sondern besteht aus zwei Bögen und zwei seitlichen Massen.',
    location: 'Direkt unterhalb des Hinterhauptbeins.',
    structure: 'Vorderer und hinterer Bogen (Arcus anterior et posterior), Seitenmassen (Massae laterales) mit oberen und unteren Gelenkflächen, Querfortsätze mit Querfortsatzloch (Foramen transversarium) für die Wirbelarterie.',
    function: 'Trägt den Schädel und ermöglicht zusammen mit dem Axis die Kopfbewegungen.',
    joints: 'Oberes Kopfgelenk (Articulatio atlantooccipitalis) mit dem Hinterhauptbein für das Nicken; unteres Kopfgelenk (Articulationes atlantoaxiales) mit dem Axis für die Drehung. Zwischen Atlas und Axis liegt keine Bandscheibe.',
    clinical: 'Der Atlasbogen kann bei axialer Stauchung (z. B. Kopfsprung in flaches Wasser) brechen (Jefferson-Fraktur).',
    related: ['occipital-bone', 'axis', 'spinal-cord', 'brainstem'],
  }),
  single('axis', 'skeleton', {
    nameDe: '2. Halswirbel (Axis)',
    nameLa: 'Axis (Vertebra cervicalis II)',
    nameEn: 'Axis (C2)',
    system: 'skeletal',
    region: 'neck',
    color: BONE,
    summary: 'Zweiter Halswirbel mit einem nach oben ragenden Zahn (Dens axis), um den sich der Atlas mit dem Kopf dreht.',
    location: 'Unterhalb des Atlas.',
    structure: 'Wirbelkörper mit dem Dens axis, kräftiger, gespaltener Dornfortsatz, Querfortsätze mit Foramen transversarium.',
    function: 'Drehachse für die Kopfdrehung – etwa die Hälfte der Rotation der Halswirbelsäule findet im unteren Kopfgelenk statt.',
    joints: 'Mit dem Atlas (Articulationes atlantoaxiales); der Dens wird vom Querband des Atlas (Lig. transversum atlantis) gehalten. Nach unten erste Bandscheibe (C2/C3) und Wirbelgelenke zu C3.',
    clinical: 'Densfrakturen sind vor allem bei älteren Menschen nach Stürzen häufig; ein instabiler Dens kann das Rückenmark gefährden.',
    related: ['atlas', 'vertebra-c3', 'spinal-cord', 'intervertebral-discs'],
  }),
  ...[3, 4, 5, 6, 7].map((n) => {
    const special =
      n === 6
        ? ' Am vorderen Höcker seines Querfortsatzes (Tuberculum caroticum) kann die gemeinsame Halsschlagader gegen die Wirbelsäule gedrückt werden.'
        : n === 7
          ? ' Sein langer, nicht gespaltener Dornfortsatz ist am Übergang vom Nacken zum Rücken deutlich tastbar (Vertebra prominens) – eine wichtige Orientierungsmarke.'
          : ''
    const up = n === 3 ? 'axis' : `vertebra-c${n - 1}`
    const down = n === 7 ? 'vertebra-t1' : `vertebra-c${n + 1}`
    return single(`vertebra-c${n}`, 'skeleton', {
      nameDe: `${n}. Halswirbel${n === 7 ? ' (Vertebra prominens)' : ''}`,
      nameLa: `Vertebra cervicalis ${ROMAN[n - 1]}`,
      nameEn: `Cervical vertebra C${n}`,
      system: 'skeletal',
      region: 'neck',
      color: BONE,
      summary: `Typischer Halswirbel der Halswirbelsäule (C${n}).${special}`,
      location: `Hals, ${n}. Wirbel von oben.`,
      structure:
        'Kleiner, querovaler Wirbelkörper mit seitlich aufgebogenen Rändern (Processus uncinati), großes dreieckiges Wirbelloch, Querfortsätze mit Querfortsatzloch (Foramen transversarium), durch das die Wirbelarterie zieht' +
        (n === 7 ? '. Beim 7. Halswirbel ist das Querfortsatzloch klein, die Wirbelarterie zieht meist nicht hindurch.' : '; meist gespaltener Dornfortsatz.'),
      function: 'Trägt den Kopf, schützt das Halsmark und ermöglicht die große Beweglichkeit der Halswirbelsäule.',
      joints: `Bandscheiben und kleine Wirbelgelenke (Articulationes zygapophysiales) zu den Nachbarwirbeln; zusätzlich Unkovertebralgelenke an den Wirbelkörperrändern.`,
      clinical: n >= 5 ? 'Bandscheibenvorfälle und Abnutzungen der Halswirbelsäule betreffen besonders häufig die Segmente C5/C6 und C6/C7.' : undefined,
      related: [up, down, 'spinal-cord', 'intervertebral-discs'].filter(Boolean) as string[],
    })
  }),
]

const thoracic: AnatomicalStructure[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  const [up, down] = neighbors('vertebra-t', n, 12, 'vertebra-c7', 'vertebra-l1')
  const ribNote =
    n === 1
      ? 'Der 1. Brustwirbel trägt eine vollständige Gelenkfläche für den Kopf der 1. Rippe und eine halbe für die 2. Rippe.'
      : n <= 10
        ? `Rippenköpfe artikulieren an den Wirbelkörpern; der Querfortsatz trägt eine Gelenkfläche für den Höcker der ${n}. Rippe.`
        : `Der Kopf der ${n}. Rippe artikuliert nur mit diesem Wirbel; an den Querfortsätzen fehlt eine Rippengelenkfläche.`
  return single(`vertebra-t${n}`, 'skeleton', {
    nameDe: `${n}. Brustwirbel`,
    nameLa: `Vertebra thoracica ${ROMAN[i]}`,
    nameEn: `Thoracic vertebra T${n}`,
    system: 'skeletal',
    region: 'back',
    color: BONE,
    summary: `Brustwirbel (T${n}) – einer von zwölf Wirbeln, die mit den Rippen gelenkig verbunden sind.${n === 12 ? ' Er bildet den Übergang zur Lendenwirbelsäule.' : ''}`,
    location: `Rückseite des Brustkorbs, ${n}. Wirbel der Brustwirbelsäule.`,
    structure: `Herzförmiger Wirbelkörper mit Gelenkflächen für die Rippenköpfe (Foveae costales), rundes Wirbelloch, lange, schräg nach unten gerichtete Dornfortsätze. ${ribNote}`,
    function: 'Bildet mit Rippen und Brustbein den Brustkorb, schützt das Brustmark; die Ausrichtung der Wirbelgelenke begünstigt Drehbewegungen, die Rippen begrenzen die Beugung.',
    joints: 'Bandscheiben und Wirbelgelenke zu den Nachbarwirbeln; Rippenkopfgelenke (Articulationes capitis costae) und – bis T10 – Rippen-Querfortsatz-Gelenke (Articulationes costotransversariae).',
    clinical: n >= 11 ? 'Der thorakolumbale Übergang (T11–L2) ist bei Wirbelsäulenverletzungen besonders häufig betroffen.' : n >= 6 ? 'Osteoporotische Wirbelkörperbrüche treten häufig in der mittleren und unteren Brustwirbelsäule auf.' : undefined,
    related: [up, down, `rib-${n}-r`, `rib-${n}-l`, 'spinal-cord', 'intervertebral-discs', ...(n >= 8 && n <= 12 ? ['aorta'] : [])].filter(Boolean) as string[],
  })
})

const lumbar: AnatomicalStructure[] = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1
  const [up, down] = neighbors('vertebra-l', n, 5, 'vertebra-t12', 'sacrum')
  return single(`vertebra-l${n}`, 'skeleton', {
    nameDe: `${n}. Lendenwirbel`,
    nameLa: `Vertebra lumbalis ${ROMAN[i]}`,
    nameEn: `Lumbar vertebra L${n}`,
    system: 'skeletal',
    region: 'back',
    color: BONE,
    summary: `Lendenwirbel (L${n}) – die Lendenwirbel haben die größten Wirbelkörper, weil sie das meiste Gewicht tragen.${n === 5 ? ' Der 5. Lendenwirbel ist keilförmig und bildet den Übergang zum Kreuzbein.' : ''}`,
    location: `Unterer Rücken, ${n}. Wirbel der Lendenwirbelsäule.`,
    structure: 'Großer, nierenförmiger Wirbelkörper, dreieckiges Wirbelloch, kräftige, waagerecht nach hinten gerichtete Dornfortsätze. Statt echter Querfortsätze Rippenfortsätze (Processus costales) als Rippenrudimente; keine Querfortsatzlöcher und keine Rippengelenkflächen.',
    function: 'Trägt die Last des Oberkörpers; die Stellung der Wirbelgelenke erlaubt vor allem Beugung und Streckung.',
    joints: n === 5 ? 'Bandscheibe und Wirbelgelenke zu L4 und zum Kreuzbein (lumbosakraler Übergang).' : 'Bandscheiben und Wirbelgelenke zu den Nachbarwirbeln.',
    clinical:
      n >= 4
        ? 'Die Segmente L4/L5 und L5/S1 sind am häufigsten von Bandscheibenvorfällen betroffen. Die Lumbalpunktion erfolgt unterhalb des Rückenmarkendes, meist zwischen L3/L4 oder L4/L5.'
        : n <= 2
          ? 'Auf Höhe L1/L2 endet beim Erwachsenen das Rückenmark (Conus medullaris); darunter liegen nur noch Nervenwurzeln (Cauda equina).'
          : 'Die Lumbalpunktion erfolgt unterhalb des Rückenmarkendes, meist zwischen L3/L4 oder L4/L5.',
    related: [up, down, 'spinal-cord', 'intervertebral-discs', 'psoas-major-r', 'psoas-major-l'].filter(Boolean) as string[],
  })
})

export const VERTEBRAE: AnatomicalStructure[] = [...cervical, ...thoracic, ...lumbar]
