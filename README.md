# Anatomiq – der Körper ist die Benutzeroberfläche

Anatomiq ist ein interaktiver 3D-Anatomieatlas als **Progressive Web App**. Die App startet direkt im 3D-Modell des menschlichen Körpers: drehen, zoomen, Strukturen antippen, Informationen lesen, Ebenen ausblenden, tiefer schauen. Es gibt keine Startseite, keine Suchleiste und keine Listen als Hauptnavigation – navigiert wird am Modell selbst.

Die App läuft im Browser auf iPhone, Tablet und Desktop und lässt sich in Safari über „Teilen → Zum Home-Bildschirm“ wie eine eigene App installieren.

## Stand dieser Version

| Bereich | Status | Details |
|---|---|---|
| **3D-Modell** | ✅ umgesetzt | Echte, segmentierte Anatomie aus [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) (DBCLS, CC BY 4.0), Lungenlappen aus der Referenzlunge des [Human Reference Atlas](https://humanatlas.io/3d-reference-library) (CC BY 4.0): **372 einzeln antippbare Strukturen** in sechs Ebenen, rund 660 000 Dreiecke, zusammen 3,7 MB (meshopt-komprimiert). Männlicher Körper. |
| **Navigation am Modell** | ✅ umgesetzt | Drehen (1 Finger / Maus), Pinch-Zoom und Verschieben (2 Finger), Mausrad-Zoom zum Zeiger, Grenzen für Zoom und Drehpunkt, Ausgangsansicht, feste Ansichten (vorn/rechts/hinten/links) |
| **Auswahl** | ✅ umgesetzt | Antippen wählt die vorderste deckend sichtbare Struktur (BVH-beschleunigtes Raycasting); Drehen/Zoomen löst nie eine Auswahl aus; Doppeltippen fokussiert; Hervorhebung durch Randleuchten; am Desktop zeigt ein Etikett den Namen unter dem Mauszeiger |
| **Informationspanel** | ✅ umgesetzt | Bottom-Sheet (Hochformat) bzw. Seitenpanel (Querformat, Desktop); Name, Latein, Englisch, System, Region, Kurzfassung, Lage, Funktion, Aufbau, Ursprung/Ansatz/Innervation, Gelenke, Blutversorgung, Klinik, Fachbegriffe, Merksätze, verwandte Strukturen, Quellen, Modellherkunft (FMA-IDs) |
| **Kamera** | ✅ umgesetzt | Sanfter Fokus auf die ausgewählte Struktur (abschaltbar), jede Berührung unterbricht Animationen; Schließen des Panels verändert die Ansicht nicht |
| **Ebenen** | ✅ umgesetzt | Haut, Muskeln, Skelett, Organe, Gefäße, Nerven – je sichtbar / transparent / aus; transparente Strukturen lassen Fingertipps durch |
| **Einzelstrukturen** | ✅ umgesetzt | Isolieren (auch mit verwandten Strukturen), transparent machen, ausblenden, Darstellung zurücksetzen |
| **Inhalte** | 🟡 Erstfassung | Steckbriefe für alle 372 Strukturen, KI-gestützt nach Standardwerken erstellt, **noch nicht fachlich begutachtet** (siehe [docs/INHALTE.md](docs/INHALTE.md)) |
| **Lernen** | ✅ umgesetzt | Favoriten, „Zuletzt angesehen“, Quiz „Finde die Struktur“ (Antippen im Modell), Lernkarten mit Leitner-Wiederholung – alles lokal gespeichert |
| **PWA / Offline** | ✅ umgesetzt | Manifest, Icons, Safe Areas, Service Worker; nach dem ersten Besuch offline nutzbar (Muskelebene nach erstem Laden) |
| **Lunge** | 🟡 Näherung | Fünf Lungenlappen aus der HRA-Referenzlunge, auf den Bronchialbaum von BodyParts3D eingepasst (BodyParts3D selbst hat keine Lungenoberfläche); der Bronchialbaum ist darunter separat antippbar |
| **Weitere Strukturen** | 🔜 geplant | u. a. Schilddrüse, periphere Nerven, Hand- und Fußmuskeln, Rectus abdominis, Latissimus dorsi, Sigma, weibliche Anatomie – siehe [docs/MODELL.md](docs/MODELL.md#was-fehlt) |

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org) ab 22.18 (führt die TypeScript-Skripte direkt aus).

```bash
npm install
npm run dev          # Entwicklungsserver → http://localhost:5173
```

Produktionsfassung lokal testen (mit denselben Sicherheits- und Cache-Headern wie online):

```bash
npm run build        # Typprüfung, App-Build, Service Worker
npm run preview      # → http://localhost:4173
```

Auf dem iPhone im selben WLAN: `npm run dev -- --host` und die angezeigte Netzwerkadresse öffnen. Service Worker und Installation funktionieren allerdings nur über `localhost` oder **https** – zum Installieren also veröffentlichen (siehe [docs/BEREITSTELLUNG.md](docs/BEREITSTELLUNG.md)).

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit Hot Reload |
| `npm run build` | Produktions-Build nach `dist/` (inkl. Service Worker) |
| `npm run preview` | `dist/` mit Produktions-Headern ausliefern |
| `npm test` | Unit- und Datentests (Vitest): jede Struktur ↔ Mesh, Sichtbarkeitslogik, Lernlogik, Kamera |
| `npm run test:e2e` | Browsertest des Builds (31 Prüfungen: Start, Auswahl, Panel, Ebenen, Offline, defekte Modelle, Mobil …) |
| `npm run check` | Typprüfung und Tests (läuft mit Build und Browsertest auch in der CI, `.github/workflows/ci.yml`) |
| `npm run model` | 3D-Modelle aus BodyParts3D neu erzeugen (lädt beim ersten Mal ~200 MB Rohdaten nach `.cache/`) |
| `node scripts/render-icons.ts` | App-Icons aus den SVG-Vorlagen erzeugen |

## Projektstruktur

```
scripts/
  build-model.ts        BodyParts3D → GLB je Ebene (Zusammenführen, Vereinfachen, Komprimieren)
  model/catalog.ts      Welche BodyParts3D-Konzepte bilden welche Struktur
  e2e-smoke.ts          Browsertest
src/
  scene/                3D-Szene: Canvas, Licht, Laden der Ebenen, Materialien, Sichtbarkeit
  camera/               Kamerasteuerung, Ansichten, Fokus
  selection/            Antippen (Raycasting), Auswahl-Logik
  data/                 Anatomische Datenbank (structures/), Quellen, Ebenen, Modell-Manifest
  panel/                Informationspanel
  layers/               Ebenensteuerung und Sichtbarkeitsregeln
  learn/                Quiz und Lernkarten
  ui/                   Bedienelemente, Einstellungen, Favoriten, Statusanzeigen
  pwa/                  Service-Worker-Registrierung und Updates
  state/                Sitzungszustand (Viewer) und lokale Speicherung (Prefs)
public/models/          Erzeugte Modelldateien (im Repository, damit Build und Hosting keine Rohdaten brauchen)
sw/service-worker.js    Vorlage des Service Workers
docs/                   Architektur, Modell & Lizenzen, Inhalte, Bereitstellung
```

Mehr dazu in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md).

