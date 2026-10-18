/** Kontextaktionen zur ausgewählten Struktur – wirken nur auf diese Struktur */
import { Crosshair, EyeOff, Ghost, ScanEye, Star } from 'lucide-react'
import type { AnatomicalStructure } from '@/data/types'
import { usePrefs } from '@/state/prefs'
import { useViewer } from '@/state/viewer'
import { IconButton } from '@/ui/IconButton'

export function StructureActions({ structure }: { structure: AnatomicalStructure }) {
  const id = structure.id
  const isolated = useViewer((s) => s.isolated)
  const override = useViewer((s) => s.overrides[id])
  const favorite = usePrefs((s) => s.favorites.includes(id))
  const viewer = useViewer.getState

  const isIsolated = !!isolated && isolated.length === 1 && isolated[0] === id
  const isGhost = override === 'ghost'
  const isHidden = override === 'hidden'

  return (
    <div className="flex items-start justify-between px-2.5" role="toolbar" aria-label="Aktionen zur Struktur">
      <IconButton icon={Crosshair} caption="Fokus" label="Kamera auf die Struktur ausrichten" onClick={() => viewer().camera({ kind: 'focus', id })} />
      <IconButton
        icon={ScanEye}
        caption="Isolieren"
        label={isIsolated ? 'Isolation aufheben' : 'Nur diese Struktur zeigen'}
        pressed={isIsolated}
        onClick={() => {
          viewer().isolate(isIsolated ? null : [id])
          if (!isIsolated) viewer().camera({ kind: 'focus', id })
        }}
      />
      <IconButton
        icon={Ghost}
        caption="Transparent"
        label={isGhost ? 'Wieder deckend zeigen' : 'Struktur durchscheinend machen'}
        pressed={isGhost}
        onClick={() => {
          viewer().setOverride(id, isGhost ? null : 'ghost')
          if (!isGhost) viewer().showToast(`${structure.nameDe} ist jetzt durchscheinend – darunterliegende Strukturen lassen sich antippen.`)
        }}
      />
      <IconButton
        icon={EyeOff}
        caption={isHidden ? 'Einblenden' : 'Ausblenden'}
        label={isHidden ? 'Struktur wieder einblenden' : 'Struktur ausblenden'}
        pressed={isHidden}
        onClick={() => {
          viewer().setOverride(id, isHidden ? null : 'hidden')
          if (!isHidden) viewer().showToast(`${structure.nameDe} ausgeblendet. „Darstellung zurücksetzen“ zeigt alles wieder.`)
        }}
      />
      <IconButton
        icon={Star}
        caption="Merken"
        label={favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        pressed={favorite}
        onClick={() => usePrefs.getState().toggleFavorite(id)}
      />
    </div>
  )
}
