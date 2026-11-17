// What is changing each sector, and who is behind it, for the item cards:
// staff, the heir's traits, the bloodline's and running favours can all
// raise a sector's income or cut its costs.
import type { Sector } from '../data/items'
import type { Modifiers, ModifierSource } from './modifiers'

export const SECTOR_LABELS: Readonly<Record<Sector, string>> = {
  food: 'Food',
  property: 'Property',
  finance: 'Finance',
  infrastructure: 'Infrastructure',
  media: 'Media',
  services: 'Services'
}

export interface NamedSource {
  name: string
  source: ModifierSource
}

export interface SectorEffect {
  // What the sector's businesses earn, and what its items cost, as multipliers
  income: number
  cost: number
  // Who is behind it, by name, each once
  from: string[]
}

const CHANGED = (v: number | undefined): boolean => v !== undefined && Math.abs(v - 1) > 0.005

// The totals come from the game's own combined modifiers, so they always
// match what the economy pays; the names come from the sources that touch
// the sector
export function sectorEffect(sector: Sector, mods: Modifiers, named: ReadonlyArray<NamedSource>): SectorEffect {
  const from: string[] = []
  for (const { name, source } of named) {
    if ((CHANGED(source.sectorBusinessMult?.[sector]) || CHANGED(source.sectorCostMult?.[sector])) && !from.includes(name)) {
      from.push(name)
    }
  }
  return { income: mods.sectorBusinessMult[sector] ?? 1, cost: mods.sectorCostMult[sector] ?? 1, from }
}

function fmtMult(v: number): string {
  return `×${Number(v.toFixed(2))}`
}

// The pill: the sector, and what's changed about it. Jobs earn by the tap,
// so only a cost change reaches them.
export function sectorPill(sector: Sector, effect: SectorEffect, kind: 'jobs' | 'businesses'): { text: string; changed: boolean; worse: boolean } {
  const parts: string[] = []
  let worse = false
  if (kind === 'businesses' && CHANGED(effect.income)) {
    parts.push(fmtMult(effect.income))
    if (effect.income < 1) worse = true
  }
  if (CHANGED(effect.cost)) {
    const pct = Math.round((effect.cost - 1) * 100)
    parts.push(`${pct > 0 ? '+' : '−'}${Math.abs(pct)}% cost`)
    if (effect.cost > 1) worse = true
  }
  return { text: [SECTOR_LABELS[sector], ...parts].join(' '), changed: parts.length > 0, worse }
}
