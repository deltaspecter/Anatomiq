# Architektur

Anatomiq ist eine statische Single-Page-App (React 19, TypeScript, Vite 8) mit einer 3D-Szene auf Basis von Three.js und React Three Fiber. Es gibt keinen Server: Modell, Texte und App-Code werden als Dateien ausgeliefert und vom Service Worker zwischengespeichert.

## Grundprinzip

Der Körper ist die Oberfläche. Die App rendert genau eine Ansicht – die 3D-Szene – und legt alle Bedienelemente als schwebende, zurückhaltende Ebenen darüber (Kopfzeile, Ebenenleiste, Kamera-Leiste, Panel, Lernkarte). Es gibt keine Routen und keine Unterseiten.

```
            ┌──────────────── App.tsx ────────────────┐
            │  TopBar   LayerBar   CameraBar   Panel  │  ← React-DOM, schwebend
            │  ┌──────────── Viewer (Canvas) ───────┐ │
            │  │ AnatomyModel  Picker  CameraRig     │ │  ← React Three Fiber
            │  └─────────────────────────────────────┘ │
            └──────────────────────────────────────────┘
                   ▲ Zustand (zustand)          ▲ Daten
        state/viewer.ts  state/prefs.ts   data/structures  data/model
```

## Bereiche

| Bereich | Ort | Aufgabe |
|---|---|---|
| 3D-Szene und Rendering | `src/scene/` | Canvas, Licht, lokal erzeugte Studio-Umgebung (`RoomEnvironment`), Laden der Ebenen, Materialien, Übertragung der Sichtbarkeit auf Meshes |
| Kamerasteuerung | `src/camera/` | `camera-controls` (über drei): Drehen, Pinch-Zoom, Verschieben, Grenzen, Ansichten, weicher Fokus, Ausweichen vor dem Panel |
| Auswahl | `src/selection/` | Tippen erkennen, Raycasting, Weiterleitung je nach Modus (Erkunden / Quiz / Lernkarte) |
| Anatomische Datenbank | `src/data/` | Strukturen mit Texten (`structures/`), Quellen, Ebenen, erzeugtes Modell-Manifest |
| Informationspanel | `src/panel/` | Bottom-Sheet bzw. Seitenpanel, Kontextaktionen, Inhaltsabschnitte |
| Darstellungsebenen | `src/layers/` | Sichtbarkeitsregeln (reine Funktionen, getestet) und Ebenenleiste |
| UI-Komponenten | `src/ui/` | Kopfzeile, Kamera-Leiste, Popover, Einstellungen, Favoriten, Statusanzeigen |
| PWA und Offline | `src/pwa/`, `sw/`, `vite.config.ts` | Registrierung, Update-Hinweis, Service-Worker-Vorlage, Precache-Liste beim Build |
| Lokale Speicherung | `src/state/prefs.ts` | Favoriten, Verlauf, Einstellungen, Lernfortschritt (localStorage mit Fallback) |
| Tests | `*.test.ts`, `scripts/e2e-smoke.ts` | Daten- und Logiktests (Vitest), Browsertest des Builds |

## Datenfluss

1. **Start:** `AnatomyModel` lädt die Ebenen, die nicht ausgeblendet sind (Haut, Skelett, Organe, Gefäße, Nerven). Die Muskelebene wird erst beim ersten Einschalten geladen.
2. **Laden:** `GLTFLoader` + `MeshoptDecoder` (WebAssembly) entpacken die GLB-Datei. Jeder Knoten ist eine Struktur; ihr Name ist die Struktur-ID. Für jedes Mesh wird ein BVH (`three-mesh-bvh`) aufgebaut, das Antippen auch bei vielen Dreiecken schnell macht.
3. **Verzeichnis:** Meshes landen in `scene/registry.ts` (ID → Mesh) – außerhalb von React, damit Zustandsänderungen nicht die ganze Szene neu rendern.
4. **Sichtbarkeit:** `layers/visibility.ts` berechnet aus Ebenen, Einzel-Einstellungen und Isolation die tatsächliche Darstellung (sichtbar / transparent / aus). `scene/visibilitySync.ts` setzt daraufhin `visible`, Material und Zeichenreihenfolge und fordert genau ein neues Bild an.
5. **Antippen:** `selection/Picker.tsx` unterscheidet Tippen (kurz, < 8 px Bewegung, ein Finger) von Gesten; der Strahl trifft nur deckend sichtbare Meshes. `selection/tap.ts` entscheidet, ob ausgewählt, im Quiz geantwortet oder (Lernkarte) ignoriert wird. Ohne hinterlegte Inhalte wird nichts angezeigt.
6. **Panel:** liest die Struktur per ID aus `data/structures` und zeigt nur befüllte Abschnitte.

