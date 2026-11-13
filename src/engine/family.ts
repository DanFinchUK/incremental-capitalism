// The family tree: one record per retired generation.
import { TRAITS_BY_ID } from '../data/heirs'
import type { Sector } from '../data/items'
import { combineModifiers, type ModifierSource } from './modifiers'

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
  // True when this generation ended by elevating to the House of Lords
  elevated?: boolean
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
    splits: Array.isArray(r.splits) ? r.splits.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)) : [],
    ...(r.elevated === true ? { elevated: true } : {})
  }
}

// Generations belonging to the active Peerage cycle (since the last elevation)
export function currentBloodlineRecords(tree: ReadonlyArray<GenerationRecord>): GenerationRecord[] {
  let start = 0
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].elevated) start = i + 1
  }
  return tree.slice(start)
}

// Every trait carried in the family's DNA, from retired ancestors to the current head
export function bloodlineTraitSources(
  tree: ReadonlyArray<GenerationRecord>,
  currentTraitId: string | null
): ModifierSource[] {
  const ids: string[] = []
  for (const rec of currentBloodlineRecords(tree)) {
    if (rec.traitId) ids.push(rec.traitId)
  }
  if (currentTraitId) ids.push(currentTraitId)
  return ids.flatMap((id) => (TRAITS_BY_ID[id] ? [TRAITS_BY_ID[id].mods] : []))
}

const SECTOR_NAMES: Readonly<Record<Sector, string>> = {
  food: 'Food',
  property: 'Property',
  finance: 'Finance',
  infrastructure: 'Infra',
  media: 'Media',
  services: 'Services'
}

function fmtMult(v: number): string {
  return `x${Number(v.toFixed(2))}`
}

function fmtSignedPct(delta: number): string {
  const pct = Math.round(delta * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

// Concise pills summarising the combined bloodline trait modifiers
export function describeBloodlineTraits(
  tree: ReadonlyArray<GenerationRecord>,
  currentTraitId: string | null
): Array<{ label: string; negative: boolean }> {
  const sources = bloodlineTraitSources(tree, currentTraitId)
  if (sources.length === 0) return []
  const m = combineModifiers(sources)
  const pills: Array<{ label: string; negative: boolean }> = []
  if (Math.abs(m.clickMult - 1) > 0.01) pills.push({ label: `Clicks ${fmtMult(m.clickMult)}`, negative: m.clickMult < 1 })
  if (Math.abs(m.businessMult - 1) > 0.01) pills.push({ label: `Businesses ${fmtMult(m.businessMult)}`, negative: m.businessMult < 1 })
  for (const [sector, mult] of Object.entries(m.sectorBusinessMult) as Array<[Sector, number]>) {
    if (Math.abs(mult - 1) > 0.01) pills.push({ label: `${SECTOR_NAMES[sector]} ${fmtMult(mult)}`, negative: mult < 1 })
  }
  for (const [sector, mult] of Object.entries(m.sectorCostMult) as Array<[Sector, number]>) {
    if (Math.abs(mult - 1) > 0.01) pills.push({ label: `${SECTOR_NAMES[sector]} cost ${fmtSignedPct(mult - 1)}`, negative: mult > 1 })
  }
  if (Math.abs(m.purchaseCostMult - 1) > 0.01) {
    pills.push({ label: `Costs ${fmtSignedPct(m.purchaseCostMult - 1)}`, negative: m.purchaseCostMult > 1 })
  }
  if (m.incomeDrain > 0.001) pills.push({ label: `Drain ${Math.round(m.incomeDrain * 100)}%`, negative: true })
  if (Math.abs(m.legacyScale - 1) > 0.01) pills.push({ label: `Legacy value ${fmtMult(m.legacyScale)}`, negative: m.legacyScale < 1 })
  if (Math.abs(m.trustFundMult - 1) > 0.01) pills.push({ label: `Trust fund ${fmtMult(m.trustFundMult)}`, negative: m.trustFundMult < 1 })
  if (m.internsDisabled) pills.push({ label: 'Interns barred', negative: true })
  if (Math.abs(m.bossTimeMult - 1) > 0.01) pills.push({ label: `Boss time ${fmtSignedPct(m.bossTimeMult - 1)}`, negative: m.bossTimeMult < 1 })
  if (Math.abs(m.twistStrength - 1) > 0.01) {
    pills.push({ label: `Boss twists ${fmtSignedPct(m.twistStrength - 1)}`, negative: m.twistStrength > 1 })
  }
  if (Math.abs(m.eventIntervalMult - 1) > 0.01) {
    pills.push({ label: `Events ${fmtMult(1 / m.eventIntervalMult)} rate`, negative: m.eventIntervalMult > 1 })
  }
  if (m.shadyBonus > 0.001) pills.push({ label: `Shady +${Math.round(m.shadyBonus * 100)}%`, negative: true })
  if (Math.abs(m.windfallMult - 1) > 0.01) pills.push({ label: `Windfalls ${fmtMult(m.windfallMult)}`, negative: m.windfallMult < 1 })
  if (m.automationShareBonus > 0.0005) pills.push({ label: `Auto +${Math.round(m.automationShareBonus * 100)}%`, negative: false })
  return pills
}
