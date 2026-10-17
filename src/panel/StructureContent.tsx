/**
 * Inhalt des Informationspanels in der Reihenfolge der Wichtigkeit.
 * Abschnitte ohne Daten werden nicht angezeigt.
 */
import { Info, Layers, Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { modelMesh } from '@/data/model'
import { SOURCES } from '@/data/sources'
import { getStructure } from '@/data/structures'
import { SIDE_LABELS, type AnatomicalStructure } from '@/data/types'
import { revealAndSelect } from '@/selection/reveal'
import { useViewer } from '@/state/viewer'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
      <div className="text-[15px] leading-relaxed text-ink/90">{children}</div>
    </section>
  )
}

const label = (s: AnatomicalStructure) => (s.side ? `${s.nameDe} (${SIDE_LABELS[s.side]})` : s.nameDe)

export function StructureContent({ structure: s }: { structure: AnatomicalStructure }) {
  const related = s.relatedStructureIds.map((id) => getStructure(id)).filter((r): r is AnatomicalStructure => !!r)
  const mesh = modelMesh(s.meshIds[0])
  const isMuscle = !!(s.origin || s.insertion)

  return (
    <div className="selectable space-y-5 px-5 pb-8 pt-1">
      {s.location && <Section title="Lage">{s.location}</Section>}
      {s.function && <Section title="Funktion">{s.function}</Section>}
      {isMuscle && (
        <Section title="Ursprung · Ansatz · Innervation">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            {s.origin && (
              <>
                <dt className="text-muted">Ursprung</dt>
                <dd>{s.origin}</dd>
              </>
            )}
            {s.insertion && (
              <>
                <dt className="text-muted">Ansatz</dt>
                <dd>{s.insertion}</dd>
              </>
            )}
            {s.innervation && (
              <>
                <dt className="text-muted">Nerv</dt>
                <dd>{s.innervation}</dd>
              </>
            )}
          </dl>
        </Section>
      )}
      {s.structure && <Section title="Aufbau">{s.structure}</Section>}
      {s.parts && (
        <Section title="Bestandteile">
          <ul className="list-disc space-y-1 pl-5 marker:text-faint">
            {s.parts.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>
      )}
      {s.joints && <Section title="Gelenkverbindungen">{s.joints}</Section>}
      {s.bloodSupply && <Section title="Blutversorgung">{s.bloodSupply}</Section>}
      {s.innervation && !isMuscle && <Section title="Innervation">{s.innervation}</Section>}
      {s.neighbors && <Section title="Nachbarstrukturen">{s.neighbors}</Section>}
      {s.clinical && <Section title="Klinische Bedeutung">{s.clinical}</Section>}
      {s.terms && (
        <Section title="Fachbegriffe">
          <dl className="space-y-2">
            {s.terms.map((t) => (
              <div key={t.term}>
                <dt className="font-medium">{t.term}</dt>
                <dd className="text-ink/80">{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      {s.mnemonic && (
        <div className="flex gap-3 rounded-2xl border border-accent/25 bg-accent/8 p-3.5 text-[15px] leading-relaxed">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p>
            <span className="font-semibold text-accent">Merksatz: </span>
            {s.mnemonic}
          </p>
        </div>
      )}
      {related.length > 0 && (
        <Section title="Verwandte Strukturen">
          <div className="flex flex-wrap gap-2 pt-0.5">
            {related.map((r) => (
              <button key={r.id} type="button" className="chip hover:border-accent/50 hover:text-accent" onClick={() => revealAndSelect(r.id)}>
                {label(r)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-sm text-accent"
            onClick={() => {
              const v = useViewer.getState()
              v.isolate([s.id, ...related.map((r) => r.id)])
              v.camera({ kind: 'focus', id: s.id })
            }}
          >
            <Layers size={16} aria-hidden /> Zusammen mit den verwandten Strukturen isoliert zeigen
          </button>
        </Section>
      )}
      <Section title="Quellen">
        <ul className="space-y-1.5 text-[13px] text-ink/75">
          {s.sourceReferences.map((id) => {
            const src = SOURCES[id]
            return (
              <li key={id}>
                {src.url ? (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-accent">
                    {src.title}
                  </a>
                ) : (
                  src.title
                )}
              </li>
            )
          })}
        </ul>
      </Section>
      <div className="flex gap-3 rounded-2xl bg-white/[0.04] p-3.5 text-[12.5px] leading-relaxed text-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
        <div className="space-y-1.5">
          <p>
            <span className="font-medium text-ink/80">Prüfstatus: Erstfassung.</span> Der Text wurde KI-gestützt auf Grundlage anatomischer Standardwerke erstellt und noch nicht fachlich begutachtet. Für Prüfungen und klinische Entscheidungen bitte Lehrbücher heranziehen.
          </p>
          {mesh && (
            <p>
              {mesh.source === 'bodyparts3d'
                ? `3D-Geometrie: BodyParts3D (DBCLS, CC BY 4.0) · ${mesh.concepts.map((c) => `${c.fma} ${c.name}`).join(', ')}`
                : '3D-Geometrie: Human Reference Atlas, Referenzlunge (männlich, v1.4), CC BY 4.0 – auf den Bronchialbaum von BodyParts3D eingepasst'}{' '}
              · {mesh.triangles.toLocaleString('de-DE')} Dreiecke
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
