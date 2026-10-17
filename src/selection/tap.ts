import { getStructure } from '@/data/structures'
import { useLearn } from '@/learn/store'
import { usePrefs } from '@/state/prefs'
import { useViewer } from '@/state/viewer'

/**
 * Was ein Tippen bewirkt, hängt vom Modus ab:
 *  – Quiz: Antwort prüfen
 *  – Lernkarten: Tippen wird ignoriert (die Karte bleibt auf ihrer Struktur)
 *  – Erkunden: Struktur auswählen (Tippen ins Leere hebt die Auswahl auf, die Kameraposition bleibt)
 */
export function handleTap(id: string | null, double = false) {
  const learn = useLearn.getState()
  if (learn.mode === 'quiz') return learn.answer(id)
  if (learn.mode === 'cards') return

  const viewer = useViewer.getState()
  if (!id || !getStructure(id)) {
    // Ohne Inhalte keine Auswahl – lieber nichts anzeigen als etwas Falsches
    if (viewer.selectedId) viewer.select(null)
    return
  }
  if (double) {
    viewer.camera({ kind: 'focus', id })
    return
  }
  viewer.select(id)
  usePrefs.getState().pushRecent(id)
  if (usePrefs.getState().autoFocus) viewer.camera({ kind: 'focus', id, close: false })
}
