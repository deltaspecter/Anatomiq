import { Share } from 'lucide-react'
import type { ReactNode } from 'react'
import { LAYER_FILES, MODEL_MESHES } from '@/data/model'
import { STRUCTURES } from '@/data/structures'
import { usePrefs, type Quality } from '@/state/prefs'
import { Popover } from './Popover'

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[15px]">{title}</p>
        {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const QUALITY: { id: Quality; label: string }[] = [
  { id: 'auto', label: 'Automatisch' },
  { id: 'high', label: 'Hoch' },
  { id: 'low', label: 'Einfach' },
]

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const prefs = usePrefs()
  const totalKb = Object.values(LAYER_FILES).reduce((a, l) => a + l.bytes, 0) / 1024
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone)
  return (
    <Popover title="Einstellungen" onClose={onClose}>
      <div className="divide-y divide-white/5">
        <div className="py-3">
          <p className="text-[15px]">Darstellungsqualität</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">„Automatisch“ senkt die Auflösung, wenn das Drehen ruckelt. „Einfach“ rendert immer mit geringerer Auflösung und ohne Kantenglättung – für ältere Geräte oder zum Akkusparen.</p>
          <div className="mt-2.5 flex gap-1.5" role="radiogroup" aria-label="Darstellungsqualität">
            {QUALITY.map((q) => (
              <button key={q.id} type="button" role="radio" aria-checked={prefs.quality === q.id} onClick={() => prefs.setQuality(q.id)} className={`chip flex-1 justify-center ${prefs.quality === q.id ? 'border-accent/60 bg-accent/15 text-accent' : ''}`}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <Row title="Kamera folgt der Auswahl" hint="Beim Antippen wird die Struktur sanft in die Bildmitte geholt.">
          <Toggle checked={prefs.autoFocus} onChange={prefs.setAutoFocus} label="Kamera folgt der Auswahl" />
        </Row>
        <Row title="Bedienhinweise" hint="Die Gestenhilfe beim Start erneut anzeigen.">
          <button type="button" className="chip" onClick={() => usePrefs.setState({ hintsSeen: false })}>
            Zeigen
          </button>
        </Row>
        <Row title="Lokale Daten löschen" hint={`${prefs.favorites.length} Favoriten, ${Object.keys(prefs.progress).length} Lernkarten-Einträge – gespeichert nur auf diesem Gerät.`}>
          <button
            type="button"
            className="chip text-bad"
            onClick={() => {
              if (confirm('Favoriten, Verlauf und Lernfortschritt auf diesem Gerät löschen?')) prefs.resetAll()
            }}
          >
            Löschen
          </button>
        </Row>

        {!standalone && (
          <div className="py-3 text-[13.5px] leading-relaxed text-ink/85">
            <p className="font-medium">Als App installieren (iPhone)</p>
            <p className="mt-1 text-muted">
              In Safari auf <Share size={13} className="inline align-[-2px]" aria-label="Teilen" /> „Teilen“ tippen und „Zum Home-Bildschirm“ wählen. Anatomiq startet dann im Vollbild wie eine eigene App.
            </p>
          </div>
        )}

        <div className="space-y-2 py-3 text-[13px] leading-relaxed text-muted">
          <p className="text-[15px] text-ink">Über Anatomiq</p>
          <p>
            Interaktiver 3D-Anatomieatlas: {MODEL_MESHES.length} einzeln antippbare Strukturen in sechs Ebenen, {STRUCTURES.length} Steckbriefe. Modell gesamt etwa {(totalKb / 1024).toFixed(1)} MB.
          </p>
          <p>
            <span className="text-ink/85">3D-Modell:</span> BodyParts3D, © The Database Center for Life Science (DBCLS), lizenziert unter{' '}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/deed.de" target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
            . Für Anatomiq vereinfacht, zu Strukturen zusammengefasst und neu eingefärbt.
          </p>
          <p>
            <span className="text-ink/85">Lungenlappen:</span> Browne, K.; Schlehlein, H. (2024): 3D Reference Organ for Lung, Male v1.4, Human Reference Atlas,{' '}
            <a className="underline" href="https://doi.org/10.48539/HBM532.KLZD.394" target="_blank" rel="noopener noreferrer">
              doi:10.48539/HBM532.KLZD.394
            </a>
            , CC BY 4.0 – skaliert und auf das BodyParts3D-Modell eingepasst.
          </p>
          <p>
            <span className="text-ink/85">Texte:</span> Erstfassungen, KI-gestützt auf Grundlage anatomischer Standardwerke erstellt und noch nicht fachlich begutachtet. Kein Ersatz für Lehrbuch oder ärztlichen Rat.
          </p>
          <p>
            <span className="text-ink/85">Offline:</span> Nach dem ersten Laden funktionieren App, Texte und die Ebenen Haut, Skelett, Organe, Gefäße und Nerven ohne Internet. Die Muskelebene wird beim ersten Einschalten geladen und danach ebenfalls gespeichert.
          </p>
          <p>
            <span className="text-ink/85">Datenschutz:</span> Kein Konto, keine Analyse, keine Übertragung. Favoriten und Lernfortschritt bleiben im Browser dieses Geräts.
          </p>
        </div>
      </div>
    </Popover>
  )
}
