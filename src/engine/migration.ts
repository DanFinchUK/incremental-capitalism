import { SOCIAL_CLASSES } from '../data/classes'
import { BUSINESSES, JOBS } from '../data/items'
import { EMPTY_PERKS, LEGACY_PERKS, perkSpend, type PerkId, type PerkRanks } from '../data/perks'
import {
  FIRST_LEGACY_LIFETIME,
  legacyLifetimeThreshold,
  seriesCost,
  socialClassInfo,
  type BulkBuyMode
} from './economy'

export const STORAGE_KEY = 'state'
const LEGACY_V1_THRESHOLD = 2.17e11
const LEGACY_V2_THRESHOLD = 3.0e12
const LEGACY_V3_THRESHOLD = 5.0e11

export interface PersistedSceneState {
  money: number
  spentThisRun: number
  jobsPurchased: Record<string, number>
  businessesOwned: Record<string, number>
  legacyPoints: number
  legacySpent: number
  perks: PerkRanks
  lifetimePurchases: {
    jobs: Record<string, number>
    businesses: Record<string, number>
  }
  autoBuyDisabled: {
    jobs: Record<string, boolean>
    businesses: Record<string, boolean>
  }
  seenItems: {
    jobs: Record<string, boolean>
    businesses: Record<string, boolean>
  }
  lifetimeEarned: number
  highestClassReached: number
  bulkBuyMode: BulkBuyMode
  autoBuyPaused: boolean
  compactAutoBuy: boolean
  muted: boolean
  tradingDeskCollapsed: boolean
  lastUpdate: number | null
}

export interface PersistedEnvelope {
  schemaVersion: 6
  scene: PersistedSceneState
}

export function createInitialSceneState(): PersistedSceneState {
  return {
    money: 0,
    spentThisRun: 0,
    jobsPurchased: {},
    businessesOwned: {},
    legacyPoints: 0,
    legacySpent: 0,
    perks: { ...EMPTY_PERKS },
    lifetimePurchases: { jobs: {}, businesses: {} },
    autoBuyDisabled: { jobs: {}, businesses: {} },
    seenItems: { jobs: { '1': true }, businesses: { '1': true } },
    lifetimeEarned: 0,
    highestClassReached: 0,
    bulkBuyMode: 1,
    autoBuyPaused: false,
    compactAutoBuy: false,
    muted: false,
    tradingDeskCollapsed: false,
    lastUpdate: null
  }
}

function readNumberMap(raw: unknown): Record<string, number> {
  const result: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') {
    return result
  }
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      result[key] = Math.floor(val)
    }
  }
  return result
}

function readBooleanMap(raw: unknown): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  if (!raw || typeof raw !== 'object') {
    return result
  }
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'boolean') {
      result[key] = val
    }
  }
  return result
}

function readNonNegativeNumber(val: unknown, fallback = 0): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : fallback
}

function computeHistoricalRunSpent(
  jobsPurchased: Readonly<Record<string, number>>,
  businessesOwned: Readonly<Record<string, number>>
): number {
  let total = 0
  for (const job of JOBS) {
    const n = jobsPurchased[job.id] ?? 0
    if (n > 0) {
      total += seriesCost(job.baseCost, job.scaleFactor, 0, n, 1)
    }
  }
  for (const biz of BUSINESSES) {
    const n = businessesOwned[biz.id] ?? 0
    if (n > 0) {
      total += seriesCost(biz.baseCost, biz.scaleFactor, 0, n, 1)
    }
  }
  return total
}

type LegacyCurve = (points: number) => number

function quadraticCurve(base: number): LegacyCurve {
  return (points) => base * points * points
}

function triangularCurve(points: number): number {
  return FIRST_LEGACY_LIFETIME * ((points * (points + 1)) / 2)
}

function cubicCurve(points: number): number {
  return FIRST_LEGACY_LIFETIME * points * points * points
}

// Re-express lifetimeEarned on the current Legacy curve, keeping the same
// number of earned points and the same progress through the current bracket.
function remapLegacyLifetime(rawLifetime: number, legacyPoints: number, oldCurve: LegacyCurve): number {
  let reached = legacyPoints
  if (rawLifetime <= oldCurve(legacyPoints)) {
    return legacyLifetimeThreshold(legacyPoints)
  }
  while (oldCurve(reached + 1) <= rawLifetime) {
    reached += 1
  }
  const oldFloor = oldCurve(reached)
  const oldNext = oldCurve(reached + 1)
  const frac = Math.min(1, Math.max(0, (rawLifetime - oldFloor) / Math.max(1, oldNext - oldFloor)))
  const newFloor = legacyLifetimeThreshold(reached)
  const newNext = legacyLifetimeThreshold(reached + 1)
  return newFloor + frac * (newNext - newFloor)
}

