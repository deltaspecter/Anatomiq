/**
 * Lernen am Modell: Auswahl des Modus (Popover) und die schwebende Aufgabenkarte während Quiz oder Lernkarten.
 * Gefragt wird nur, was gerade deckend sichtbar ist – über die Ebenen lässt sich das Thema eingrenzen
 * (z. B. nur Skelett einblenden → nur Knochen).
 */
import { Check, Eye, MousePointerClick, SkipForward, SquareStack, X } from 'lucide-react'
import { getStructure } from '@/data/structures'
import { SIDE_LABELS, type AnatomicalStructure } from '@/data/types'
import { usePrefs } from '@/state/prefs'
import { Popover } from '@/ui/Popover'
import { useLearn } from './store'

const name = (s: AnatomicalStructure) => (s.side ? `${s.nameDe} (${SIDE_LABELS[s.side]})` : s.nameDe)

export function LearnSheet({ onClose }: { onClose: () => void }) {
  const progress = usePrefs((s) => s.progress)
  const entries = Object.values(progress)
  const mastered = entries.filter((p) => p.box >= 3).length
  const start = (mode: 'quiz' | 'cards') => {
    useLearn.getState().start(mode)
    onClose()
  }
  return (
    <Popover title="Lernen" onClose={onClose}>
      <div className="space-y-2.5">
        <button type="button" className="flex w-full gap-3 rounded-2xl bg-white/[0.05] p-3.5 text-left hover:bg-white/[0.08]" onClick={() => start('quiz')}>
          <MousePointerClick size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="block text-[15px] font-medium">Finde die Struktur</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">Ein Name wird genannt – tippe die Struktur im Modell an.</span>
          </span>
        </button>
        <button type="button" className="flex w-full gap-3 rounded-2xl bg-white/[0.05] p-3.5 text-left hover:bg-white/[0.08]" onClick={() => start('cards')}>
          <SquareStack size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="block text-[15px] font-medium">Lernkarten</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">Eine Struktur wird markiert – wie heißt sie auf Deutsch und Latein?</span>
          </span>
        </button>
        <p className="pt-1 text-[12.5px] leading-snug text-muted">
          Tipp: Gefragt wird nur, was gerade sichtbar ist. Blende über „Ebenen“ z. B. nur das Skelett ein, um gezielt Knochen zu üben. Strukturen, die du nicht wusstest, kommen häufiger dran.
        </p>
        {entries.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-white/5 p-3 text-[13px]">
            <span className="text-muted">
              {entries.length} geübt · {mastered} sicher
            </span>
            <button type="button" className="text-muted underline" onClick={() => confirm('Lernfortschritt zurücksetzen?') && usePrefs.getState().resetProgress()}>
              Zurücksetzen
            </button>
          </div>
        )}
      </div>
    </Popover>
  )
}

export function LearnOverlay() {
  const { mode, target, revealed, attempts, lastWrong, feedback, score } = useLearn()
  if (mode === 'off') return null
  const { stop, next, reveal, grade } = useLearn.getState()
  const s = target ? getStructure(target) : undefined
  const wrong = lastWrong ? getStructure(lastWrong) : undefined

  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3" style={{ top: 'calc(62px + var(--safe-top))' }}>
      <div className="glass fade-in pointer-events-auto w-[min(420px,100%)] rounded-3xl p-4 shadow-2xl" role="status" aria-live="polite">
        <div className="flex items-center justify-between text-[12px] text-muted">
          <span className="font-semibold uppercase tracking-[0.08em]">{mode === 'quiz' ? 'Finde die Struktur' : 'Lernkarte'}</span>
          <span className="flex items-center gap-1">
            {score.total > 0 && (
              <span>
                {score.correct}/{score.total}
              </span>
            )}
            <button type="button" className="icon-btn -my-2 -mr-2 h-9 w-9" onClick={stop} aria-label="Lernmodus beenden">
              <X size={18} aria-hidden />
            </button>
          </span>
        </div>

        {!s ? (
          <p className="mt-2 text-[14px] leading-relaxed">Gerade ist keine passende Struktur deckend sichtbar. Blende über „Ebenen“ eine Ebene ein und starte erneut.</p>
        ) : mode === 'quiz' ? (
          <>
            <p className="mt-1.5 text-[19px] font-semibold leading-tight">{name(s)}</p>
            <p className="text-[14px] italic text-ink/70">{s.nameLa}</p>
            <p className="mt-2 min-h-[20px] text-[13.5px] leading-snug">
              {feedback?.kind === 'correct' && feedback.id === target && attempts === 0 && <span className="text-good">Richtig!</span>}
              {feedback?.kind === 'correct' && feedback.id === target && attempts === 1 && <span className="text-good">Richtig – im zweiten Versuch.</span>}
              {revealed && attempts >= 2 && (
                <span className="text-muted">
                  {wrong ? `Das war: ${name(wrong)}. ` : ''}Die gesuchte Struktur ist jetzt grün markiert.
                </span>
              )}
              {!revealed && wrong && <span className="text-bad">Das ist: {name(wrong)}. Noch ein Versuch!</span>}
              {!revealed && !wrong && <span className="text-muted">Drehe und zoome das Modell und tippe die Struktur an.</span>}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="btn-ghost h-10 min-h-0 text-sm" onClick={next}>
                {revealed ? 'Weiter' : 'Überspringen'} <SkipForward size={15} aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-[15px] leading-snug">Wie heißt die markierte Struktur?</p>
            {revealed ? (
              <>
                <p className="mt-2 text-[19px] font-semibold leading-tight">{name(s)}</p>
                <p className="text-[14px] italic text-ink/70">{s.nameLa}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-ghost h-11 text-sm" onClick={() => grade(false)}>
                    <X size={16} aria-hidden /> Nicht gewusst
                  </button>
                  <button type="button" className="btn-primary h-11 text-sm" onClick={() => grade(true)}>
                    <Check size={16} aria-hidden /> Gewusst
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-ghost h-11 text-sm" onClick={next} aria-label="Karte überspringen">
                  <SkipForward size={16} aria-hidden />
                </button>
                <button type="button" className="btn-primary h-11 flex-1 text-sm" onClick={reveal}>
                  <Eye size={16} aria-hidden /> Antwort zeigen
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
