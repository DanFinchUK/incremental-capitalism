import { BUSINESSES, JOBS } from '../data/items'
import { EMPTY_PERKS, type PerkId, type PerkRanks } from '../data/perks'
import { FIRST_LEGACY_LIFETIME, seriesCost, type BulkBuyMode } from './economy'

export const STORAGE_KEY = 'state'
const LEGACY_V1_THRESHOLD = 2.17e11

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
  bulkBuyMode: BulkBuyMode
  muted: boolean
  tradingDeskCollapsed: boolean
  lastUpdate: number | null
}

export interface PersistedEnvelope {
  schemaVersion: 2
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
    bulkBuyMode: 1,
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
  const isV2 = envelope.schemaVersion === 2
  const sceneRaw = envelope.scene
  if (!sceneRaw || typeof sceneRaw !== 'object') {
    return initial
  }
  const s = sceneRaw as Record<string, unknown>

  const jobsPurchased = readNumberMap(s.jobsPurchased)
  const businessesOwned = readNumberMap(s.businessesOwned)
  const legacyPoints = Math.floor(readNonNegativeNumber(s.legacyPoints, 0))
  const legacySpent = Math.min(legacyPoints, Math.floor(readNonNegativeNumber(s.legacySpent, 0)))

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
  if (isV2 && s.perks && typeof s.perks === 'object') {
    const pRaw = s.perks as Record<string, unknown>
    for (const key of Object.keys(EMPTY_PERKS) as PerkId[]) {
      perks[key] = Math.floor(readNonNegativeNumber(pRaw[key], 0))
    }
  } else {
    perks.autoClicker = Math.floor(readNonNegativeNumber(s.autoClickers, 0))
  }

  const spentThisRun =
    isV2 && typeof s.spentThisRun === 'number'
      ? readNonNegativeNumber(s.spentThisRun, 0)
      : computeHistoricalRunSpent(jobsPurchased, businessesOwned)

  const minLifetimeForLegacy = FIRST_LEGACY_LIFETIME * legacyPoints * legacyPoints
  let lifetimeEarned = readNonNegativeNumber(s.lifetimeEarned, 0)
  if (!isV2) {
    if (legacyPoints > 0 && lifetimeEarned > 0 && lifetimeEarned < minLifetimeForLegacy) {
      lifetimeEarned = lifetimeEarned * (FIRST_LEGACY_LIFETIME / LEGACY_V1_THRESHOLD)
    }
    lifetimeEarned = Math.max(lifetimeEarned, minLifetimeForLegacy)
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

  const lastUpdate =
    typeof s.lastUpdate === 'number' && Number.isFinite(s.lastUpdate) && s.lastUpdate > 0
      ? s.lastUpdate
      : null

  return {
    money: readNonNegativeNumber(s.money, 0),
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
    bulkBuyMode: parseBulkMode(s.bulkBuyMode),
    muted: Boolean(s.muted),
    tradingDeskCollapsed: Boolean(s.tradingDeskCollapsed),
    lastUpdate
  }
}

export function serializeState(scene: PersistedSceneState): string {
  const envelope: PersistedEnvelope = {
    schemaVersion: 2,
    scene
  }
  return JSON.stringify(envelope)
}
