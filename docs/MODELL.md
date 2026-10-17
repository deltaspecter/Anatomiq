# 3D-Modell: Herkunft, Lizenz, Inhalt und Grenzen

## Herkunft

Alle 3D-Geometrien stammen aus **BodyParts3D 4.0** der Database Center for Life Science (DBCLS, Japan), abgerufen über das LSDB Archive:
<https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>

BodyParts3D ist ein wissenschaftliches Modell eines männlichen Körpers, segmentiert nach der *Foundational Model of Anatomy* (FMA). Jedes Element (Datei `FJxxxx.obj`) gehört zu einem oder mehreren FMA-Konzepten; die Tabellen `partof_element_parts.txt` und `isa_element_parts.txt` ordnen sie zu. Damit sind Organe, Knochen, Muskeln und Gefäße **wirklich getrennt** und einzeln auswählbar – die wichtigste Voraussetzung für Anatomiq.

Geprüfte Alternativen und warum sie (noch) nicht genutzt werden:

| Quelle | Bewertung |
|---|---|
| **Z-Anatomy** (CC BY-SA 4.0) | Baut auf BodyParts3D auf, ergänzt Beschriftungen; liegt als sehr große Blender-Datei vor. Eignet sich als spätere Ergänzung (z. B. Nerven), wurde für den Prototyp nicht gebraucht. |
| **Human Reference Atlas (HuBMAP) 3D-Referenzorgane** (CC BY 4.0) | Hochwertige Einzelorgane (z. B. Lunge, Niere) – aber in einem anderen Koordinatensystem (Visible Human). Kandidat, um die fehlende Lungenoberfläche zu ergänzen; erfordert Registrierung auf das BodyParts3D-Skelett. |
| Kommerzielle Modelle (z. B. Zygote, TurboSquid) | Teils sehr detailliert, aber kostenpflichtig, oft ohne Web-Weitergaberecht und nicht immer segmentiert. |

## Lizenz

- Die **aktuelle Lizenzseite** des LSDB Archive (<https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>, abgerufen am 17.10.2026) nennt **Creative Commons Namensnennung 4.0 International (CC BY 4.0)** mit der geforderten Namensnennung: *„BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International“*. CC BY 4.0 erlaubt auch die kommerzielle Nutzung.
- Die **Dateiköpfe der OBJ-Dateien** (Stand 2013) nennen noch *CC BY-SA 2.1 Japan*.

Umgang damit in Anatomiq:
1. Die Namensnennung erscheint in der App (Einstellungen → Über Anatomiq, und bei jeder Struktur), im README und hier.
2. Die abgeleiteten Modelldateien (`public/models/*.glb`, `src/data/generated/model-manifest.json`) werden so behandelt, dass sie **beide Fassungen erfüllen**: Namensnennung, Kennzeichnung der Änderungen (vereinfacht, zusammengefasst, neu eingefärbt) und Weitergabe unter denselben Bedingungen. Der App-Code und die Texte sind davon getrennt.
3. **Vor einer kommerziellen Veröffentlichung** sollte die Lizenzfrage bei der DBCLS schriftlich bestätigt werden.

## Aufbereitung (`npm run model`)

`scripts/build-model.ts` erzeugt aus den Rohdaten die Dateien der App:

