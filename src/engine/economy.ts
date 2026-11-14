import { BUSINESSES, JOBS, SYNERGY_JOB_FOR_BUSINESS, type BusinessDef, type ItemKind, type JobDef } from '../data/items'
import { GATE_NET_WORTH, SOCIAL_CLASSES, type SocialClassDef } from '../data/classes'
import { NEUTRAL_MODIFIERS, type Modifiers } from './modifiers'

// The last two milestones in each band are deliberately distant: only an old,
// cheap rung ever gets there, so the "next" bulk buy still has a target after
// the usual milestones without changing the main climb.
const MILESTONES_GENTLE: ReadonlyArray<number> = [10, 25, 50, 100, 200, 500, 1000]
const MILESTONES_MODERATE: ReadonlyArray<number> = [10, 20, 40, 75, 125, 300, 600]
const MILESTONES_STEEP: ReadonlyArray<number> = [5, 10, 25, 50, 75, 200, 400]
const MILESTONES_ELITE: ReadonlyArray<number> = [3, 5, 10, 20, 35, 100, 200]

// Each Legacy point multiplies income by LEGACY_INCOME_PER_POINT. Legacy is
// one point per gate past the bloodline's best (legacyForRetiring in
// engine/bosses.ts), so each new gate makes the family about as much stronger
// as the next gate is harder. That keeps the gate past the family's best easy
// for the next heir (see docs/pacing.md).
export const LEGACY_INCOME_PER_POINT = 4.5
// Share of the retiring run's net worth the heir starts with as cash.
export const HEIR_INHERITANCE_SHARE = 0.05
// Each rung of the item ladder is worth about a hundred times the one before,
// so 5% of a deep estate would hand the heir every gate it opened. The share
// is taken of the estate up to a cap instead: at the base share the trust
// fund lands the heir about one gate short of where the parent got to.
const INHERITANCE_ESTATE_CAP_GATES_BACK = 1

export function inheritableEstate(netWorth: number, deepestGate: number): number {
  const capGate = Math.max(1, Math.floor(deepestGate) - INHERITANCE_ESTATE_CAP_GATES_BACK)
  const cap = GATE_NET_WORTH[Math.min(capGate, GATE_NET_WORTH.length - 1)] / HEIR_INHERITANCE_SHARE
  return Math.min(Math.max(0, netWorth), cap)
}

export function heirInheritance(netWorth: number, deepestGate: number, shareAdd = 0): number {
  return Math.floor(inheritableEstate(netWorth, deepestGate) * (HEIR_INHERITANCE_SHARE + shareAdd))
}
export const BASE_CLICK_VALUE = 1

export type BulkBuyMode = 1 | 10 | 'next' | 'max'

export function itemMilestones(scaleFactor: number): ReadonlyArray<number> {
  if (scaleFactor <= 1.3) {
    return MILESTONES_GENTLE
  }
  if (scaleFactor <= 1.5) {
    return MILESTONES_MODERATE
  }
  if (scaleFactor <= 1.75) {
    return MILESTONES_STEEP
  }
  return MILESTONES_ELITE
}

export interface MilestoneStatus {
  reachedCount: number
  prevMilestone: number
  nextMilestone: number | null
  progress: number
}

export function milestoneProgress(owned: number, scaleFactor: number): MilestoneStatus {
  let reachedCount = 0
  let prevMilestone = 0
  let nextMilestone: number | null = null

  for (const m of itemMilestones(scaleFactor)) {
    if (owned >= m) {
      reachedCount += 1
      prevMilestone = m
    } else if (nextMilestone === null) {
      nextMilestone = m
    }
  }

  if (nextMilestone === null) {
    return { reachedCount, prevMilestone, nextMilestone: null, progress: 1 }
  }
  const span = nextMilestone - prevMilestone
  const progress = Math.min(1, Math.max(0, (owned - prevMilestone) / span))
  return { reachedCount, prevMilestone, nextMilestone, progress }
}

