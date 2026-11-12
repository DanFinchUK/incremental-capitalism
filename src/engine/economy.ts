import { BUSINESSES, JOBS, SYNERGY_JOB_FOR_BUSINESS, type BusinessDef, type ItemKind, type JobDef } from '../data/items'
import { SOCIAL_CLASSES, type SocialClassDef } from '../data/classes'

const MILESTONES_GENTLE: ReadonlyArray<number> = [10, 25, 50, 100, 200]
const MILESTONES_MODERATE: ReadonlyArray<number> = [10, 20, 40, 75, 125]
const MILESTONES_STEEP: ReadonlyArray<number> = [5, 10, 25, 50, 75]
const MILESTONES_ELITE: ReadonlyArray<number> = [3, 5, 10, 20, 35]

export const FIRST_LEGACY_LIFETIME = 5.0e11
export const BASE_CLICK_VALUE = 30

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

export function milestoneMultiplier(owned: number, scaleFactor: number, deregulationRank: number): number {
  const { reachedCount } = milestoneProgress(owned, scaleFactor)
  if (reachedCount === 0) {
    return 1
  }
  const step = 2 + 0.25 * deregulationRank
  return Math.pow(step, reachedCount)
}

export function autoBuyThreshold(kind: ItemKind, scaleFactor: number, nepotismRank: number): number {
  if (kind === 'jobs') {
    return Math.max(5, 10 - 5 * nepotismRank)
  }
  const base = Math.max(10, Math.floor((7.5 / Math.log(scaleFactor)) / 5) * 5)
  return Math.max(5, base - 5 * nepotismRank)
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
  availableMoney: number,
  autoBuyRemaining?: number
): BulkBuyQuote {
  if (mode === 1 || mode === 10) {
    const cost = seriesCost(baseCost, scaleFactor, owned, mode, costDiscount)
    return { count: mode, cost, canAfford: availableMoney >= cost }
  }
  if (mode === 'next') {
    const { nextMilestone } = milestoneProgress(owned, scaleFactor)
    const candidates: number[] = []
    if (nextMilestone !== null && nextMilestone > owned) {
      candidates.push(nextMilestone - owned)
    }
    if (autoBuyRemaining !== undefined && autoBuyRemaining > 0) {
      candidates.push(autoBuyRemaining)
    }
    const count = candidates.length > 0 ? Math.min(...candidates) : 1
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

export function socialClassInfo(netWorth: number): SocialClassStatus {
  let level = 0
  for (let i = 1; i < SOCIAL_CLASSES.length; i++) {
    if (netWorth > SOCIAL_CLASSES[i].threshold) {
      level = i
    }
  }
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

export function legacyMultiplier(legacyPoints: number): number {
  return 1 + 0.25 * legacyPoints
}

export function computeLegacyGain(lifetimeEarned: number, legacyPoints: number): number {
  const totalEarnedPoints = Math.floor(Math.sqrt(Math.max(0, lifetimeEarned) / FIRST_LEGACY_LIFETIME))
  return Math.max(0, totalEarnedPoints - legacyPoints)
}

export function nextLegacyLifetimeThreshold(legacyPoints: number): number {
  return FIRST_LEGACY_LIFETIME * Math.pow(legacyPoints + 1, 2)
}

export interface LegacyBracketProgress {
  pendingGain: number
  currentFloor: number
  nextThreshold: number
  progress: number
}

export function computeLegacyBracket(lifetimeEarned: number, legacyPoints: number): LegacyBracketProgress {
  const safeLifetime = Math.max(0, lifetimeEarned)
  const pendingGain = computeLegacyGain(safeLifetime, legacyPoints)
  const totalPointsReached = legacyPoints + pendingGain
  const currentFloor = FIRST_LEGACY_LIFETIME * totalPointsReached * totalPointsReached
  const nextThreshold = FIRST_LEGACY_LIFETIME * Math.pow(totalPointsReached + 1, 2)
  const span = Math.max(1, nextThreshold - currentFloor)
  const progress = Math.min(1, Math.max(0, (safeLifetime - currentFloor) / span))
  return { pendingGain, currentFloor, nextThreshold, progress }
}

export function trustFundStartingCash(rank: number): number {
  if (rank <= 0) {
    return 0
  }
  return 25_000 * Math.pow(5, rank - 1)
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
}

export function jobUnitClickIncome(job: JobDef, owned: number, input: EconomySnapshotInput): number {
  const mMult = milestoneMultiplier(Math.max(1, owned), job.scaleFactor, input.deregulationRank)
  const classMult = 1 + 0.15 * input.classLevel
  return job.moneyPerClick * mMult * classMult * legacyMultiplier(input.legacyPoints) * input.clickBuffMultiplier
}

export function businessUnitPerSecond(biz: BusinessDef, owned: number, input: EconomySnapshotInput): number {
  const mMult = milestoneMultiplier(Math.max(1, owned), biz.scaleFactor, input.deregulationRank)
  const synJob = SYNERGY_JOB_FOR_BUSINESS[biz.id]
  const synOwned = synJob ? (input.jobsPurchased[synJob.id] ?? 0) : 0
  const synMult = 1 + 0.01 * synOwned
  const classMult = 1 + 0.15 * input.classLevel
  return biz.moneyPerSecond * mMult * synMult * classMult * legacyMultiplier(input.legacyPoints) * input.businessBuffMultiplier
}

export function computeClickIncome(input: EconomySnapshotInput, includeHustle: boolean): number {
  let raw = BASE_CLICK_VALUE
  for (const job of JOBS) {
    const n = input.jobsPurchased[job.id] ?? 0
    if (n > 0) {
      raw += job.moneyPerClick * milestoneMultiplier(n, job.scaleFactor, input.deregulationRank) * n
    }
  }
  const classMult = 1 + 0.15 * input.classLevel
  const baseClick = raw * classMult * legacyMultiplier(input.legacyPoints) * input.clickBuffMultiplier
  return includeHustle ? baseClick * input.hustleMultiplier : baseClick
}

export function computePassivePerSecond(input: EconomySnapshotInput): number {
  let rawBusinesses = 0
  for (const biz of BUSINESSES) {
    const n = input.businessesOwned[biz.id] ?? 0
    if (n > 0) {
      const synJob = SYNERGY_JOB_FOR_BUSINESS[biz.id]
      const synOwned = synJob ? (input.jobsPurchased[synJob.id] ?? 0) : 0
      rawBusinesses += biz.moneyPerSecond * milestoneMultiplier(n, biz.scaleFactor, input.deregulationRank) * (1 + 0.01 * synOwned) * n
    }
  }
  const classMult = 1 + 0.15 * input.classLevel
  const bizIncome =
    rawBusinesses * classMult * legacyMultiplier(input.legacyPoints) * input.businessBuffMultiplier
  const autoClickIncome = input.autoClickers * computeClickIncome(input, false)
  return bizIncome + autoClickIncome
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

export interface AutoBuySelectionInput extends EconomySnapshotInput {
  lifetimePurchases: {
    jobs: Readonly<Record<string, number>>
    businesses: Readonly<Record<string, number>>
  }
  autoBuyDisabled: {
    jobs: Readonly<Record<string, boolean>>
    businesses: Readonly<Record<string, boolean>>
  }
  nepotismRank: number
}

export interface AutoBuyTarget {
  kind: ItemKind
  id: string
  cost: number
}

export function isItemAutoBuyUnlocked(
  kind: ItemKind,
  id: string,
  scaleFactor: number,
  lifetimePurchases: AutoBuySelectionInput['lifetimePurchases'],
  nepotismRank: number,
  legacyPoints: number
): boolean {
  if (kind === 'businesses' && legacyPoints < 1) {
    return false
  }
  const count = lifetimePurchases[kind][id] ?? 0
  return count >= autoBuyThreshold(kind, scaleFactor, nepotismRank)
}

export function isItemAutoBuyActive(
  kind: ItemKind,
  id: string,
  scaleFactor: number,
  input: AutoBuySelectionInput
): boolean {
  if (kind === 'jobs' && input.autoClickers < 1) {
    return false
  }
  if (input.autoBuyDisabled[kind][id]) {
    return false
  }
  return isItemAutoBuyUnlocked(kind, id, scaleFactor, input.lifetimePurchases, input.nepotismRank, input.legacyPoints)
}

export function selectAutoBuyTarget(input: AutoBuySelectionInput): AutoBuyTarget | null {
  const costDiscount = 1 - 0.02 * input.classLevel
  const baselinePassive = computePassivePerSecond(input)
  let best: AutoBuyTarget | null = null
  let bestScore = 0

  for (const job of JOBS) {
    if (!isItemAutoBuyActive('jobs', job.id, job.scaleFactor, input)) {
      continue
    }
    const currentOwned = input.jobsPurchased[job.id] ?? 0
    const nextCost = seriesCost(job.baseCost, job.scaleFactor, currentOwned, 1, costDiscount)
    const nextPassive = computePassivePerSecond({
      ...input,
      jobsPurchased: { ...input.jobsPurchased, [job.id]: currentOwned + 1 }
    })
    const score = (nextPassive - baselinePassive) / nextCost
    if (score > bestScore) {
      bestScore = score
      best = { kind: 'jobs', id: job.id, cost: nextCost }
    }
  }

  for (const biz of BUSINESSES) {
    if (!isItemAutoBuyActive('businesses', biz.id, biz.scaleFactor, input)) {
      continue
    }
    const currentOwned = input.businessesOwned[biz.id] ?? 0
    const nextCost = seriesCost(biz.baseCost, biz.scaleFactor, currentOwned, 1, costDiscount)
    const nextPassive = computePassivePerSecond({
      ...input,
      businessesOwned: { ...input.businessesOwned, [biz.id]: currentOwned + 1 }
    })
    const score = (nextPassive - baselinePassive) / nextCost
    if (score > bestScore) {
      bestScore = score
      best = { kind: 'businesses', id: biz.id, cost: nextCost }
    }
  }

  return best
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
    const internPerSec = input.autoClickers * computeClickIncome(input, false)
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
