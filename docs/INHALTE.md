# Inhalte: Steckbriefe der Strukturen

## Qualität und Prüfstatus

Alle 270 Steckbriefe tragen den Status **„Erstfassung“** (`status: 'draft'`). Sie wurden mit Unterstützung eines KI-Sprachmodells auf Grundlage anatomischer Standardwerke formuliert und **nicht fachlich begutachtet**. Die App weist bei jeder Struktur darauf hin.

Grundsätze beim Schreiben:

- **Nur Gesichertes.** Lieber einen Abschnitt weglassen als raten. Leere Abschnitte werden nicht angezeigt; der Datentest verbietet leere Texte.
- **Lehrbuchwissen, keine Einzelfälle.** Ursprung, Ansatz, Innervation und Funktion der Muskeln folgen der in deutschen Lehrwerken üblichen Darstellung (v. a. Prometheus). Segmentangaben (z. B. C5–C6) sind die üblichen Hauptsegmente; Lehrbücher weichen hier um ein Segment voneinander ab.
- **Zahlen als Richtwerte.** Größe, Gewicht, Volumen und Häufigkeiten sind typische Werte Erwachsener und so formuliert („etwa“, „meist“).
- **Klinik vorsichtig.** Klinische Hinweise nennen bekannte Zusammenhänge zur Einordnung; sie sind keine Diagnose- oder Behandlungsempfehlung.
- **Ehrlich zum Modell.** Wo das 3D-Modell von der Anatomie abweicht (Lunge ohne Oberfläche, Gefäße ohne Äste, nur unterer Abschnitt der inneren Drosselvene, zusammengefasste Knochengruppen), steht das im Text.

**Empfehlung vor einer Veröffentlichung für Lernende:** Durchsicht durch eine anatomisch qualifizierte Person; danach den Status je Struktur auf `reviewed` setzen und die Quellen um Seitenangaben ergänzen.

## Quellen

Die Quellenliste steht in `src/data/sources.ts`; jede Struktur verweist auf Einträge daraus (Standard: Terminologia Anatomica 2, Prometheus LernAtlas, OpenStax Anatomy & Physiology 2e). Weitere: Duale Reihe Anatomie, Gray’s Anatomy (42. Aufl.), FMA, BodyParts3D.

## Datenmodell

```ts
type AnatomicalStructure = {
  id: string                 // stabile ID = Mesh-Name im Modell, z. B. 'femur-r'
  nameDe: string             // „Oberschenkelknochen“
  nameLa: string             // „Femur dextrum“
  nameEn?: string
  side?: 'r' | 'l'
  system: SystemId           // z. B. 'skeletal', 'cardiovascular'
  region: RegionId           // z. B. 'thorax', 'lower-limb'
  layer: LayerId             // Darstellungsebene
  summary: string            // ein bis zwei Sätze, das Wichtigste zuerst
  location?, structure?, function?, parts?, neighbors?,
  bloodSupply?, innervation?, origin?, insertion?, joints?,
  clinical?, terms?, mnemonic?
  relatedStructureIds: string[]
  meshIds: string[]          // Verknüpfung zum 3D-Modell
  sourceReferences: string[] // IDs aus sources.ts
  status: 'draft' | 'reviewed'
  color?: string
}
```

Paarige Strukturen werden einmal geschrieben und mit `paired()` für beide Seiten erzeugt (lateinische Namen mit *dexter/sinister* in der richtigen grammatischen Form). Verwandte Strukturen mit `~` beziehen sich auf dieselbe Körperseite (`'~ulna'` → `ulna-r` bzw. `ulna-l`). Wirbel und Rippen entstehen aus Grundtexten mit ihren Besonderheiten (`vertebrae.ts`, `ribs.ts`).

## Eine Struktur ergänzen oder ändern

1. Text in der passenden Datei unter `src/data/structures/` bearbeiten oder ergänzen.
2. Neue Strukturen brauchen ein Mesh: Eintrag in `scripts/model/catalog.ts`, dann `npm run model`.
3. `npm test` prüft: eindeutige IDs, Mesh vorhanden und in der richtigen Ebene, jedes Mesh hat einen Steckbrief, verwandte Strukturen und Quellen existieren, keine leeren Abschnitte, Muskeln mit Ursprung/Ansatz/Innervation/Funktion, Seitenangabe im lateinischen Namen.