export function milestoneMultiplier(owned: number, scaleFactor: number, deregulationRank: number, stepBonus = 0): number {
  const { reachedCount } = milestoneProgress(owned, scaleFactor)
  if (reachedCount === 0) {
    return 1
  }
  const step = 2 + 0.25 * deregulationRank + stepBonus
  return Math.pow(step, reachedCount)
}

export function seriesCost(
  baseCost: number,
  scaleFactor: number,
  startOwned: number,
  count: number,
  costDiscount: number
): number {
  if (count <= 0) {
    return 0
  }
  const firstUnit = baseCost * costDiscount * Math.pow(scaleFactor, startOwned)
  if (count === 1) {
    return firstUnit
  }
  return firstUnit * ((Math.pow(scaleFactor, count) - 1) / (scaleFactor - 1))
}

export interface BulkBuyQuote {
  count: number
  cost: number
  canAfford: boolean
}

export function bulkBuyQuote(
  baseCost: number,
  scaleFactor: number,
  owned: number,
  costDiscount: number,
  mode: BulkBuyMode,
  availableMoney: number
): BulkBuyQuote {
  if (mode === 1 || mode === 10) {
    const cost = seriesCost(baseCost, scaleFactor, owned, mode, costDiscount)
    return { count: mode, cost, canAfford: availableMoney >= cost }
  }
  if (mode === 'next') {
    const { nextMilestone } = milestoneProgress(owned, scaleFactor)
    const count = nextMilestone !== null && nextMilestone > owned ? nextMilestone - owned : 1
    const cost = seriesCost(baseCost, scaleFactor, owned, count, costDiscount)
    return { count, cost, canAfford: availableMoney >= cost }
  }
  const firstCost = seriesCost(baseCost, scaleFactor, owned, 1, costDiscount)
  if (availableMoney < firstCost) {
    return { count: 1, cost: firstCost, canAfford: false }
  }
  let count = Math.max(
    1,
    Math.floor(Math.log(1 + (availableMoney * (scaleFactor - 1)) / firstCost) / Math.log(scaleFactor))
  )
  while (seriesCost(baseCost, scaleFactor, owned, count + 1, costDiscount) <= availableMoney) {
    count += 1
  }
  while (count > 1 && seriesCost(baseCost, scaleFactor, owned, count, costDiscount) > availableMoney) {
    count -= 1
  }
  const cost = seriesCost(baseCost, scaleFactor, owned, count, costDiscount)
  return { count, cost, canAfford: availableMoney >= cost }
}

export interface SocialClassStatus {
  current: SocialClassDef
  next: SocialClassDef | null
  incomeMultiplier: number
  costDiscount: number
  bracketProgress: number
}

// Class comes from the gates beaten; net worth only fills the progress bar
// towards the next gate.
export function classInfoForLevel(level: number, netWorth: number): SocialClassStatus {
  level = Math.min(SOCIAL_CLASSES.length - 1, Math.max(0, Math.floor(level)))
  const current = SOCIAL_CLASSES[level]
  const next = level + 1 < SOCIAL_CLASSES.length ? SOCIAL_CLASSES[level + 1] : null
  const incomeMultiplier = 1 + 0.15 * level
  const costDiscount = 1 - 0.02 * level
  const bracketProgress =
    next === null
      ? 1
      : Math.min(1, Math.max(0, (netWorth - current.threshold) / (next.threshold - current.threshold)))

  return { current, next, incomeMultiplier, costDiscount, bracketProgress }
}

export function legacyMultiplier(legacyPoints: number, scale = 1): number {
  return Math.pow(LEGACY_INCOME_PER_POINT, Math.max(0, legacyPoints) * scale)
}

export function maxHustleMultiplier(rank: number): number {
  return 3 + Math.max(0, rank)
}