1. **Zuordnung** (`scripts/model/catalog.ts`): Jede Struktur der App ist ein Eintrag mit stabiler ID, Ebene, BodyParts3D-Konzepten und Dreiecksbudget. Paarige Strukturen werden automatisch als `-r`/`-l` angelegt.
2. **Eindeutigkeit**: Jede Element-Datei gehört genau einer Struktur. Gehört sie zu mehreren Einträgen, gewinnt das spezifischere Konzept.
3. **Nur das Gefäß selbst**: In BodyParts3D schließt z. B. „A. subclavia“ den gesamten nachgeschalteten Arterienbaum bis zur Hand ein. Für Gefäße wählt die Pipeline daher nur die *eigenen* Elemente eines Konzepts (`{ own: … }`), damit ein angetippter Unterschenkelast nie als „Beckenarterie“ erscheint.
4. **Koordinaten**: mm → m, Z-oben → Y-oben, Blick von vorn entlang −Z (reine Drehung, keine Spiegelung – rechts bleibt rechts). Körpermitte auf x = z = 0, Fußsohlen auf y = 0.
5. **Geometrie**: Punkte verschweißen, Ausrichtung der Flächen prüfen, mit *meshoptimizer* auf das Budget vereinfachen, Normalen berechnen.
6. **Ausgabe**: eine GLB-Datei je Ebene, ein benannter Knoten je Struktur, quantisiert (`KHR_mesh_quantization`) und komprimiert (`EXT_meshopt_compression`). Das Manifest enthält je Struktur Mittelpunkt, Größe, Dreieckszahl und die verwendeten FMA-Konzepte und Element-Dateien (Nachvollziehbarkeit).

Die Rohdaten (~270 MB) werden nur beim Neuerzeugen in `.cache/bodyparts3d/` geladen; die fertigen Dateien liegen im Repository.

## Inhalt

| Ebene | Datei | Strukturen | Dreiecke | Größe |
|---|---|---|---|---|
| Haut | `skin.glb` | 1 | 40 000 | 188 KB |
| Skelett | `skeleton.glb` | 100 | 179 000 | 1 039 KB |
| Muskeln | `muscles.glb` | 67 | 112 000 | 644 KB |
| Organe | `organs.glb` | 32 | 95 000 | 524 KB |
| Gefäße | `vessels.glb` | 63 | 38 000 | 264 KB |
| Nerven | `nervous.glb` | 7 | 43 000 | 227 KB |
| **Gesamt** | | **270** | **≈ 506 000** | **≈ 2,8 MB** |

Enthaltene Strukturen (r/l = rechts und links einzeln):

- **Skelett:** Stirnbein, Scheitelbeine, Hinterhauptbein, Schläfenbeine, Keilbein, Jochbeine, Oberkiefer, Nasenbeine, Unterkiefer, Zungenbein; alle 24 freien Wirbel einzeln (Atlas, Axis, C3–C7, T1–T12, L1–L5), Kreuzbein, Bandscheiben (gemeinsam), Brustbein, alle 24 Rippen einzeln, Rippenknorpel (r/l); Schlüsselbein, Schulterblatt, Oberarmknochen, Speiche, Elle, Handwurzel-, Mittelhand- und Fingerknochen (je Gruppe r/l); Hüftbein, Oberschenkelknochen, Kniescheibe, Schienbein, Wadenbein, Fußwurzel-, Mittelfuß- und Zehenknochen (je Gruppe r/l).
- **Muskeln (r/l):** Kopfwender, Kapuzenmuskel, Deltamuskel, großer und kleiner Brustmuskel, vorderer Sägezahnmuskel, äußerer schräger Bauchmuskel, großer Rautenmuskel, Ober- und Untergrätenmuskel, großer Rundmuskel, Bizeps, Trizeps, M. brachialis, M. brachioradialis, großer und mittlerer Gesäßmuskel, Schenkelbindenspanner, Darmbeinmuskel, großer Lendenmuskel, Schneidermuskel, Rectus femoris, Vastus lateralis und medialis, langer Adduktor, Gracilis, Biceps femoris, Semitendinosus, Semimembranosus, Gastrocnemius, Soleus, Tibialis anterior, Fibularis longus; dazu das Zwerchfell.
- **Organe:** Herz (mit Herzkranzgefäßen), Lunge r/l (Bronchial- und Gefäßbaum), Luftröhre, Speiseröhre, Thymus, Leber, Gallenblase, Magen, Milz, Bauchspeicheldrüse, Zwölffinger-, Leer- und Krummdarm, Blinddarm, Wurmfortsatz, aufsteigender, querer und absteigender Dickdarm, Mastdarm, Nieren, Nebennieren, Harnleiter, Harnblase, Prostata, Hoden, Augäpfel.
- **Gefäße:** Aorta, Lungenarterienstamm, Truncus brachiocephalicus, Aa. carotis communis und interna, Aa. vertebrales, subclaviae, axillares, brachiales, radiales, ulnares, Truncus coeliacus, A. mesenterica superior, Aa. renales, iliacae communes, internae und externae, femorales, popliteae, tibiales anteriores und posteriores; obere und untere Hohlvene, Vv. brachiocephalicae, jugulares internae (unterer Abschnitt), subclaviae, cephalicae, basilicae, renales, iliacae communes, femorales, saphenae magnae und parvae, Pfortader, Milzvene, V. mesenterica superior, V. azygos.
- **Nerven:** Großhirnhälften r/l, Kleinhirn, Hirnstamm, Rückenmark, Sehnerven r/l.

