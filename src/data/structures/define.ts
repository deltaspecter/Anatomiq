import type { LayerId } from '../layers'
import type { AnatomicalStructure, RegionId, Side, SourceId, SystemId } from '../types'

type Content = Omit<AnatomicalStructure, 'id' | 'meshIds' | 'side' | 'layer' | 'status' | 'relatedStructureIds' | 'sourceReferences' | 'nameLa' | 'system' | 'region'>

export type Definition = Content & {
  nameLa: string
  system: SystemId
  region: RegionId
  /** Verwandte Strukturen; „~id“ meint bei paarigen Strukturen dieselbe Körperseite (z. B. ~ulna → ulna-r) */
  related?: string[]
  sources?: SourceId[]
}

export type PairedDefinition = Omit<Definition, 'nameLa'> & {
  /** Lateinischer Name rechts / links, z. B. ['Humerus dexter', 'Humerus sinister'] */
  nameLa: [string, string]
}

const DEFAULT_SOURCES: SourceId[] = ['ta2', 'prometheus', 'openstax']

function resolveRelated(related: string[] | undefined, side?: Side): string[] {
  return (related ?? []).map((id) => {
    if (!id.startsWith('~')) return id
    if (!side) throw new Error(`„${id}“: Seitenbezug nur bei paarigen Strukturen`)
    return `${id.slice(1)}-${side}`
  })
}

function build(id: string, layer: LayerId, def: Definition, side?: Side): AnatomicalStructure {
  const { related, sources, ...rest } = def
  return {
    ...rest,
    id,
    layer,
    side,
    meshIds: [id],
    // Bei paarigen Strukturen darf die Liste beide Seiten nennen; die eigene ID fällt heraus
    relatedStructureIds: resolveRelated(related, side).filter((r) => r !== id),
    sourceReferences: sources ?? DEFAULT_SOURCES,
    status: 'draft',
  }
}

/** Unpaarige Struktur, ein Mesh mit derselben ID */
export function single(id: string, layer: LayerId, def: Definition): AnatomicalStructure {
  return build(id, layer, def)
}

/** Paarige Struktur → <id>-r und <id>-l mit gemeinsamem Text */
export function paired(id: string, layer: LayerId, def: PairedDefinition): AnatomicalStructure[] {
  return (['r', 'l'] as const).map((side, i) => build(`${id}-${side}`, layer, { ...def, nameLa: def.nameLa[i] }, side))
}
