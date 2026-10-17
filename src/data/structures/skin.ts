import type { AnatomicalStructure } from '../types'
import { single } from './define'

export const SKIN: AnatomicalStructure[] = [
  single('skin', 'skin', {
    nameDe: 'Haut',
    nameLa: 'Cutis (Integumentum commune)',
    nameEn: 'Skin',
    system: 'integumentary',
    region: 'whole-body',
    color: '#d9b6a0',
    summary: 'Größtes Organ des Körpers mit einer Fläche von etwa 1,5–2 m²; Grenze und Schutzhülle zwischen Körper und Umwelt. In der App wird sie zur Orientierung durchscheinend dargestellt.',
    structure: 'Oberhaut (Epidermis, verhorntes Plattenepithel), Lederhaut (Dermis, Bindegewebe mit Gefäßen, Nerven, Haarwurzeln und Drüsen) und Unterhaut (Subcutis, Fettgewebe). Anhangsgebilde: Haare, Nägel, Schweiß- und Talgdrüsen.',
    function: 'Schutz vor mechanischen, chemischen und mikrobiellen Einflüssen sowie UV-Strahlung, Temperaturregulation (Durchblutung, Schweiß), Sinneswahrnehmung (Druck, Berührung, Temperatur, Schmerz), Vitamin-D-Bildung, Verhinderung von Wasserverlust.',
    clinical: 'Hautkrebs (z. B. Basalzellkarzinom, Melanom), Ekzeme und Schuppenflechte sind häufige Erkrankungen. Das Ausmaß von Verbrennungen wird mit der Neunerregel abgeschätzt.',
    terms: [{ term: 'Dermatom', meaning: 'Hautareal, das von einem Rückenmarksegment sensibel versorgt wird.' }],
    related: [],
  }),
]
