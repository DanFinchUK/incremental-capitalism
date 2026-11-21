import { SOCIAL_CLASSES } from '../data/classes'
import { EMPTY_PERKS, LEGACY_PERKS, perkSpend, type PerkId, type PerkRanks } from '../data/perks'
import type { BulkBuyMode } from './economy'
import { emptySplits } from './splits'
import { DUKE_TITLES } from './peerage'
import { INHERITED_BY_ID, TRAITS_BY_ID, type Heir } from '../data/heirs'
import { ADVISORS_BY_ID } from '../data/advisors'
import { ACHIEVEMENTS_BY_ID, EMPTY_PROGRESS, type AchievementProgress } from '../data/achievements'
import type { AdvisorInstance } from './office'
import { MAX_TREE_ENTRIES, currentBloodlineRecords, readGenerationRecord, type GenerationRecord } from './family'
import type { OfficeState } from '../stores/modules/office'
import { ROOMS, type RoomId } from '../data/rooms'
import { readScenarioId, type ScenarioId } from '../data/scenarios'
import { FAVOUR_EVENTS_BY_ID, emptyFavours, type FavourState } from '../data/favours'
import type { BossTracker } from './bosses'
import { readUiParts, type UiPart } from './uiParts'

// The first seat's save; each family's own is activeKey('state') (data/saveSlots.ts)
export const STORAGE_KEY = 'state'
// Saves from any earlier schema reset to a new game.
// 8: Legacy became one point per gate past the bloodline's best, at 1 Legacy a
// perk rank. A schema 7 save is converted: Legacy becomes the bloodline's
// deepest gate and perks are refunded.
export const SCHEMA_VERSION = 8

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
  familySurname: string
  heir: Heir | null
  heirChoices: Heir[]
  // The current head took over from a sibling who abdicated this generation
  abdicated: boolean
  generation: number
  office: OfficeState
  familyTree: GenerationRecord[]
  achievements: string[]
  titles: number
  achievementProgress: AchievementProgress
  bulkBuyMode: BulkBuyMode
  // Each list's buyer, stood down or not
  buyersPaused: { jobs: boolean; businesses: boolean }
  compactAutoBuy: boolean
  // The room the family lives in: its current class's ('auto'), or one it has reached before
  decor: RoomId | 'auto'
  // The highest class any family has reached, in any dynasty: its rooms stay open
  roomsReached: number
  // Accessibility: play without tapping (no Get paid; an allowance instead)
  noTap: boolean
  muted: boolean
  introSeen: boolean
  tradingDeskCollapsed: boolean
  // Parts of the screen shown so far (engine/uiParts.ts)
  uiShown: UiPart[]
  // Old School Tie: favours this generation
  favours: FavourState
  // Active play time since the dynasty began, every line and generation
  dynastyMs: number
  // The family reached Duke: the dynasty is over and the finale stays up
  dynastyComplete: boolean
  // The rule the dynasty is played under
  scenario: ScenarioId
  // A boss fight under way, so a reload carries on with it (never a quiet
  // look), and the wait after backing out of one. Both run on active play
  // time, so the clock stood still while the page was away.
  bossFight: BossTracker | null
  bossCooldownUntilMs: number
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
    familySurname: '',
    heir: null,
    heirChoices: [],
    abdicated: false,
    generation: 1,
    office: { seats: [], paChairs: [], offer: [], queued: 0 },
    familyTree: [],
    achievements: [],
    titles: 0,
    achievementProgress: { ...EMPTY_PROGRESS },
    bulkBuyMode: 1,
    buyersPaused: { jobs: false, businesses: false },
    compactAutoBuy: false,
    decor: 'auto',
    roomsReached: 0,
    noTap: false,
    muted: false,
    introSeen: false,
    tradingDeskCollapsed: false,
    uiShown: [],
    favours: emptyFavours(),
    dynastyMs: 0,
    dynastyComplete: false,
    scenario: 'standard',
    bossFight: null,
    bossCooldownUntilMs: 0,
    lastUpdate: null
  }
}

// Older saves paused all automation with one switch
function readBuyersPaused(raw: unknown, oldPaused: unknown): { jobs: boolean; businesses: boolean } {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return { jobs: Boolean(r.jobs), businesses: Boolean(r.businesses) }
  }
  return { jobs: Boolean(oldPaused), businesses: Boolean(oldPaused) }
}