## Darstellung und Leistung

- **Rendern nur bei Bedarf** (`frameloop="demand"`): Ohne Bewegung entsteht kein neues Bild – wichtig für Akku und Wärme auf dem iPhone.
- **Gemeinsame Materialien:** Materialien werden nach (Farbe, Zustand) zwischengespeichert; 270 Meshes teilen sich wenige Dutzend Materialien.
- **Transparenz:** durchscheinende Strukturen schreiben nicht in den Tiefenpuffer, werden nach den deckenden gezeichnet (Haut zuletzt) und nutzen einen Fresnel-Anteil, damit Konturen erkennbar bleiben, ohne Inneres zu verdecken. Sie sind nicht antippbar – der Finger „greift durch“.
- **Hervorhebung:** leuchtender Rand (Fresnel-Emission) statt Umfärben, damit die Eigenfarbe erhalten bleibt.
- **Pixeldichte:** höchstens 2× (iPhones melden 3×); Einstellung „Einfach“ rendert mit 1× und ohne Kantenglättung.
- **Kompression:** Positionen 14 bit, Normalen 8 bit quantisiert, meshopt-Kompression – 506 000 Dreiecke in 2,8 MB.
- **GPU-Ressourcen:** Geometrien, BVHs und Materialien werden beim Abbau der Szene freigegeben (z. B. beim Wechsel der Qualitätsstufe).
- **Fehler:** Ladefehler betreffen nur die jeweilige Ebene (mit „Erneut versuchen“); eine Fehlergrenze um die 3D-Ansicht fängt Abstürze ab; ohne WebGL erscheint eine verständliche Meldung.

## Kamera und Panel

Öffnet sich das Panel, wird nicht die Kamera bewegt, sondern der **Bildausschnitt verschoben** (`PerspectiveCamera.setViewOffset`): Die ausgewählte Struktur rutscht über das Bottom-Sheet bzw. neben das Seitenpanel. Schließen stellt den Ausschnitt wieder her – die Kameraposition bleibt unverändert.

## Erweiterbarkeit

- **Neue Struktur:** Eintrag in `scripts/model/catalog.ts` → `npm run model` → Steckbrief in `src/data/structures/<ebene>.ts`. Der Test `structures.test.ts` schlägt fehl, solange ein Mesh ohne Inhalt oder ein Inhalt ohne Mesh existiert.
- **Neue Ebene:** ID in `src/data/layers.ts` ergänzen (Farbe, Startzustand), Einträge im Katalog, Symbol in `LayerBar.tsx`.
- **Anderes oder größeres Modell:** Die App kennt nur GLB-Dateien mit benannten Knoten und das Manifest. Ein anderes Quellmodell braucht lediglich eine eigene Pipeline, die dasselbe Format erzeugt; Steckbriefe bleiben über die IDs erhalten.
- **Mehrere Meshes je Struktur:** `meshIds` ist bereits eine Liste; Sichtbarkeit und Auswahl arbeiten pro Mesh.

## Test-Hook

`src/debug/testHook.ts` stellt `window.__anatomiq.snapshot()` bereit – eine schreibgeschützte Momentaufnahme (Auswahl, Ebenen, Ladezustand, Kamera) für den Browsertest. Darüber lässt sich nichts verändern.
