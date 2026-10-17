/** Gemerkte und zuletzt angesehene Strukturen – eine Abkürzung zurück ins Modell, keine Hauptnavigation */
import { Star } from 'lucide-react'
import { getStructure } from '@/data/structures'
import { SIDE_LABELS, type AnatomicalStructure } from '@/data/types'
import { revealAndSelect } from '@/selection/reveal'
import { usePrefs } from '@/state/prefs'
import { Popover } from './Popover'

function Item({ s, onPick }: { s: AnatomicalStructure; onPick: () => void }) {
  return (
    <li>
      <button type="button" className="flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/5" onClick={onPick}>
        <span className="text-[15px]">
          {s.nameDe}
          {s.side && <span className="text-muted"> · {SIDE_LABELS[s.side]}</span>}
        </span>
        <span className="truncate text-[13px] italic text-muted">{s.nameLa}</span>
      </button>
    </li>
  )
}

export function FavoritesSheet({ onClose }: { onClose: () => void }) {
  const favorites = usePrefs((s) => s.favorites)
  const recent = usePrefs((s) => s.recent)
  const fav = favorites.map(getStructure).filter((s): s is AnatomicalStructure => !!s)
  const rec = recent.filter((id) => !favorites.includes(id)).map(getStructure).filter((s): s is AnatomicalStructure => !!s)
  const pick = (id: string) => {
    revealAndSelect(id)
    onClose()
  }
  return (
    <Popover title="Favoriten" onClose={onClose}>
      {fav.length === 0 ? (
        <p className="py-2 text-[14px] leading-relaxed text-muted">
          Noch keine Favoriten. Tippe im Modell eine Struktur an und wähle <Star size={14} className="inline align-[-2px]" aria-label="Merken" /> „Merken“.
        </p>
      ) : (
        <ul className="-mx-2">
          {fav.map((s) => (
            <Item key={s.id} s={s} onPick={() => pick(s.id)} />
          ))}
        </ul>
      )}
      {rec.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Zuletzt angesehen</h3>
          <ul className="-mx-2">
            {rec.map((s) => (
              <Item key={s.id} s={s} onPick={() => pick(s.id)} />
            ))}
          </ul>
        </>
      )}
    </Popover>
  )
}