function readFavours(raw: unknown): FavourState {
  const state = emptyFavours()
  if (!raw || typeof raw !== 'object') return state
  const r = raw as Record<string, unknown>
  state.used = Math.floor(readNonNegativeNumber(r.used, 0))
  if (Array.isArray(r.active)) {
    for (const e of r.active) {
      if (!e || typeof e !== 'object') continue
      const o = e as Record<string, unknown>
      if (typeof o.id === 'string' && FAVOUR_EVENTS_BY_ID[o.id] && typeof o.untilMs === 'number' && Number.isFinite(o.untilMs)) {
        state.active.push({ id: o.id, untilMs: o.untilMs })
      }
    }
  }
  if (Array.isArray(r.offer)) {
    state.offer = r.offer.filter((id): id is string => typeof id === 'string' && !!FAVOUR_EVENTS_BY_ID[id]).slice(0, 5)
  }
  return state
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

function readProgress(raw: unknown): AchievementProgress {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    legendaryClaims: Math.floor(readNonNegativeNumber(p.legendaryClaims, 0)),
    fires: Math.floor(readNonNegativeNumber(p.fires, 0)),
    scandals: Math.floor(readNonNegativeNumber(p.scandals, 0))
  }
}

function readAdvisor(raw: unknown): AdvisorInstance | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (typeof a.uid !== 'string' || typeof a.advisorId !== 'string' || !ADVISORS_BY_ID[a.advisorId]) return null
  return {
    uid: a.uid,
    advisorId: a.advisorId,
    servedGenerations: Math.floor(readNonNegativeNumber(a.servedGenerations, 0)),
    campaignMs: readNonNegativeNumber(a.campaignMs, 0)
  }
}

function readOffice(raw: unknown): OfficeState {
  if (!raw || typeof raw !== 'object') return { seats: [], paChairs: [], offer: [], queued: 0 }
  const o = raw as Record<string, unknown>
  // Older saves had a single PA chair
  const chairsRaw = Array.isArray(o.paChairs) ? o.paChairs.slice(0, 12) : [o.paChair]
  // Each advisor exists once: drop repeated uids and any seat copy of a PA
  const seen = new Set<string>()
  const paChairs = chairsRaw.map(readAdvisor).map((a) => {
    if (!a || seen.has(a.uid)) return null
    seen.add(a.uid)
    return a
  })
  const seats = (Array.isArray(o.seats) ? o.seats.slice(0, 8).map(readAdvisor) : []).map((a) => {
    if (!a || seen.has(a.uid)) return null
    seen.add(a.uid)
    return a
  })
  return {
    seats,
    paChairs,
    offer: Array.isArray(o.offer) ? o.offer.filter((id): id is string => typeof id === 'string' && !!ADVISORS_BY_ID[id]).slice(0, 3) : [],
    queued: typeof o.queued === 'number' && Number.isFinite(o.queued) ? Math.min(9, Math.max(0, Math.floor(o.queued))) : 0,
    waiting: typeof o.waiting === 'number' && Number.isFinite(o.waiting) ? Math.min(9, Math.max(0, Math.floor(o.waiting))) : 0,
    optional: o.optional === true,
    parked: Array.isArray(o.parked) ? o.parked.filter((id): id is string => typeof id === 'string' && !!ADVISORS_BY_ID[id]).slice(0, 3) : []
  }
}

function readHeir(raw: unknown): Heir | null {
  if (!raw || typeof raw !== 'object') return null
  const h = raw as Record<string, unknown>
  if (typeof h.name !== 'string') return null
  const traitId = typeof h.traitId === 'string' && TRAITS_BY_ID[h.traitId] ? h.traitId : null
  const inheritId = typeof h.inheritId === 'string' && INHERITED_BY_ID[h.inheritId] ? h.inheritId : null
  return { name: h.name, traitId, inheritId }
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

// A saved fight, if it's whole: anything malformed is dropped, which only
// means the fight has to be started again
function readBossFight(raw: unknown): BossTracker | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  if (!num(r.gate) || !Number.isInteger(r.gate) || r.gate < 1 || r.gate >= SOCIAL_CLASSES.length) return null
  const fields = ['startedActiveMs', 'clickEarningsAtFullHustle', 'earnedAfterTax', 'polish', 'purchases', 'startNetWorth', 'timeMult'] as const
  if (!fields.every((f) => num(r[f])) || (r.timeMult as number) <= 0) return null
  return {
    gate: r.gate,
    startedActiveMs: r.startedActiveMs as number,
    clickEarningsAtFullHustle: r.clickEarningsAtFullHustle as number,
    earnedAfterTax: r.earnedAfterTax as number,
    polish: r.polish as number,
    purchases: r.purchases as number,
    startNetWorth: r.startNetWorth as number,
    countsGain: r.countsGain === true,
    timeMult: r.timeMult as number,
    ...(num(r.ownPurchases) ? { ownPurchases: r.ownPurchases } : {})
  }
}