export interface EconomySnapshotInput {
  jobsPurchased: Readonly<Record<string, number>>
  businessesOwned: Readonly<Record<string, number>>
  legacyPoints: number
  classLevel: number
  deregulationRank: number
  autoClickers: number
  businessBuffMultiplier: number
  clickBuffMultiplier: number
  hustleMultiplier: number
  // Heir traits, advisors and titles
  mods?: Modifiers
}

function modsOf(input: EconomySnapshotInput): Modifiers {
  return input.mods ?? NEUTRAL_MODIFIERS
}

export function jobUnitClickIncome(job: JobDef, owned: number, input: EconomySnapshotInput): number {
  const mods = modsOf(input)
  const mMult = milestoneMultiplier(Math.max(1, owned), job.scaleFactor, input.deregulationRank, mods.milestoneStepBonus)
  const classMult = 1 + 0.15 * input.classLevel
  return job.moneyPerClick * mMult * classMult * legacyMultiplier(input.legacyPoints, mods.legacyScale) * input.clickBuffMultiplier * mods.clickMult
}

export function businessUnitPerSecond(biz: BusinessDef, owned: number, input: EconomySnapshotInput): number {
  const mods = modsOf(input)
  const mMult = milestoneMultiplier(Math.max(1, owned), biz.scaleFactor, input.deregulationRank, mods.milestoneStepBonus)
  const synJob = SYNERGY_JOB_FOR_BUSINESS[biz.id]
  const synOwned = synJob ? (input.jobsPurchased[synJob.id] ?? 0) : 0
  const synMult = 1 + 0.01 * synOwned
  const classMult = 1 + 0.15 * input.classLevel
  return (
    biz.moneyPerSecond * mMult * synMult * classMult * legacyMultiplier(input.legacyPoints, mods.legacyScale) *
    input.businessBuffMultiplier * mods.businessMult * (mods.sectorBusinessMult[biz.sector] ?? 1)
  )
}

export function computeClickIncome(input: EconomySnapshotInput, includeHustle: boolean): number {
  let raw = BASE_CLICK_VALUE
  for (const job of JOBS) {
    const n = input.jobsPurchased[job.id] ?? 0
    if (n > 0) {
      raw += job.moneyPerClick * milestoneMultiplier(n, job.scaleFactor, input.deregulationRank, modsOf(input).milestoneStepBonus) * n
    }
  }
  const classMult = 1 + 0.15 * input.classLevel
  const mods = modsOf(input)
  const baseClick = raw * classMult * legacyMultiplier(input.legacyPoints, mods.legacyScale) * input.clickBuffMultiplier * mods.clickMult
  return includeHustle ? baseClick * input.hustleMultiplier : baseClick
}

export interface IncomeBreakdown {
  business: number
  interns: number
}

export function computePassivePerSecond(input: EconomySnapshotInput): number {
  const { business, interns } = computeIncomeBreakdown(input)
  return business + interns
}

export function computeIncomeBreakdown(input: EconomySnapshotInput): IncomeBreakdown {
  const mods = modsOf(input)
  let rawBusinesses = 0
  for (const biz of BUSINESSES) {
    const n = input.businessesOwned[biz.id] ?? 0
    if (n > 0) {
      const synJob = SYNERGY_JOB_FOR_BUSINESS[biz.id]
      const synOwned = synJob ? (input.jobsPurchased[synJob.id] ?? 0) : 0
      rawBusinesses +=
        biz.moneyPerSecond *
        milestoneMultiplier(n, biz.scaleFactor, input.deregulationRank, mods.milestoneStepBonus) *
        (1 + 0.01 * synOwned) *
        n *
        (mods.sectorBusinessMult[biz.sector] ?? 1)
    }
  }
  const classMult = 1 + 0.15 * input.classLevel
  const bizIncome =
    rawBusinesses * classMult * legacyMultiplier(input.legacyPoints, mods.legacyScale) * input.businessBuffMultiplier * mods.businessMult
  const autoClickIncome = input.autoClickers * computeClickIncome(input, true)
  return { business: bizIncome, interns: autoClickIncome }
}

export interface IncomeDeltaQuote {
  deltaPerSec: number
  deltaPerClick: number
}

