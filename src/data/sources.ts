/**
 * Literatur und Referenzwerke, auf die sich die Strukturtexte stützen.
 * Die Texte sind Erstfassungen (siehe docs/INHALTE.md) und verweisen auf Standardwerke,
 * nicht auf einzelne Seiten. Bei fachlicher Prüfung sollen genauere Belege ergänzt werden.
 */
export type SourceReference = { id: string; title: string; url?: string }

export const SOURCES: Record<string, SourceReference> = {
  ta2: {
    id: 'ta2',
    title: 'FIPAT: Terminologia Anatomica, 2. Auflage (2019) – amtliche lateinische Nomenklatur',
    url: 'https://fipat.library.dal.ca/ta2/',
  },
  openstax: {
    id: 'openstax',
    title: 'Betts, J. G. u. a.: Anatomy and Physiology 2e. OpenStax, Rice University 2022 (CC BY 4.0)',
    url: 'https://openstax.org/details/books/anatomy-and-physiology-2e',
  },
  prometheus: {
    id: 'prometheus',
    title: 'Schünke, M.; Schulte, E.; Schumacher, U.: Prometheus – LernAtlas der Anatomie (3 Bände). Thieme, Stuttgart',
  },
  aumueller: {
    id: 'aumueller',
    title: 'Aumüller, G. u. a.: Duale Reihe Anatomie. Thieme, Stuttgart',
  },
  gray: {
    id: 'gray',
    title: 'Standring, S. (Hrsg.): Gray’s Anatomy – The Anatomical Basis of Clinical Practice, 42. Auflage. Elsevier 2020',
  },
  fma: {
    id: 'fma',
    title: 'Foundational Model of Anatomy (FMA), Structural Informatics Group, University of Washington',
    url: 'https://bioportal.bioontology.org/ontologies/FMA',
  },
  'hra-lung': {
    id: 'hra-lung',
    title: 'Browne, K.; Schlehlein, H. (2024): 3D Reference Organ for Lung, Male v1.4. Human Reference Atlas (HuBMAP), CC BY 4.0 – Geometrie der Lungenlappen',
    url: 'https://doi.org/10.48539/HBM532.KLZD.394',
  },
  bodyparts3d: {
    id: 'bodyparts3d',
    title: 'BodyParts3D, © The Database Center for Life Science (DBCLS), CC BY 4.0 – 3D-Geometrie',
    url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
  },
}