## Lizenzen und Quellen

- **Lungenlappen:** Browne, K.; Schlehlein, H. (2024): *3D Reference Organ for Lung, Male v1.4*, Human Reference Atlas, [doi:10.48539/HBM532.KLZD.394](https://doi.org/10.48539/HBM532.KLZD.394), CC BY 4.0 – skaliert und auf das BodyParts3D-Modell eingepasst.
- **3D-Geometrie:** BodyParts3D, © The Database Center for Life Science, lizenziert unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (laut aktueller Lizenzseite des LSDB Archive; ältere Dateiköpfe nennen CC BY-SA 2.1 JP – Details und Umgang damit in [docs/MODELL.md](docs/MODELL.md#lizenz)). Für Anatomiq vereinfacht, zu Strukturen zusammengefasst und neu eingefärbt.
- **Texte:** eigene Erstfassungen auf Grundlage anatomischer Standardwerke (Terminologia Anatomica, Prometheus, OpenStax Anatomy & Physiology, Gray’s Anatomy); Quellen stehen bei jeder Struktur.
- **Schrift:** Inter (SIL Open Font License), lokal eingebunden.

## Datenschutz

Kein Konto, keine Analyse, keine Übertragung an Server. Favoriten, Verlauf, Einstellungen und Lernfortschritt liegen ausschließlich im Browser des Geräts (localStorage) und lassen sich in den Einstellungen löschen.