export function quoteIncomeDelta(
  kind: ItemKind,
  id: string,
  count: number,
  input: EconomySnapshotInput
): IncomeDeltaQuote {
  if (count <= 0) {
    return { deltaPerSec: 0, deltaPerClick: 0 }
  }
  if (kind === 'businesses') {
    const nextOwned = (input.businessesOwned[id] ?? 0) + count
    const nextInput: EconomySnapshotInput = {
      ...input,
      businessesOwned: { ...input.businessesOwned, [id]: nextOwned }
    }
    return {
      deltaPerSec: Math.max(0, computePassivePerSecond(nextInput) - computePassivePerSecond(input)),
      deltaPerClick: 0
    }
  }
  const nextOwned = (input.jobsPurchased[id] ?? 0) + count
  const nextInput: EconomySnapshotInput = {
    ...input,
    jobsPurchased: { ...input.jobsPurchased, [id]: nextOwned }
  }
  return {
    deltaPerSec: Math.max(0, computePassivePerSecond(nextInput) - computePassivePerSecond(input)),
    deltaPerClick: Math.max(0, computeClickIncome(nextInput, true) - computeClickIncome(input, true))
  }
}

export interface OfflineCatchUpResult {
  secondsCredited: number
  efficiency: number
  moneyEarned: number
}

export function computeOfflineCatchUp(
  elapsedMs: number,
  passivePerSecond: number,
  offshoreRank: number
): OfflineCatchUpResult | null {
  if (elapsedMs < 60_000 || passivePerSecond <= 0) {
    return null
  }
  const maxSeconds = (24 + 12 * offshoreRank) * 3600
  const secondsCredited = Math.min(elapsedMs / 1000, maxSeconds)
  const efficiency = Math.min(1, 0.5 + 0.1 * offshoreRank)
  const moneyEarned = passivePerSecond * secondsCredited * efficiency
  return { secondsCredited, efficiency, moneyEarned }
}

export interface SectorSlice {
  id: string
  label: string
  perSec: number
  pct: number
  color: string
}

const SECTOR_PALETTE: ReadonlyArray<string> = [
  '#a5c956',
  '#b366ff',
  '#38bdf8',
  '#f59e0b',
  '#fb7185',
  '#94a3b8'
]

export function computeSectorSlices(
  input: EconomySnapshotInput,
  manualClickPerSec: number
): SectorSlice[] {
  const rawEntries: Array<{ id: string; label: string; perSec: number }> = []

  for (const biz of BUSINESSES) {
    const owned = input.businessesOwned[biz.id] ?? 0
    if (owned > 0) {
      const perSec = businessUnitPerSecond(biz, owned, input) * owned
      if (perSec > 0) {
        rawEntries.push({ id: `biz-${biz.id}`, label: biz.label, perSec })
      }
    }
  }

  if (input.autoClickers > 0) {
    const internPerSec = input.autoClickers * computeClickIncome(input, true)
    if (internPerSec > 0) {
      rawEntries.push({ id: 'interns', label: 'Unpaid Interns', perSec: internPerSec })
    }
  }

  if (manualClickPerSec > 0) {
    rawEntries.push({ id: 'manual', label: 'Manual Hustle', perSec: manualClickPerSec })
  }

  const total = rawEntries.reduce((acc, e) => acc + e.perSec, 0)
  if (total <= 0) {
    return []
  }

  rawEntries.sort((a, b) => b.perSec - a.perSec)
  const top = rawEntries.slice(0, 5)
  const rest = rawEntries.slice(5)
  if (rest.length > 0) {
    const otherPerSec = rest.reduce((acc, e) => acc + e.perSec, 0)
    top.push({ id: 'other', label: 'Other Ventures', perSec: otherPerSec })
  }

  return top.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    perSec: entry.perSec,
    pct: (entry.perSec / total) * 100,
    color: SECTOR_PALETTE[index % SECTOR_PALETTE.length]
  }))
}
