# Bereitstellung, Installation auf iPhone und iPad, Offline

Anatomiq ist nach dem Build eine rein **statische Website** im Ordner `dist/` (rund 5 MB). Es gibt keinen Server-Code, keine Datenbank und keine API-Schlüssel. Jeder Hoster, der statische Dateien über **HTTPS** ausliefert und eigene Header erlaubt, ist geeignet.

## 1. Lokal

```bash
npm install
npm run dev        # Entwicklung → http://localhost:5173
npm run build      # Produktions-Build nach dist/
npm run preview    # dist/ mit den Produktions-Headern → http://localhost:4173
```

Vor jeder Veröffentlichung:

```bash
npm run check      # Typprüfung, Unit- und Datentests
npm run build
npm run test:e2e   # Browsertest: Start, Auswahl, Panel, Ebenen, CSP, Service Worker, Offline, Mobil
```

## 2. Anforderungen an den Hoster

| Anforderung | Warum |
|---|---|
| **HTTPS** | Service Worker und „Zum Home-Bildschirm“ funktionieren nur über HTTPS (oder `localhost`). |
| **Auslieferung im Wurzelverzeichnis** einer (Sub-)Domain | Pfade wie `/models/…`, `/sw.js` und `start_url: "/"` sind absolut. Für einen Unterpfad (z. B. GitHub Pages `…/Anatomiq/`) müsste `base` in Vite angepasst werden. |
| `Content-Security-Policy` mit `'wasm-unsafe-eval'` | Der meshopt-Decoder der Modelle nutzt WebAssembly. Ohne diese Freigabe laden die Modelle nicht. |
| `Cache-Control: no-cache` für `/sw.js`, `/index.html`, `/manifest.webmanifest` | Updates werden sofort erkannt. |
| `Cache-Control: immutable` für `/assets/*` | Dateinamen enthalten einen Inhalts-Hash. |
| `.glb` als `model/gltf-binary` | Manche Hoster kennen den Typ nicht; die App funktioniert auch mit `application/octet-stream`. |

Die maßgebliche Header-Liste steht in **`public/_headers`**; `npm run preview` wendet genau diese Regeln an.

## 3. Hosting-Varianten

### Render (Blueprint liegt bei)

1. In Render **New → Blueprint** wählen und das GitHub-Repository verbinden.
2. Render liest `render.yaml`: Build `npm ci && npm run build`, Ausgabe `dist/`, Header und SPA-Rewrite sind hinterlegt.
3. HTTPS kommt automatisch; eigene Domain unter *Settings → Custom Domains*.

### Netlify oder Cloudflare Pages

- Build-Befehl: `npm run build`, Ausgabeordner: `dist`, Node-Version 22 (`NODE_VERSION=22`).
- `public/_headers` und `public/_redirects` werden mit ausgeliefert und automatisch ausgewertet.

## 4. Auf dem iPhone installieren

1. Die veröffentlichte **https-Adresse in Safari** öffnen und warten, bis das Modell erscheint (beim ersten Mal werden etwa 4 MB geladen).
2. Unten auf **Teilen** (Quadrat mit Pfeil) tippen.
3. **„Zum Home-Bildschirm“** wählen, Namen bestätigen, **Hinzufügen**.
4. Anatomiq vom Home-Bildschirm starten: Vollbild ohne Safari-Leisten, dunkle Statusleiste, Inhalte respektieren Notch und Home-Indikator (Safe Areas).

Hinweise zu iOS:
- Installieren geht nur über **Safari** (bzw. ab iOS 16.4 auch über andere Browser mit „Zum Home-Bildschirm“).
- Die installierte App hat einen **eigenen Speicher**: Favoriten und Lernfortschritt aus Safari werden nicht übernommen.
- iOS kann den Speicher selten genutzter Web-Apps nach einiger Zeit leeren; dann lädt Anatomiq die Modelle beim nächsten Start neu.
- Pinch-Zoom der Seite ist abgeschaltet, damit die Zwei-Finger-Geste ausschließlich das Modell zoomt.

### Auf dem iPad

Installation wie auf dem iPhone; das **Teilen**-Symbol sitzt in Safari auf dem iPad **oben rechts** neben der Adressleiste. Anatomiq passt sich an jede Fenstergröße an:

