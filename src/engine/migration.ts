import { SOCIAL_CLASSES } from '../data/classes'
import { EMPTY_PERKS, LEGACY_PERKS, perkSpend, type PerkId, type PerkRanks } from '../data/perks'
import type { BulkBuyMode } from './economy'
import { emptySplits } from './splits'

export const STORAGE_KEY = 'state'
// Saves from any earlier schema reset to a new game.
export const SCHEMA_VERSION = 7

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
  gatesBeaten: number
  activeGenerationMs: number
  splits: (number | null)[]
  bestSplits: (number | null)[]
  lastKillMs: (number | null)[]
  bestKillMs: (number | null)[]
  bulkBuyMode: BulkBuyMode
  autoBuyPaused: boolean
  compactAutoBuy: boolean
  muted: boolean
  introSeen: boolean
  tradingDeskCollapsed: boolean
  lastUpdate: number | null
}

export interface PersistedEnvelope {
  schemaVersion: typeof SCHEMA_VERSION
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
    gatesBeaten: 0,
    activeGenerationMs: 0,
    splits: emptySplits(),
    bestSplits: emptySplits(),
    lastKillMs: emptySplits(),
    bestKillMs: emptySplits(),
    bulkBuyMode: 1,
    autoBuyPaused: false,
    compactAutoBuy: false,
    muted: false,
    introSeen: false,
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

function readSplits(raw: unknown): (number | null)[] {
  const result = emptySplits()
  if (Array.isArray(raw)) {
    for (let i = 0; i < result.length; i++) {
      const v = raw[i]
      result[i] = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null
    }
  }
  return result
}

function readNonNegativeNumber(val: unknown, fallback = 0): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : fallback
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
  if (envelope.schemaVersion !== SCHEMA_VERSION) {
    return initial
  }
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
  if (s.perks && typeof s.perks === 'object') {
    const pRaw = s.perks as Record<string, unknown>
    for (const key of Object.keys(EMPTY_PERKS) as PerkId[]) {
      perks[key] = Math.floor(readNonNegativeNumber(pRaw[key], 0))
    }
  }
  for (const perk of LEGACY_PERKS) {
    if (perk.maxRank !== null) {
      perks[perk.id] = Math.min(perk.maxRank, perks[perk.id])
    }
  }
  // Recomputed from owned ranks so perk price changes refund (or never
  // overcharge) existing saves.
  const legacySpent = Math.min(legacyPoints, perkSpend(perks))

  const spentThisRun = readNonNegativeNumber(s.spentThisRun, 0)
  const lifetimeEarned = Math.max(readNonNegativeNumber(s.lifetimeEarned, 0), money + spentThisRun)

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

  const maxClassIdx = SOCIAL_CLASSES.length - 1
  const highestClassReached =
    typeof s.highestClassReached === 'number' && Number.isFinite(s.highestClassReached)
      ? Math.min(maxClassIdx, Math.max(0, Math.floor(s.highestClassReached)))
      : 0

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
    activeGenerationMs: readNonNegativeNumber(s.activeGenerationMs, 0),
    splits: readSplits(s.splits),
    bestSplits: readSplits(s.bestSplits),
    lastKillMs: readSplits(s.lastKillMs),
    bestKillMs: readSplits(s.bestKillMs),
    gatesBeaten: Math.min(maxClassIdx, Math.floor(readNonNegativeNumber(s.gatesBeaten, 0))),
    bulkBuyMode: parseBulkMode(s.bulkBuyMode),
    autoBuyPaused: Boolean(s.autoBuyPaused),
    compactAutoBuy: Boolean(s.compactAutoBuy),
    muted: Boolean(s.muted),
    introSeen: Boolean(s.introSeen),
    tradingDeskCollapsed: Boolean(s.tradingDeskCollapsed),
    lastUpdate
  }
}

export function serializeState(scene: PersistedSceneState): string {
  const envelope: PersistedEnvelope = {
    schemaVersion: SCHEMA_VERSION,
    scene
  }
  return JSON.stringify(envelope)
}