function readNonNegativeNumber(val: unknown, fallback = 0): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : fallback
}

export function parseBulkMode(raw: unknown): BulkBuyMode {
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
  if (envelope.schemaVersion !== SCHEMA_VERSION && envelope.schemaVersion !== 7) {
    return initial
  }
  const fromSchema7 = envelope.schemaVersion === 7
  const sceneRaw = envelope.scene
  if (!sceneRaw || typeof sceneRaw !== 'object') {
    return initial
  }
  const s = sceneRaw as Record<string, unknown>

  const money = readNonNegativeNumber(s.money, 0)
  const jobsPurchased = readNumberMap(s.jobsPurchased)
  const businessesOwned = readNumberMap(s.businessesOwned)
  const familyTree: GenerationRecord[] = Array.isArray(s.familyTree)
    ? s.familyTree.map(readGenerationRecord).filter((r): r is GenerationRecord => r !== null).slice(-MAX_TREE_ENTRIES)
    : []
  const bloodlineBest = currentBloodlineRecords(familyTree).reduce((max, r) => Math.max(max, r.deepestGate), 0)
  const titles = Math.floor(readNonNegativeNumber(s.titles, 0))
  const savedLegacy = fromSchema7 ? bloodlineBest : Math.floor(readNonNegativeNumber(s.legacyPoints, 0))
  const legacyPoints = savedLegacy

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
  if (!fromSchema7 && s.perks && typeof s.perks === 'object') {
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
    familySurname: typeof s.familySurname === 'string' ? s.familySurname : '',
    heir: readHeir(s.heir),
    heirChoices: Array.isArray(s.heirChoices) ? s.heirChoices.map(readHeir).filter((h): h is Heir => h !== null) : [],
    abdicated: s.abdicated === true,
    generation: Math.max(1, Math.floor(readNonNegativeNumber(s.generation, 1))),
    office: readOffice(s.office),
    achievements: Array.isArray(s.achievements)
      ? [...new Set(s.achievements.filter((id): id is string => typeof id === 'string' && !!ACHIEVEMENTS_BY_ID[id]))]
      : [],
    achievementProgress: readProgress(s.achievementProgress),
    titles,
    familyTree,
    gatesBeaten: Math.min(maxClassIdx, Math.floor(readNonNegativeNumber(s.gatesBeaten, 0))),
    bulkBuyMode: parseBulkMode(s.bulkBuyMode),
    buyersPaused: readBuyersPaused(s.buyersPaused, s.autoBuyPaused),
    compactAutoBuy: Boolean(s.compactAutoBuy),
    decor: ROOMS.some((r) => r.id === s.decor) ? (s.decor as RoomId) : 'auto',
    roomsReached: Math.max(highestClassReached, Math.min(maxClassIdx, Math.floor(readNonNegativeNumber(s.roomsReached, 0)))),
    noTap: s.noTap === true,
    muted: Boolean(s.muted),
    introSeen: Boolean(s.introSeen),
    tradingDeskCollapsed: Boolean(s.tradingDeskCollapsed),
    uiShown: readUiParts(s.uiShown),
    favours: readFavours(s.favours),
    // Older saves: every generation recorded, plus the one under way
    dynastyMs: typeof s.dynastyMs === 'number' && Number.isFinite(s.dynastyMs) && s.dynastyMs >= 0
      ? s.dynastyMs
      : familyTree.reduce((a, r) => a + r.activeMs, 0) + readNonNegativeNumber(s.activeGenerationMs, 0),
    // A family already at Duke when the dukedom became the end has finished
    dynastyComplete: s.dynastyComplete === true || titles >= DUKE_TITLES,
    scenario: readScenarioId(s.scenario),
    bossFight: readBossFight(s.bossFight),
    bossCooldownUntilMs: readNonNegativeNumber(s.bossCooldownUntilMs, 0),
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
