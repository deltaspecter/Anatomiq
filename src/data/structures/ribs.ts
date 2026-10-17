/**
 * Die 12 Rippenpaare. Gemeinsamer Grundtext, Einteilung in echte, falsche und freie Rippen,
 * Besonderheiten der 1., 2., 11. und 12. Rippe.
 */
import type { AnatomicalStructure } from '../types'
import { paired } from './define'

const BONE = '#e8dfcc'
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function kind(n: number): string {
  if (n <= 7) return 'echte Rippe (Costa vera): Sie ist über ihren eigenen Rippenknorpel direkt mit dem Brustbein verbunden'
  if (n <= 10) return 'falsche Rippe (Costa spuria): Ihr Knorpel schließt sich dem Knorpel der darüberliegenden Rippe an und bildet so den Rippenbogen'
  return 'freie Rippe (Costa fluctuans): Ihr vorderes Ende endet frei in der Bauchwandmuskulatur'
}

function special(n: number): string | undefined {
  switch (n) {
    case 1:
      return 'Die 1. Rippe ist die kürzeste, breiteste und am stärksten gekrümmte Rippe. Auf ihrer Oberseite liegen Rinnen für die Schlüsselbeinarterie und -vene und ein Höcker für den M. scalenus anterior.'
    case 2:
      return 'An der 2. Rippe setzt der Brustbeinwinkel (Angulus sterni) an – sie ist daher der Ausgangspunkt zum Abzählen der Rippen. Eine raue Stelle dient dem M. serratus anterior als Ursprung.'
    case 11:
    case 12:
      return `Die ${n}. Rippe ist kurz, hat nur eine Gelenkfläche am Rippenkopf und keine gelenkige Verbindung zum Querfortsatz.`
    default:
      return undefined
  }
}

export const RIBS: AnatomicalStructure[] = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) =>
  paired(`rib-${n}`, 'skeleton', {
    nameDe: `${n}. Rippe`,
    nameLa: [`Costa ${ROMAN[n - 1]} dextra`, `Costa ${ROMAN[n - 1]} sinistra`],
    nameEn: `Rib ${n}`,
    system: 'skeletal',
    region: 'thorax',
    color: BONE,
    summary: `Die ${n}. Rippe ist eine ${kind(n)}.`,
    location: `Brustwand; hinten am ${n}. Brustwirbel${n >= 2 && n <= 10 ? ` (und am ${n - 1}.)` : ''}, von dort bogenförmig nach vorn.`,
    structure: ['Rippenkopf (Caput costae), Hals (Collum), Höcker (Tuberculum) und Körper (Corpus) mit Rippenwinkel. Am Unterrand verläuft die Rippenfurche (Sulcus costae) mit Zwischenrippenvene, -arterie und -nerv.', special(n)].filter(Boolean).join(' '),
    function: 'Schützt Herz, Lunge und obere Bauchorgane und bewegt sich bei der Atmung: Das Heben der Rippen erweitert den Brustkorb.',
    joints:
      n <= 10
        ? `Rippenkopfgelenk mit ${n === 1 ? 'dem 1. Brustwirbel' : 'zwei benachbarten Wirbelkörpern'}, Rippen-Querfortsatz-Gelenk mit dem Querfortsatz des ${n}. Brustwirbels${n <= 7 ? '; vorn über den Rippenknorpel mit dem Brustbein' : '; vorn über den Rippenbogen'}.`
        : `Rippenkopfgelenk mit dem ${n}. Brustwirbel; vorn keine Verbindung.`,
    clinical:
      n <= 2
        ? 'Brüche der oberen Rippen erfordern eine erhebliche Krafteinwirkung und können mit Verletzungen der großen Gefäße einhergehen.'
        : n >= 9
          ? 'Brüche der unteren Rippen können Leber, Milz oder Nieren verletzen. Pleurapunktionen erfolgen am Oberrand einer Rippe, um die Gefäße in der Rippenfurche zu schonen.'
          : 'Rippenbrüche sind schmerzhaft und können die Lunge verletzen (Pneumothorax). Pleurapunktionen erfolgen am Oberrand einer Rippe, um die Gefäße in der Rippenfurche zu schonen.',
    mnemonic: n === 1 || n === 8 || n === 11 ? '7 echte, 3 falsche, 2 freie Rippen je Seite.' : undefined,
    related: [`vertebra-t${n}`, ...(n >= 2 && n <= 10 ? [`vertebra-t${n - 1}`] : []), ...(n > 1 ? [`~rib-${n - 1}`] : []), ...(n < 12 ? [`~rib-${n + 1}`] : []), ...(n <= 7 ? ['sternum', '~costal-cartilages'] : []), n <= 4 ? '~lung-upper-lobe' : '~lung-lower-lobe'],
  }),
)