## Was fehlt

Ehrlich ausgewiesen, damit niemand Vollständigkeit annimmt:

| Fehlt | Grund / Plan |
|---|---|
| **Lungenoberfläche** | In BodyParts3D nicht vorhanden (nur Bronchial- und Gefäßbaum). Ein Versuch, eine Hülle aus den Segmentbäumen zu berechnen, ergab keine vertretbare Form und wurde verworfen. Plan: HuBMAP-Referenzlunge registrieren. |
| Schilddrüse, Kehlkopf als Ganzes, Zunge, Speicheldrüsen | Teilweise in BodyParts3D vorhanden (z. B. Schildknorpel, Zunge) – nächster Ausbauschritt. |
| Siebbein, Tränenbeine, Gaumenbeine, Pflugscharbein, Nasenmuscheln, Zähne, Steißbein | Siebbein & Co. vorhanden, aber für den Prototyp nicht aufgenommen; ein Steißbein fehlt in BodyParts3D. |
| Rectus abdominis, Latissimus dorsi, Kaumuskeln, Unterarm- und Handmuskeln, tiefe Rückenmuskeln | Rectus abdominis, Latissimus dorsi, Masseter und Temporalis fehlen in BodyParts3D; Unterarm-/Handmuskeln und Rückenstrecker sind vorhanden und können ergänzt werden. |
| Periphere Nerven (Plexus, N. ischiadicus …) | In BodyParts3D nur sehr lückenhaft (v. a. Hirnnerven der Augenhöhle). Kandidat: Z-Anatomy. |
| Sigma (Colon sigmoideum), Gekröse, Bauchfell | Sigma fehlt in BodyParts3D als eigenes Teil. |
| Weibliche Anatomie | BodyParts3D bildet einen männlichen Körper ab. |
| Gelenkkapseln, Bänder, Knorpel der Gelenke | Teilweise vorhanden, für den Prototyp nicht aufgenommen. |

## Bekannte Grenzen der Darstellung

- **Vereinfachung:** Die Meshes wurden auf ein Budget reduziert (z. B. Herz 16 000, Wirbel 1 200–1 600 Dreiecke). Für die Orientierung am Modell reicht das; für Detailstudien kleiner Strukturen ist das Original feiner.
- **Grobe Quellgeometrie:** Einige Strukturen sind schon in BodyParts3D grob (z. B. Rückenmark ≈ 700 Dreiecke, Hüftbein ≈ 2 400).
- **Gefäße ohne Äste:** Gezeigt werden nur die genannten Hauptgefäße; kleinere Äste fehlen bewusst, damit jede antippbare Struktur korrekt benannt ist. Von der inneren Drosselvene enthält das Modell nur den unteren Abschnitt.
- **Gruppen:** Handwurzel-, Mittelhand-, Finger-, Fußwurzel-, Mittelfuß- und Zehenknochen sowie die Bandscheiben sind je Seite zu einer Struktur zusammengefasst.