| Situation | Darstellung |
|---|---|
| Hochformat (ab 680 × 900 px, also alle iPads einschließlich iPad mini) | Informationen im **Seitenpanel** rechts, der Körper bleibt links vollständig sichtbar |
| Querformat | Seitenpanel, rund 400 px breit |
| Split View / Slide Over / Stage Manager, schmales Fenster | Bottom-Sheet wie auf dem iPhone, auf breiteren Fenstern mittig und höchstens 600 px breit |
| Fenstergröße ändert sich (Drehen, Split View verschieben, Stage Manager) | Layout wechselt sofort, Auswahl, Kamera und geöffnetes Panel bleiben erhalten |

Eingabegeräte am iPad:
- **Finger:** wie auf dem iPhone (1 Finger drehen, 2 Finger zoomen/verschieben, Tippen wählt, Doppeltippen fokussiert).
- **Apple Pencil:** Tippen wählt aus, Ziehen dreht. Auf iPads mit Pencil-Schwebefunktion zeigt ein Etikett den Namen der Struktur unter der Stiftspitze.
- **Trackpad / Maus (Magic Keyboard):** Klicken wählt, Ziehen dreht, Zwei-Finger-Scrollen und Pinch zoomen, Etikett beim Darüberfahren.
- **Tastatur:** Pfeiltasten drehen, `+`/`−` zoomen, `0` Ausgangsansicht, `Esc` schließt das Panel.

## 5. Offline

| Funktion | Offline? |
|---|---|
| App-Oberfläche, Texte aller Strukturen, Favoriten, Lernfunktionen | ✅ nach dem ersten Besuch |
| Ebenen Haut, Skelett, Organe, Gefäße, Nerven | ✅ werden bei der Installation des Service Workers vorab gespeichert (~2,8 MB) |
| Muskelebene (1,6 MB) | ✅ nachdem sie einmal online eingeschaltet wurde |
| Quellen-Links (externe Websites) | ❌ benötigen Internet |

Updates: Erscheint eine neue Version, zeigt die App „Eine neue Version ist verfügbar – Aktualisieren“. Ohne Bestätigung läuft die bisherige Version weiter, damit niemand mitten in der Exploration unterbrochen wird.

## 6. Getestet

| Umgebung | Ergebnis |
|---|---|
| Chromium (headless, Software-Rendering SwiftShader) mit 1280 × 860, 1000 × 700, 390 × 844 (iPhone-Format, Touch), 820 × 1180 und 1180 × 820 (iPad-Format, Touch) sowie Fenstergrößenwechsel 694 × 1024 / 375 × 1024 (Split View) | Browsertest (`npm run test:e2e`, 43 Prüfungen) bestanden |
| Dasselbe mit 744 × 1133 (iPad mini), 1024 × 1366 (iPad Pro 13″), 590 × 820 (Split View ½) | Manuelle Sichtprüfung per Screenshots |
| Dasselbe, zusätzlich 844 × 390 (Querformat) | Manuelle Sichtprüfung per Screenshots (Auswahl, Seitenpanel, Ebenen, Quiz, Lernkarten, Einstellungen) |
| **Echtes iPhone / iPad, iOS-/iPadOS-Safari** | **Noch nicht getestet** – in dieser Entwicklungsumgebung steht kein Apple-Gerät zur Verfügung. Apple Pencil, Trackpad-Pinch und Safari-eigene Gesten-Ereignisse lassen sich in Chromium nicht nachstellen. |

Erwartung für echte Geräte (nicht gemessen): Die Standardansicht umfasst rund 495 000 Dreiecke bei geteilten Materialien und Rendern nur bei Bedarf; aktuelle iPhones und iPads sollten das flüssig darstellen. Auf großen iPads (bis 2752 × 2064 Pixel) senkt die automatische Qualität die Pixeldichte, falls das Drehen ruckelt. Auf älteren Geräten hilft *Einstellungen → Darstellungsqualität → Einfach* und das Ausblenden nicht benötigter Ebenen. Bitte nach dem ersten Test auf dem iPhone Gerät, iOS-Version und Eindruck (Ladezeit, Flüssigkeit, Gesten) hier eintragen.