function parseBulkMode(raw: unknown): BulkBuyMode {
  if (raw === 1 || raw === 10 || raw === 'next' || raw === 'max') {
    return raw
  }
  return 1
}

export function parseSavedState(raw: string | null): PersistedSceneState {
  const initial = createInitialSceneState()
  if (!raw) {
    return initial
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return initial
  }

  if (!parsed || typeof parsed !== 'object') {
    return initial
  }

  const envelope = parsed as Record<string, unknown>
  const schemaVersion = typeof envelope.schemaVersion === 'number' ? envelope.schemaVersion : 1
  const isV2Plus = schemaVersion >= 2
  const sceneRaw = envelope.scene
  if (!sceneRaw || typeof sceneRaw !== 'object') {
    return initial
  }
  const s = sceneRaw as Record<string, unknown>

  const money = readNonNegativeNumber(s.money, 0)
  const jobsPurchased = readNumberMap(s.jobsPurchased)
  const businessesOwned = readNumberMap(s.businessesOwned)
  const legacyPoints = Math.floor(readNonNegativeNumber(s.legacyPoints, 0))

  const lpRaw = s.lifetimePurchases && typeof s.lifetimePurchases === 'object'
    ? (s.lifetimePurchases as Record<string, unknown>)
    : {}
  const lifetimeJobs = readNumberMap(lpRaw.jobs)
  const lifetimeBusinesses = readNumberMap(lpRaw.businesses)
  for (const [id, count] of Object.entries(jobsPurchased)) {
    lifetimeJobs[id] = Math.max(lifetimeJobs[id] ?? 0, count)
  }
  for (const [id, count] of Object.entries(businessesOwned)) {
    lifetimeBusinesses[id] = Math.max(lifetimeBusinesses[id] ?? 0, count)
  }

  const abdRaw = s.autoBuyDisabled && typeof s.autoBuyDisabled === 'object'
    ? (s.autoBuyDisabled as Record<string, unknown>)
    : {}
  const autoBuyDisabled = {
    jobs: readBooleanMap(abdRaw.jobs),
    businesses: readBooleanMap(abdRaw.businesses)
  }

  const perks: PerkRanks = { ...EMPTY_PERKS }
  if (isV2Plus && s.perks && typeof s.perks === 'object') {
    const pRaw = s.perks as Record<string, unknown>
    for (const key of Object.keys(EMPTY_PERKS) as PerkId[]) {
      perks[key] = Math.floor(readNonNegativeNumber(pRaw[key], 0))
    }
    const migratedHustle = Math.max(
      readNonNegativeNumber(pRaw.hustleCap, 0),
      readNonNegativeNumber(pRaw.trustFund, 0)
    )
    perks.hustleCap = Math.min(5, Math.floor(migratedHustle))
  } else {
    perks.autoClicker = Math.floor(readNonNegativeNumber(s.autoClickers, 0))
  }
  for (const perk of LEGACY_PERKS) {
    if (perk.maxRank !== null) {
      perks[perk.id] = Math.min(perk.maxRank, perks[perk.id])
    }
  }
  // Recomputed from owned ranks so perk price changes refund (or never
  // overcharge) existing saves.
  const legacySpent = Math.min(legacyPoints, perkSpend(perks))

  const spentThisRun =
    isV2Plus && typeof s.spentThisRun === 'number'
      ? readNonNegativeNumber(s.spentThisRun, 0)
      : computeHistoricalRunSpent(jobsPurchased, businessesOwned)

  const minLifetimeForLegacy = legacyLifetimeThreshold(legacyPoints)
  const rawLifetime = readNonNegativeNumber(s.lifetimeEarned, 0)
  let lifetimeEarned = rawLifetime
  if (schemaVersion === 1) {
    if (legacyPoints > 0 && lifetimeEarned > 0 && lifetimeEarned < minLifetimeForLegacy) {
      lifetimeEarned = lifetimeEarned * (FIRST_LEGACY_LIFETIME / LEGACY_V1_THRESHOLD)
    }
    lifetimeEarned = Math.max(lifetimeEarned, money + spentThisRun, minLifetimeForLegacy)
  } else if (schemaVersion === 2) {
    if (legacyPoints > 0) {
      lifetimeEarned = Math.max(
        minLifetimeForLegacy,
        money + spentThisRun,
        remapLegacyLifetime(rawLifetime, legacyPoints, quadraticCurve(LEGACY_V2_THRESHOLD))
      )
    } else {
      lifetimeEarned = Math.max(lifetimeEarned, money + spentThisRun)
    }
  } else if (schemaVersion === 3) {
    if (legacyPoints > 1) {
      lifetimeEarned = Math.max(
        minLifetimeForLegacy,
        money + spentThisRun,
        remapLegacyLifetime(rawLifetime, legacyPoints, quadraticCurve(LEGACY_V3_THRESHOLD))
      )
    } else if (legacyPoints === 1) {
      // v4 kept 1-Legacy v3 lifetimes as-is on the Triangular curve.
      lifetimeEarned = Math.max(
        minLifetimeForLegacy,
        money + spentThisRun,
        remapLegacyLifetime(rawLifetime, legacyPoints, triangularCurve)
      )
    } else {
      lifetimeEarned = Math.max(lifetimeEarned, money + spentThisRun)
    }
  } else if (schemaVersion === 4) {
    if (legacyPoints > 0) {
      lifetimeEarned = Math.max(
        minLifetimeForLegacy,
        money + spentThisRun,
        remapLegacyLifetime(rawLifetime, legacyPoints, triangularCurve)
      )
    } else {
      lifetimeEarned = Math.max(lifetimeEarned, money + spentThisRun)
    }
  } else if (schemaVersion === 5) {
    if (legacyPoints > 0) {
      lifetimeEarned = Math.max(
        minLifetimeForLegacy,
        money + spentThisRun,
        remapLegacyLifetime(rawLifetime, legacyPoints, cubicCurve)
      )
    } else {
      lifetimeEarned = Math.max(lifetimeEarned, money + spentThisRun)
    }
  } else {
    lifetimeEarned = Math.max(lifetimeEarned, money + spentThisRun, minLifetimeForLegacy)
  }

  const seenRaw = s.seenItems && typeof s.seenItems === 'object'
    ? (s.seenItems as Record<string, unknown>)
    : {}
  const seenJobs: Record<string, boolean> = { '1': true, ...readBooleanMap(seenRaw.jobs) }
  const seenBusinesses: Record<string, boolean> = { '1': true, ...readBooleanMap(seenRaw.businesses) }

  for (const id of Object.keys(lifetimeJobs)) {
    if ((lifetimeJobs[id] ?? 0) > 0) {
      seenJobs[id] = true
    }
  }
  for (const id of Object.keys(lifetimeBusinesses)) {
    if ((lifetimeBusinesses[id] ?? 0) > 0) {
      seenBusinesses[id] = true
    }
  }

  const inferredPeakWorth = Math.max(
    money + spentThisRun,
    legacyPoints > 0 ? FIRST_LEGACY_LIFETIME : 0
  )
  const inferredClass = socialClassInfo(inferredPeakWorth).current.level
  const maxClassIdx = SOCIAL_CLASSES.length - 1
  const savedHighestClass =
    typeof s.highestClassReached === 'number' && Number.isFinite(s.highestClassReached)
      ? Math.min(maxClassIdx, Math.max(0, Math.floor(s.highestClassReached)))
      : 0
  const highestClassReached = Math.max(inferredClass, savedHighestClass)

  const lastUpdate =
    typeof s.lastUpdate === 'number' && Number.isFinite(s.lastUpdate) && s.lastUpdate > 0
      ? s.lastUpdate
      : null

  return {
    money,
    spentThisRun,
    jobsPurchased,
    businessesOwned,
    legacyPoints,
    legacySpent,
    perks,
    lifetimePurchases: {
      jobs: lifetimeJobs,
      businesses: lifetimeBusinesses
    },
    autoBuyDisabled,
    seenItems: {
      jobs: seenJobs,
      businesses: seenBusinesses
    },
    lifetimeEarned,
    highestClassReached,
    bulkBuyMode: parseBulkMode(s.bulkBuyMode),
    autoBuyPaused: Boolean(s.autoBuyPaused),
    compactAutoBuy: Boolean(s.compactAutoBuy),
    muted: Boolean(s.muted),
    tradingDeskCollapsed: Boolean(s.tradingDeskCollapsed),
    lastUpdate
  }
}

export function serializeState(scene: PersistedSceneState): string {
  const envelope: PersistedEnvelope = {
    schemaVersion: 6,
    scene
  }
  return JSON.stringify(envelope)
}
