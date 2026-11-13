// The family tree: one record per retired generation.
export interface GenerationRecord {
  generation: number
  name: string
  traitId: string | null
  deepestGate: number
  legacyEarned: number
  // Active play time the generation lasted
  activeMs: number
  // Advisor names on the payroll at retirement, PA first
  advisors: string[]
  splits: (number | null)[]
}

export const MAX_TREE_ENTRIES = 200

export function readGenerationRecord(raw: unknown): GenerationRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  if (typeof r.name !== 'string') return null
  return {
    generation: Math.max(1, Math.floor(num(r.generation))),
    name: r.name,
    traitId: typeof r.traitId === 'string' ? r.traitId : null,
    deepestGate: Math.floor(num(r.deepestGate)),
    legacyEarned: num(r.legacyEarned),
    activeMs: num(r.activeMs),
    advisors: Array.isArray(r.advisors) ? r.advisors.filter((a): a is string => typeof a === 'string') : [],
    splits: Array.isArray(r.splits) ? r.splits.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)) : []
  }
}
