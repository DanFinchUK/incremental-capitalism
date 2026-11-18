import { forPlaystyle } from '../utils/playstyle'
import type { SfxKind, SfxOptions } from '../engine/audio'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  BUSINESSES,
  BUSINESSES_BY_ID,
  JOBS,
  JOBS_BY_ID,
  type BusinessDef,
  type ItemKind,
  type JobDef
} from '../data/items'
import {
  MARKET_EVENTS_BY_KIND,
  TIP_LABELS,
  pickMarketEvent,
  type MarketEventDef,
  type MarketEventKind,
  type ScandalOutcome
} from '../data/events'
import {
  BUFF_DURATION_PER_INSIDER_RANK,
  EMPTY_PERKS,
  EVENT_INTERVAL_PER_INSIDER_RANK,
  INTERNS_PER_RANK,
  MILESTONE_BASE_STEP,
  MILESTONE_STEP_PER_DEREGULATION_RANK,
  perkNextCost,
  type PerkId,
  type PerkRanks
} from '../data/perks'
import {
  ALLOWANCE_TAPS_PER_SEC,
  bulkBuyQuote,
  computeClickIncome,
  computeIncomeBreakdown,
  heirInheritance,
  computeOfflineCatchUp,
  steadyHustle,
  computePassivePerSecond,
  DOMINANCE_AT,
  dominanceMultiplier,
  computeIncomeSources,
  computeSectorSlices,
  itemMilestones,
  legacyMultiplier as calcLegacyMultiplier,
  maxHustleMultiplier,
  quoteIncomeDelta,
  classInfoForLevel,
  type BulkBuyMode,
  type EconomySnapshotInput,
  type IncomeDeltaQuote,
  type OfflineCatchUpResult
} from '../engine/economy'
import {

  createInitialSceneState,
  parseSavedState,
  serializeState,
  type PersistedSceneState
} from '../engine/migration'
import { SOCIAL_CLASSES } from '../data/classes'
import { LADDER_TRIAL } from '../data/trial'
import { ACTIVE_TUNING, MAX_SAVES, NEXT_SCENARIO_AT_LOAD, activeKey, addSlot, adoptOrphans, claimSeat, noteActiveSummary, readIndex, removeSlot, residentSlot, residentSlotId, setActiveSlot, syncResident, setSlotSummary, slotPrefix, type SaveIndex, type SaveSummary, type Tuning } from '../data/saveSlots'
import { readProfile, writeProfile } from '../engine/profile'
import { reloadPage } from '../utils/reloadPage'
import { awardMultiplier, awardsHeld, awardText, type Award } from '../engine/awards'
import { HALL_KEY, MAX_HALL_ENTRIES, addToHall, parseHall, scenariosOpen, type DynastyRecord } from '../engine/hall'
import { SCENARIOS_BY_ID, readScenarioId, type ScenarioId } from '../data/scenarios'
import {
  createTelemetryState,
  currentManualPerSec,
  currentRealisedPerSec,
  markTelemetryEvent,
  noteCandlePurchase,
  observeBalance,
  recordIncome,
  resetTelemetry,
  sampleTelemetry,
  type IncomeSource,
  type TelemetryState
} from '../engine/telemetry'
import { formatClock, formatCurrency, formatDuration, formatMultiplier } from '../utils/format'
import { bossForGate, conditionTarget, conditionTextFor, itemCostCeiling, legacyForRetiring } from '../engine/bosses'
import { combineModifiers, type ModifierSource } from '../engine/modifiers'
import { generateSurname, heirName, rollHeirChoices, type Heir } from '../data/heirs'
import { createPlayLogModule } from './modules/playLog'
import { loadPlayLog, readPlayLog, withPlayLog } from '../engine/playLog'
import { bestValue, familyBuyers, type BuyOption } from '../engine/buyers'
import { emptySplits, mergeBests, withSplit } from '../engine/splits'
import { createBossModule } from './modules/bosses'
import { createOfficeModule, type HireTarget } from './modules/office'
import {
  MAX_TREE_ENTRIES,
  bloodlineTraitSources,
  currentBloodlineRecords,
  describeBloodlineTraits,
  type GenerationRecord
} from '../engine/family'
import { DUKE_TITLES, heirChoiceCount, peerageRank, titlePaChairs, titleSource, titlesFor } from '../engine/peerage'
import { ACHIEVEMENTS_BY_ID, ACHIEVEMENT_INCOME_BONUS, EMPTY_PROGRESS, type AchievementProgress } from '../data/achievements'
import { paStanding, paTitle, type AdvisorInstance } from '../engine/office'
import { ADVISORS_BY_ID } from '../data/advisors'
import { ROOMS, roomForClass, type RoomDef, type RoomId } from '../data/rooms'
import {
  FAVOUR_EVENTS,
  FAVOUR_EVENTS_BY_ID,
  FAVOUR_EVENT_MS,
  emptyFavours,
  favourEventSource,
  pickEnding,
  pickFavourOffer,
  type FavourState
} from '../data/favours'

export type VisibleRow<T> =
  | { mode: 'revealed'; item: T }
  // A row not yet shown still knows its item, for a favour to lend it
  | { mode: 'teaser'; key: string; item: T }
  | { mode: 'gated'; key: string; bossTitle: string; item: T }

export interface ActiveMarketEvent {
  id: number
  def: MarketEventDef
  expiresAt: number
  xPct: number
  yPct: number
  // A bad bottle during the Champagne Tasting boss
  corked: boolean
}

export type ClaimEventOutcome = 'golden' | 'shadyWin' | 'shadyFreeze' | 'corked' | 'scandal' | null

export interface TimedBuff {
  kind: MarketEventKind
  label: string
  mult: number
  until: number
}

export interface ActiveBuffView {
  kind: MarketEventKind
  label: string
  mult: number
  remainingSec: number
}

// How the family before the new one left the register
export type CensusDeparture = 'duke' | 'abandoned' | 'folded'

export interface CensusEntry {
  previous: string | null
  departure: CensusDeparture | null
}

export interface DisgraceReport {
  familySurname: string
  heirName: string
  generation: number
  gate: number
  bossTitle: string
  disgraceText: string
  deepestGate: number
  legacyLost: number
}

const SAVE_THROTTLE_MS = 2000
// How often a gate that wasn't waved through gets another look. A look is
// out of sight and changes nothing, so it can come round often: a new heir
// is waved through soon after their first purchases.
const PROBE_EVERY_MS = 5_000
const AUTO_BUY_COOLDOWN_MS = 1000
// Income multiplier while a freeze lands on a family with no automation
const FREEZE_INCOME_MULT = 0.5

function achievementSource(count: number): ModifierSource {
  const mult = 1 + ACHIEVEMENT_INCOME_BONUS * count
  return { clickMult: mult, businessMult: mult }
}

export const useGameStore = defineStore('game', () => {
  syncResident()
  const initial = createInitialSceneState()

  const money = ref<number>(initial.money)
  const spentThisRun = ref<number>(initial.spentThisRun)
  const jobsPurchased = ref<Record<string, number>>(initial.jobsPurchased)
  const businessesOwned = ref<Record<string, number>>(initial.businessesOwned)
  const legacyPoints = ref<number>(initial.legacyPoints)
  const legacySpent = ref<number>(initial.legacySpent)
  const perks = ref<PerkRanks>(initial.perks)
  const lifetimePurchases = ref(initial.lifetimePurchases)
  const autoBuyDisabled = ref(initial.autoBuyDisabled)
  const seenItems = ref(initial.seenItems)
  const lifetimeEarned = ref<number>(initial.lifetimeEarned)
  const highestClassReached = ref<number>(initial.highestClassReached)
  const bulkBuyMode = ref<BulkBuyMode>(initial.bulkBuyMode)
  // Each list's buyer can be stood down on its own
  const buyersPaused = ref<{ jobs: boolean; businesses: boolean }>(initial.buyersPaused)
  const compactAutoBuy = ref<boolean>(initial.compactAutoBuy)
  const decor = ref<RoomId | 'auto'>(initial.decor)
  const roomsReached = ref<number>(initial.roomsReached)
  const noTap = ref<boolean>(initial.noTap)
  // Old School Tie: favours called in this generation
  const favours = ref<FavourState>(initial.favours)
  const favoursTotal = computed(() => perks.value.nepotism)
  const favoursLeft = computed(() => Math.max(0, favoursTotal.value - favours.value.used))
  // The national events your favours have arranged, while they run
  const favourSources = computed(() =>
    favours.value.active.flatMap((e) => (FAVOUR_EVENTS_BY_ID[e.id] ? [favourEventSource(FAVOUR_EVENTS_BY_ID[e.id])] : []))
  )
  // Whether the favour dialog is showing; the offer itself is kept until chosen
  const favourDialogOpen = ref(false)
  // Game text, reworded for the allowance when playing without tapping
  function wording(text: string): string {
    return forPlaystyle(text, noTap.value)
  }
  const settingsOpen = ref(false)
  // Sound cues raised by the game, for the page to play; capped so a sim or
  // a page that never plays them can't let it grow
  const sfxQueue = ref<Array<{ kind: SfxKind; options?: SfxOptions }>>([])
  function cue(kind: SfxKind, options?: SfxOptions): void {
    if (sfxQueue.value.length < 8) sfxQueue.value.push({ kind, options })
  }
  const muted = ref<boolean>(initial.muted)
  const introSeen = ref<boolean>(initial.introSeen)
  const introOpen = ref<boolean>(!initial.introSeen)
  const tradingDeskCollapsed = ref<boolean>(initial.tradingDeskCollapsed)
  const lastUpdate = ref<number | null>(initial.lastUpdate)

  // Runtime state
  const nowMs = ref<number>(Date.now())
  const telemetry = ref<TelemetryState>(createTelemetryState(nowMs.value, initial.money))
  const lastTickMs = ref<number | null>(null)
  const lastSavedMs = ref<number>(0)
  const lastAutoBuyAt = ref<number>(0)
  // Items currently shown as automated on their cards (not saved)
  const hustleBonus = ref<number>(0)
  const lastManualClickAt = ref<number>(0)
  const clickBuff = ref<TimedBuff | null>(null)
  // A scandal's lingering cost: all income multiplied down until it expires
  const penalty = ref<{ mult: number; until: number } | null>(null)
  const businessBuff = ref<TimedBuff | null>(null)
  const autoBuyFrozenUntil = ref<number>(0)
  const activeEvent = ref<ActiveMarketEvent | null>(null)
  const nextEventAt = ref<number>(0)
  const nextEventSeq = ref<number>(0)
  const offlineReport = ref<OfflineCatchUpResult | null>(null)
  const bannerMessage = ref<string | null>(null)
  // The most recent boss win, for the victory screen and banner
  const lastVictory = ref<{ gate: number; killMs: number; splitMs: number; prevBestKillMs: number | null; firstTime: boolean } | null>(null)
  // Set when a boss attempt is lost and the bloodline is forced into exile
  const disgraceReport = ref<DisgraceReport | null>(null)
  const legacyDrawerOpen = ref<boolean>(false)
  // Succession runs as steps, one dialog at a time: choose the heir, then
  // spend Legacy. 'pending' waits for the heir; 'open' marks the club as
  // the last step rather than a visit from the top bar.
  const successionShop = ref<'pending' | 'open' | null>(null)
  const classModalOpen = ref<boolean>(false)
  const celebratedClassLevel = ref<number | null>(null)

  const netWorth = computed(() => money.value + spentThisRun.value)
  const gatesBeaten = ref<number>(initial.gatesBeaten)
  const familySurname = ref<string>(initial.familySurname)
  const heir = ref<Heir>(initial.heir ?? { name: '', traitId: null })
  const heirChoices = ref<Heir[]>(initial.heirChoices)
  // Abdication: one per generation, and the siblings on offer (not saved:
  // nothing changes until one is picked)
  const abdicated = ref<boolean>(initial.abdicated)
  const siblingChoices = ref<Heir[]>([])
  const generation = ref<number>(initial.generation)
  const familyTree = ref<GenerationRecord[]>(initial.familyTree)
  const familyTreeOpen = ref(false)
  const hallOpen = ref(false)
  // The main menu, shown on arrival; the game waits behind it
  const menuOpen = ref(false)
  // The page the menu opens on: its front, or straight to founding the next
  // family when a finished dynasty asks for it
  const menuPage = ref<'main' | 'found' | 'scenario'>('main')
  // A new family being written into the register: who came before it, and
  // how they left. Null when the register isn't open.
  const census = ref<CensusEntry | null>(null)
  // A family that left before the next was written in (a finished dynasty
  // settled from the finale): the register shows them when it next opens
  const censusPending = ref<CensusEntry | null>(null)
  const achievements = ref<string[]>(initial.achievements)
  const achievementProgress = ref<AchievementProgress>(initial.achievementProgress)
  const achievementsOpen = ref(false)
  const titles = ref<number>(initial.titles)
  // A family that hasn't started: nothing played, nothing to carry on
  const familyIsFresh = computed(
    () => generation.value === 1 && familyTree.value.length === 0 && gatesBeaten.value === 0 && titles.value === 0 && dynastyMs.value < 1000
  )
  // The dynasty: active time since it began, and whether it has reached Duke
  const dynastyMs = ref<number>(initial.dynastyMs)
  const dynastyComplete = ref<boolean>(initial.dynastyComplete)
  // The rule the dynasty is played under
  const scenario = ref<ScenarioId>(initial.scenario)
  const scenarioDef = computed(() => SCENARIOS_BY_ID[scenario.value])
  // Every dynasty that reached Duke, newest first; kept apart from the save
  const hall = ref<DynastyRecord[]>([])
  // Elevation needs the Royal Garden Party beaten at least once, ever
  // Counts the Legacy this generation would bank, since elevating ends it
  const titlesOnElevation = computed(() =>
    titlesFor(legacyPoints.value + legacyOnRetire.value)
  )
  const canElevate = computed(() => bestSplits.value[9] != null && titlesOnElevation.value >= 1)
  const office = createOfficeModule({
    money,
    extraSeats: () => perks.value.officeSeats,
    paChairCount: () => titlePaChairs(titles.value),
    announce: (msg) => announce(msg),
    flushSave: () => flushSave(nowMs.value),
    internsOff: () => modifiers.value.internsDisabled || scenarioDef.value.noAutomation === true,
    officeClosed: () => scenarioDef.value.noOffice === true
  })
  const bloodlineTraitPills = computed(() => describeBloodlineTraits(familyTree.value, heir.value))
  // Playing without tapping: the whole allowance against plain Universal
  // Credit, from everything that raises click pay
  const allowancePill = computed(() => {
    if (!noTap.value) return null
    const mods = baseModifiers.value
    const mult = mods.clickMult
    return Math.abs(mult - 1) > 0.01 ? { label: `Total allowance x${formatMultiplier(mult)}`, negative: mult < 1 } : null
  })
  // Every rule-bending source in play: stacked bloodline traits, the family office, achievements and titles
  // Everything lasting: traits, the office, achievements and titles
  // Jobs and Businesses held at 1,000 (market dominance): each adds a quarter
  // to all income
  const dominanceHeld = computed(
    () =>
      Object.values(jobsPurchased.value).filter((n) => n >= DOMINANCE_AT).length +
      Object.values(businessesOwned.value).filter((n) => n >= DOMINANCE_AT).length
  )
  // King's Awards, on the ladder trial only
  const awards = computed(() => (LADDER_TRIAL ? awardsHeld(jobsPurchased.value, businessesOwned.value) : []))
  let awardKeys = new Set<string>()
  // Announces an award newly earned (quiet: just take note, as on loading)
  function noteAwards(quiet = false): void {
    const now = awards.value
    if (now.length === 0 && awardKeys.size === 0) return
    const key = (a: Award) => `${a.kind}:${a.from}:${a.level}`
    const fresh = now.filter((a) => !awardKeys.has(key(a)))
    awardKeys = new Set(now.map(key))
    if (!quiet && fresh.length > 0) announce(awardText(fresh[fresh.length - 1]))
  }
  const lastingSources = computed(() => {
    const held = dominanceHeld.value
    const dominance = held > 0 ? [{ businessMult: dominanceMultiplier(held), clickMult: dominanceMultiplier(held) }] : []
    const won = awards.value.length
    const awarded = won > 0 ? [{ businessMult: awardMultiplier(won), clickMult: awardMultiplier(won) }] : []
    return [
      ...awarded,
      ...bloodlineTraitSources(familyTree.value, heir.value),
      ...office.officeSources.value,
      achievementSource(achievements.value.length),
      titleSource(titles.value),
      ...dominance
    ]
  })
  const baseModifiers = computed(() => combineModifiers(lastingSources.value))
  const modifiers = computed(() =>
    favourSources.value.length > 0 ? combineModifiers([...lastingSources.value, ...favourSources.value]) : baseModifiers.value
  )
  const bloodlineDeepestGate = computed(() =>
    currentBloodlineRecords(familyTree.value).reduce((max, r) => Math.max(max, r.deepestGate), 0)
  )
  const minRetireGate = computed(() => Math.max(1, bloodlineDeepestGate.value - 1))
  const activeGenerationMs = ref<number>(initial.activeGenerationMs)
  const lastFloodSpawnMs = ref<number>(0)
  const splits = ref<(number | null)[]>(initial.splits)
  const bestSplits = ref<(number | null)[]>(initial.bestSplits)
  const lastKillMs = ref<(number | null)[]>(initial.lastKillMs)
  const bestKillMs = ref<(number | null)[]>(initial.bestKillMs)
  const bosses = createBossModule({
    gatesBeaten,
    netWorth: () => netWorth.value,
    activeMs: () => activeGenerationMs.value,
    allRevealedOwned: () => allRevealedOwned(),
    handleClassPromotion: (prev) => handleClassPromotion(prev),
    announce: (msg) => announce(wording(msg)),
    onBossWon: (gate, killMs, purchases, outgrown) => {
      if (gate === 1) unlockAchievement('solidarity')
      if (gate === 4 && purchases <= 10) unlockAchievement('under-par')
      if (gate === 6) unlockAchievement('silver-service')
      if (gate === 9) unlockAchievement('garden-party')
      if (killMs <= 3000) unlockAchievement('no-sweat')
      // A first-time win has just opened the celebration; a repeat gets a banner
      const firstTime = classModalOpen.value && celebratedClassLevel.value === gate
      const prevBestKillMs = bestKillMs.value[gate] ?? null
      lastVictory.value = { gate, killMs, splitMs: activeGenerationMs.value, prevBestKillMs, firstTime }
      if (!firstTime) {
        const title = bossForGate(gate)?.title ?? `Class ${gate}`
        const best = prevBestKillMs !== null ? ` (best ${formatClock(prevBestKillMs)})` : ''
        announce(
          outgrown
            ? `${title} waved you through without a fight. Class: ${classStatus.value.current.label}.`
            : `${title} beaten in ${formatClock(killMs)}${best}. Class: ${classStatus.value.current.label}.`
        )
      }
      splits.value = withSplit(splits.value, gate, activeGenerationMs.value)
      lastKillMs.value = withSplit(lastKillMs.value, gate, killMs)
      bestSplits.value = mergeBests(bestSplits.value, splits.value)
      bestKillMs.value = mergeBests(bestKillMs.value, lastKillMs.value)
      // After the final gate the Lords are next, not a new hire. Waved
      // through, the shortlist waits for the player to ask for it.
      if (bossForGate(gate + 1)) office.rollOffer(Math.random, outgrown)
    },
    onBossLost: (gate) => {
      const def = bossForGate(gate)
      disgraceReport.value = {
        familySurname: familySurname.value,
        heirName: heir.value.name,
        generation: generation.value,
        gate,
        bossTitle: def?.title ?? `Class ${gate}`,
        disgraceText: def?.disgraceText ?? 'The family name never recovers, and the line is wound up.',
        deepestGate: Math.max(gatesBeaten.value, bloodlineDeepestGate.value),
        legacyLost: legacyPoints.value
      }
      plays.log(nowMs.value, 'disgrace', { gate, generation: generation.value, legacy: legacyPoints.value })
      resetBloodline(nowMs.value)
    },
    bestKillFor: (gate) => bestKillMs.value[gate] ?? null,
    bossTimeMult: () => modifiers.value.bossTimeMult,
    countsGain: (gate) => bossCountsGain(gate),
    twistStrength: () => modifiers.value.twistStrength,
    onAttemptEnded: (ended) => {
      plays.onAttemptEnded(nowMs.value, ended)
      if (ended.result === 'won') cue('bossWin')
      else if (ended.result === 'lost') cue('bossLose')
      // Corked bottles belong to the tasting; they leave with the sommelier
      if (activeEvent.value?.corked) {
        activeEvent.value = null
      }
    }
  })
  const twist = bosses.twist
  // Every boss win comes with a hire, and it must be made before moving on
  const mustHireFirst = computed(() => office.headhunterOffer.value.length > 0)
  const plays = createPlayLogModule(loadPlayLog(), {
    generation: () => generation.value,
    activeMs: () => activeGenerationMs.value,
    netWorth: () => netWorth.value,
    openGate: () => {
      const boss = bosses.nextBoss.value
      return boss && boss.status !== 'locked' ? boss.def.gate : null
    },
    attempt: () => {
      const tracker = bosses.fight.value
      const boss = bosses.nextBoss.value
      return tracker && boss ? { gate: tracker.gate, startedActiveMs: tracker.startedActiveMs, progress: boss.progress } : null
    },
    hustle: () => hustleMultiplier.value,
    onGateOpen: () => cue('gateOpen')
  })
  plays.resetGateWatch(initial.gatesBeaten)
  const classStatus = computed(() => classInfoForLevel(gatesBeaten.value, netWorth.value))
  // Rooms: the family lives in its current class's room unless the player
  // has pinned one it has reached before (any bloodline, any generation)
  // Once reached, a room stays open for good: any dynasty, and every room
  // once a family has made Duke (the Hall)
  const roomsOpenTo = computed(() =>
    Math.max(highestClassReached.value, roomsReached.value, hall.value.length > 0 ? SOCIAL_CLASSES.length - 1 : 0)
  )
  const unlockedRooms = computed(() => ROOMS.filter((r) => Math.min(...r.classLevels) <= roomsOpenTo.value))
  const activeRoom = computed<RoomDef>(() => {
    const pinned = unlockedRooms.value.find((r) => r.id === decor.value)
    return pinned ?? roomForClass(classStatus.value.current.level)
  })
  const costCeiling = computed(() => itemCostCeiling(gatesBeaten.value))
  const heirInheritancePreview = computed(() => heirInheritance(netWorth.value, gatesBeaten.value, modifiers.value.trustFundShareAdd))
  const legacyMultiplier = computed(() => calcLegacyMultiplier(legacyPoints.value, modifiers.value.legacyScale))
  const legacyAvailable = computed(() => Math.max(0, legacyPoints.value - legacySpent.value))
  const legacyOnRetire = computed(() => legacyForRetiring(gatesBeaten.value, bloodlineDeepestGate.value))
  // Retiring without a new record pays nothing, but stays open so a family
  // stuck behind a bad heir can draft another
  // Not mid-ordeal: once the back-out moment has passed, it is seen through
  // (retiring is no way out of it, as abdicating isn't)
  const canRetire = computed(
    () =>
      gatesBeaten.value >= minRetireGate.value &&
      heirChoices.value.length === 0 &&
      disgraceReport.value === null &&
      bosses.fight.value === null
  )
  // From the perk, and from staff who bring their own
  const autoClickers = computed(() =>
    modifiers.value.internsDisabled || scenarioDef.value.noAutomation
      ? 0
      : perks.value.autoClicker * INTERNS_PER_RANK + modifiers.value.internsAdd
  )
  const maxHustle = computed(() => maxHustleMultiplier(perks.value.hustleCap))
  // Without tapping, Hustle holds steady (Grindset Coaching raises it) and
  // the allowance and Interns ride it
  const hustleMultiplier = computed(() => (noTap.value ? steadyHustle(perks.value.hustleCap) : 1 + hustleBonus.value))

  function buffView(buff: TimedBuff | null): ActiveBuffView | null {
    if (!buff || nowMs.value >= buff.until) {
      return null
    }
    return {
      kind: buff.kind,
      label: buff.label,
      mult: buff.mult,
      remainingSec: Math.max(0, Math.ceil((buff.until - nowMs.value) / 1000))
    }
  }

  const activeClickBuff = computed(() => buffView(clickBuff.value))
  const activeBusinessBuff = computed(() => buffView(businessBuff.value))
  const isAutoBuyFrozen = computed(() => nowMs.value < autoBuyFrozenUntil.value)
  const incomePenalty = computed(() =>
    penalty.value && nowMs.value < penalty.value.until
      ? { mult: penalty.value.mult, remainingSec: Math.ceil((penalty.value.until - nowMs.value) / 1000) }
      : null
  )

  const autoBuyFreezeRemainingSec = computed(() =>
    Math.max(0, Math.ceil((autoBuyFrozenUntil.value - nowMs.value) / 1000))
  )

  const economyInput = computed<EconomySnapshotInput>(() => ({
    jobsPurchased: jobsPurchased.value,
    businessesOwned: businessesOwned.value,
    legacyPoints: legacyPoints.value,
    classLevel: classStatus.value.current.level,
    deregulationRank: perks.value.deregulation,
    autoClickers: autoClickers.value,
    businessBuffMultiplier: activeBusinessBuff.value?.mult ?? 1,
    clickBuffMultiplier: (activeClickBuff.value?.mult ?? 1) * twist.value.clickPayMult,
    hustleMultiplier: hustleMultiplier.value,
    noTap: noTap.value,
    mods: modifiers.value
  }))

  // Buyers: a Recruiter for Jobs and Acquisitions for Businesses, or the
  // family's own staff on a Landed Gentry heir (engine/buyers.ts)
  const buyers = computed(() =>
    scenarioDef.value.noAutomation
      ? { jobs: null, businesses: null }
      : familyBuyers({
      seats: office.officeSeats.value,
      paChairs: office.paChairs.value,
      signingRanks: perks.value.signingAuthority,
      extraItemTypes: modifiers.value.buyerItemTypes,
      paused: buyersPaused.value
    })
  )
  const hasBuyers = computed(() => buyers.value.jobs !== null || buyers.value.businesses !== null)

  // Whether a list's buyer is at work right now: hired, not stood down, and
  // not stopped by a freeze or a boss
  function buyerWorking(kind: ItemKind): boolean {
    return buyers.value[kind] !== null && !buyersPaused.value[kind] && !isAutoBuyFrozen.value && !twist.value.automationPaused
  }

  const moneyPerClick = computed(() => computeClickIncome(economyInput.value, true))
  const baseMoneyPerClick = computed(() => computeClickIncome(economyInput.value, false))
  // Job cards show base rates: no Hustle and no Market Opportunity click buff
  const jobBaseEconomyInput = computed<EconomySnapshotInput>(() => ({
    ...economyInput.value,
    clickBuffMultiplier: twist.value.clickPayMult
  }))
  const jobBaseMoneyPerClick = computed(() => computeClickIncome(jobBaseEconomyInput.value, false))
  const moneyPerSecond = computed(() => computePassivePerSecond(economyInput.value))
  // Favours help while you play; time away earns nothing from them
  const offlinePerSecond = computed(() => computePassivePerSecond({ ...economyInput.value, mods: baseModifiers.value }))

  // Income a second at these modifiers: passive, plus taps at your recent rate
  function incomeWith(mods: typeof modifiers.value): number {
    const input = { ...economyInput.value, mods }
    const tapsPerSec = moneyPerClick.value > 0 ? manualRealisedPerSecond.value / moneyPerClick.value : 0
    return computePassivePerSecond(input) + tapsPerSec * computeClickIncome(input, true)
  }

  // What running favours add a second, for the trading desk
  const favourPerSecond = computed(() =>
    favourSources.value.length > 0 ? Math.max(0, incomeWith(modifiers.value) - incomeWith(baseModifiers.value)) : 0
  )

  // What each event would add to income right now, as a share of it
  function favourEventValue(id: string): number {
    const def = FAVOUR_EVENTS_BY_ID[id]
    const now = incomeWith(modifiers.value)
    if (!def || now <= 0) return 0
    return incomeWith(combineModifiers([...lastingSources.value, ...favourSources.value, favourEventSource(def)])) / now - 1
  }
  // Income ignoring Market Opportunity buffs, so windfalls can't stack on them
  const unbuffedMoneyPerSecond = computed(() =>
    computePassivePerSecond({ ...economyInput.value, businessBuffMultiplier: 1, clickBuffMultiplier: 1 })
  )
  const realisedPerSecond = computed(() => currentRealisedPerSec(telemetry.value, nowMs.value))
  const manualRealisedPerSecond = computed(() => currentManualPerSec(telemetry.value, nowMs.value))
  // The founder scrapes by on the state; heirs, born rich, get an allowance
  const allowanceLabel = computed(() => (heir.value.traitId === null ? 'Universal Credit' : 'Allowance from Granny'))
  const allowancePerSecond = computed(() => computeIncomeBreakdown(economyInput.value).allowance)
  // Playing without tapping, a Job's click pay reaches you through the
  // allowance: this many taps' worth a second, at the steady Hustle
  const allowanceTapRate = computed(() =>
    noTap.value ? ALLOWANCE_TAPS_PER_SEC * hustleMultiplier.value : 0
  )
  // What each steady source earns a second now, for splitting the cashflow
  // chart's realised money by where it came from
  const passiveSources = computed<Record<string, number>>(() =>
    Object.fromEntries(
      computeIncomeSources(economyInput.value, 0, allowanceLabel.value, favourPerSecond.value).map((e) => [e.id, e.perSec])
    )
  )
  const sectorSlices = computed(() =>
    computeSectorSlices(economyInput.value, manualRealisedPerSecond.value, allowanceLabel.value, favourPerSecond.value)
  )

  // Keeps the saved record of what has been seen in step with what is shown
  function refreshSeenItems(): void {
    for (const row of visibleJobs.value) if (row.mode === 'revealed') seenItems.value.jobs[row.item.id] = true
    for (const row of visibleBusinesses.value) if (row.mode === 'revealed') seenItems.value.businesses[row.item.id] = true
  }

  // On a fresh climb, each item unlocks once you own one of the item before
  // it. On prestige generations, items already seen in this bloodline appear
  // straight away up to the current gate's cost ceiling.
  function buildVisibleList<T extends { id: string; baseCost: number }>(
    items: ReadonlyArray<T>,
    owned: Readonly<Record<string, number>>,
    seen: Readonly<Record<string, boolean>>,
    prefix: string
  ): VisibleRow<T>[] {
    const rows: VisibleRow<T>[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const unlocked = i === 0 || Boolean(seen[item.id]) || (owned[items[i - 1].id] ?? 0) > 0 || (owned[item.id] ?? 0) > 0
      if (unlocked && item.baseCost <= costCeiling.value) {
        rows.push({ mode: 'revealed', item })
        continue
      }
      if (item.baseCost > costCeiling.value) {
        rows.push({ mode: 'gated', key: `${prefix}-gated-${item.id}`, bossTitle: bossForGate(gatesBeaten.value + 1)?.title ?? '', item })
      } else {
        rows.push({ mode: 'teaser', key: `${prefix}-teaser-${item.id}`, item })
      }
      break
    }
    return rows
  }

  const visibleJobs = computed<VisibleRow<JobDef>[]>(() =>
    buildVisibleList(JOBS, jobsPurchased.value, seenItems.value.jobs, 'job')
  )
  const visibleBusinesses = computed<VisibleRow<BusinessDef>[]>(() =>
    buildVisibleList(BUSINESSES, businessesOwned.value, seenItems.value.businesses, 'biz')
  )

  function snapshotPersisted(ts: number): PersistedSceneState {
    return {
      money: money.value,
      spentThisRun: spentThisRun.value,
      jobsPurchased: jobsPurchased.value,
      businessesOwned: businessesOwned.value,
      legacyPoints: legacyPoints.value,
      legacySpent: legacySpent.value,
      perks: perks.value,
      lifetimePurchases: lifetimePurchases.value,
      autoBuyDisabled: autoBuyDisabled.value,
      seenItems: seenItems.value,
      lifetimeEarned: lifetimeEarned.value,
      highestClassReached: highestClassReached.value,
      gatesBeaten: gatesBeaten.value,
      activeGenerationMs: activeGenerationMs.value,
      splits: splits.value,
      bestSplits: bestSplits.value,
      lastKillMs: lastKillMs.value,
      bestKillMs: bestKillMs.value,
      familySurname: familySurname.value,
      heir: heir.value,
      heirChoices: heirChoices.value,
      abdicated: abdicated.value,
      generation: generation.value,
      office: office.snapshot(),
      familyTree: familyTree.value,
      achievements: achievements.value,
      titles: titles.value,
      achievementProgress: achievementProgress.value,
      bulkBuyMode: bulkBuyMode.value,
      buyersPaused: buyersPaused.value,
      compactAutoBuy: compactAutoBuy.value,
      decor: decor.value,
      roomsReached: Math.max(roomsReached.value, highestClassReached.value),
      noTap: noTap.value,
      muted: muted.value,
      introSeen: introSeen.value,
      tradingDeskCollapsed: tradingDeskCollapsed.value,
      favours: favours.value,
      dynastyMs: dynastyMs.value,
      dynastyComplete: dynastyComplete.value,
      scenario: scenario.value,
      bossFight: bosses.fight.value,
      bossCooldownUntilMs: bosses.bossCooldownUntilMs.value,
      lastUpdate: ts
    }
  }

  function flushSave(ts = nowMs.value): void {
    lastUpdate.value = ts
    lastSavedMs.value = ts
    // A family takes a seat once it has begun (written into the register, or
    // anything worth keeping); until then there is nothing of theirs to save
    if (activeSlotId.value === null && !census.value && familyHasBegun()) claimFamilySeat(ts)
    const key = activeKey('state')
    try {
      if (key) localStorage.setItem(key, serializeState(snapshotPersisted(ts)))
    } catch {
      // Ignore storage quota or private-browsing write errors
    }
    const playedAt = saveProfile()
    if (key) {
      noteActiveSummary(
        {
          surname: familySurname.value,
          fresh: familyIsFresh.value,
          generation: generation.value,
          titles: titles.value,
          scenario: scenario.value,
          dynastyMs: dynastyMs.value,
          dynastyComplete: dynastyComplete.value
        },
        ts,
        playedAt
      )
    }
  }

  function familyHasBegun(): boolean {
    return (
      !familyIsFresh.value ||
      lifetimeEarned.value > 0 ||
      money.value > 0 ||
      Object.values(jobsPurchased.value).some((n) => n > 0) ||
      Object.values(businessesOwned.value).some((n) => n > 0)
    )
  }

  // Play time, across every family, not yet added to the profile
  let unrecordedPlayMs = 0

  // Shared with every save slot: achievements earned anywhere, and the
  // settings (engine/profile.ts)
  function applyProfile(): void {
    const profile = readProfile()
    achievements.value = [...new Set([...achievements.value, ...profile.achievements])]
    const s = profile.settings
    if (!s) return
    bulkBuyMode.value = s.bulkBuyMode
    compactAutoBuy.value = s.compactAutoBuy
    decor.value = s.decor
    roomsReached.value = Math.max(roomsReached.value, s.roomsReached)
    muted.value = s.muted
    introSeen.value = introSeen.value || s.introSeen
    tradingDeskCollapsed.value = s.tradingDeskCollapsed
    // A scenario that settles tapping for the dynasty keeps its rule
    if (scenarioDef.value.noTap === undefined) noTap.value = s.noTap
  }

  // Returns all play so far, across every family
  function saveProfile(): number {
    const before = readProfile()
    const playedMs = before.playedMs + unrecordedPlayMs
    unrecordedPlayMs = 0
    writeProfile({
      playedMs,
      achievements: [...new Set([...before.achievements, ...achievements.value])],
      settings: {
        bulkBuyMode: bulkBuyMode.value,
        compactAutoBuy: compactAutoBuy.value,
        decor: decor.value,
        roomsReached: Math.max(roomsReached.value, highestClassReached.value, before.settings?.roomsReached ?? 0),
        noTap: scenarioDef.value.noTap === undefined ? noTap.value : (before.settings?.noTap ?? false),
        muted: muted.value,
        introSeen: introSeen.value,
        tradingDeskCollapsed: tradingDeskCollapsed.value
      }
    })
    return playedMs
  }

  // Save slots (data/saveSlots.ts): the menu's list of families, at most one
  // in residence. Playing another, or beginning one with another tuning,
  // saves this one and reloads into it.
  const saveIndex = ref<SaveIndex>(readIndex())
  const activeSlotId = ref<string | null>(residentSlotId())
  const hasFamily = computed(() => activeSlotId.value !== null)
  const seatsFull = computed(() => saveIndex.value.slots.length >= MAX_SAVES)
  const canAddSave = computed(() => !seatsFull.value)
  const familyTuning = ACTIVE_TUNING

  // Every seat's family as the menu shows it: one not played since summaries
  // began (as saves from before seats) reads its own save
  function refreshSaves(): void {
    adoptOrphans()
    for (const slot of readIndex().slots) {
      if (slot.id === activeSlotId.value || slot.summary) continue
      try {
        const raw = localStorage.getItem(slotPrefix(slot.id) + 'state')
        if (raw) setSlotSummary(slot.id, summariseSave(parseSavedState(raw)))
      } catch {
        // Left without a summary
      }
    }
    saveIndex.value = readIndex()
  }

  function claimFamilySeat(ts: number): void {
    const slot = claimSeat(ACTIVE_TUNING, ts)
    if (!slot) return
    activeSlotId.value = slot.id
    saveIndex.value = readIndex()
    plays.flush(ts)
  }

  function summariseSave(state: PersistedSceneState): SaveSummary {
    return {
      surname: state.familySurname,
      fresh:
        state.generation === 1 && state.familyTree.length === 0 && state.gatesBeaten === 0 && state.titles === 0 && state.dynastyMs < 1000,
      generation: state.generation,
      titles: state.titles,
      scenario: state.scenario,
      dynastyMs: state.dynastyMs,
      dynastyComplete: state.dynastyComplete
    }
  }

  function playSave(id: string, ts = Date.now()): void {
    if (id === activeSlotId.value) return
    flushAll(ts)
    if (setActiveSlot(id)) reloadPage()
  }

  // A new family, on the way to the register: no seat until it is written in.
  // Leaving the family in residence, or a tuning other than this page's,
  // means a reload; the next family's scenario and tuning wait in the index.
  function beginNewFamily(next: ScenarioId = 'standard', tuning: Tuning = ACTIVE_TUNING, ts = Date.now()): void {
    if (activeSlotId.value !== null || tuning !== ACTIVE_TUNING) {
      flushAll(ts)
      setActiveSlot(null, { tuning, scenario: next })
      reloadPage()
      return
    }
    beginDynasty(ts, familySurname.value, next)
    openCensus()
  }

  // Disowns a family not in residence: its seat and save, for good
  function removeSave(id: string): boolean {
    if (id === activeSlotId.value) return false
    const removed = removeSlot(id)
    refreshSaves()
    return removed
  }

  // A family's save for downloading, play log and tuning included: the one
  // in play as it stands, another as it was last saved
  function exportSlot(id: string, ts = Date.now()): { json: string; surname: string; generation: number } | null {
    if (id === activeSlotId.value) return { json: exportSave(ts), surname: familySurname.value, generation: generation.value }
    const slot = readIndex().slots.find((s) => s.id === id)
    if (!slot) return null
    try {
      const state = localStorage.getItem(slotPrefix(id) + 'state')
      if (!state) return null
      const rawLog = localStorage.getItem(slotPrefix(id) + 'playLog')
      const log = readPlayLog(rawLog ? JSON.parse(rawLog) : null)
      return { json: withPlayLog(state, log, slot.tuning), surname: slot.summary?.surname ?? '', generation: slot.summary?.generation ?? 1 }
    } catch {
      return null
    }
  }

  // A downloaded save, into a slot of its own. Its tuning comes with it.
  // 'ladder': the file doesn't say which ladder it was played on (saves from
  // before seats), so ask, and call again with it
  function importSave(text: string, ts = Date.now(), chosen?: Tuning): 'ok' | 'invalid' | 'full' | 'ladder' {
    let tuning: Tuning = 'classic'
    let state = text
    let log: unknown = null
    try {
      const parsed = JSON.parse(text) as { scene?: Record<string, unknown>; tuning?: unknown }
      if (!parsed || typeof parsed !== 'object' || !parsed.scene || typeof parsed.scene !== 'object') return 'invalid'
      if (parsed.tuning === 'trial' || parsed.tuning === 'classic') tuning = parsed.tuning
      else if (chosen) tuning = chosen
      else return 'ladder'
      // The play log rides along in a downloaded save; it lives apart in play
      log = parsed.scene.playLog ?? null
      delete parsed.scene.playLog
      delete parsed.tuning
      state = JSON.stringify(parsed)
    } catch {
      return 'invalid'
    }
    flushAll(ts)
    const slot = addSlot(tuning, ts)
    if (!slot) return 'full'
    try {
      localStorage.setItem(slotPrefix(slot.id) + 'state', state)
      if (log) localStorage.setItem(slotPrefix(slot.id) + 'playLog', JSON.stringify(log))
    } catch {
      removeSlot(slot.id)
      refreshSaves()
      return 'full'
    }
    setActiveSlot(slot.id)
    refreshSaves()
    reloadPage()
    return 'ok'
  }

  function scheduleNextEvent(fromMs: number, rng: () => number = Math.random): void {
    const delaySec = (45 + rng() * 45) * Math.pow(EVENT_INTERVAL_PER_INSIDER_RANK, perks.value.insider) * modifiers.value.eventIntervalMult
    nextEventAt.value = fromMs + delaySec * 1000
  }

  function applyLoadedState(loaded: PersistedSceneState, ts: number): void {
    money.value = loaded.money
    spentThisRun.value = loaded.spentThisRun
    jobsPurchased.value = loaded.jobsPurchased
    businessesOwned.value = loaded.businessesOwned
    legacyPoints.value = loaded.legacyPoints
    legacySpent.value = loaded.legacySpent
    perks.value = loaded.perks
    lifetimePurchases.value = loaded.lifetimePurchases
    autoBuyDisabled.value = loaded.autoBuyDisabled
    seenItems.value = loaded.seenItems
    lifetimeEarned.value = loaded.lifetimeEarned
    highestClassReached.value = loaded.highestClassReached
    gatesBeaten.value = loaded.gatesBeaten
    activeGenerationMs.value = loaded.activeGenerationMs
    splits.value = loaded.splits
    bestSplits.value = loaded.bestSplits
    lastKillMs.value = loaded.lastKillMs
    bestKillMs.value = loaded.bestKillMs
    familySurname.value = loaded.familySurname || generateSurname(Math.random)
    heir.value = loaded.heir ?? { name: heirName(Math.random, familySurname.value, []), traitId: null }
    heirChoices.value = loaded.heirChoices
    abdicated.value = loaded.abdicated
    generation.value = loaded.generation
    office.loadState(loaded.office)
    familyTree.value = loaded.familyTree
    achievements.value = loaded.achievements
    titles.value = loaded.titles
    dynastyMs.value = loaded.dynastyMs
    dynastyComplete.value = loaded.dynastyComplete
    scenario.value = loaded.scenario
    achievementProgress.value = loaded.achievementProgress
    penalty.value = null
    // A fight carries on only if it's still this generation's next boss
    bosses.bossAttempt.value =
      loaded.bossFight && loaded.bossFight.gate === loaded.gatesBeaten + 1 && loaded.bossFight.startedActiveMs <= loaded.activeGenerationMs
        ? { ...loaded.bossFight }
        : null
    bosses.bossCooldownUntilMs.value = loaded.bossCooldownUntilMs
    bulkBuyMode.value = loaded.bulkBuyMode
    buyersPaused.value = loaded.buyersPaused
    compactAutoBuy.value = loaded.compactAutoBuy
    decor.value = loaded.decor
    roomsReached.value = loaded.roomsReached
    // A scenario may hold Play without tapping on or off
    noTap.value = SCENARIOS_BY_ID[loaded.scenario].noTap ?? loaded.noTap
    muted.value = loaded.muted
    introSeen.value = loaded.introSeen
    introOpen.value = !loaded.introSeen
    tradingDeskCollapsed.value = loaded.tradingDeskCollapsed
    favours.value = loaded.favours
    lastUpdate.value = loaded.lastUpdate
    plays.resetGateWatch(loaded.gatesBeaten, true)
    nowMs.value = ts
    lastTickMs.value = ts
    lastAutoBuyAt.value = 0
    hustleBonus.value = 0
    clickBuff.value = null
    businessBuff.value = null
    autoBuyFrozenUntil.value = 0
    activeEvent.value = null
    disgraceReport.value = null
    classModalOpen.value = false
    celebratedClassLevel.value = null
    resetTelemetry(telemetry.value, ts, loaded.money)
    refreshSeenItems()
    scheduleNextEvent(ts)
    // Awards already held on loading aren't news
    noteAwards(true)
  }

  function hydrateFromStorage(ts = Date.now()): void {
    syncResident()
    activeSlotId.value = residentSlotId()
    let raw: string | null = null
    const key = activeKey('state')
    try {
      raw = key ? localStorage.getItem(key) : null
    } catch {
      raw = null
    }
    const loaded = parseSavedState(raw)
    applyLoadedState(loaded, ts)
    applyProfile()
    refreshSaves()
    try {
      hall.value = parseHall(localStorage.getItem(HALL_KEY))
      // The ladder trial kept a Hall of its own before the Hall was shared
      const trialHall = localStorage.getItem('trial:hall')
      if (trialHall) {
        hall.value = [...hall.value, ...parseHall(trialHall)].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, MAX_HALL_ENTRIES)
        localStorage.setItem(HALL_KEY, JSON.stringify(hall.value))
        localStorage.removeItem('trial:hall')
      }
    } catch {
      hall.value = []
    }
    // No family in residence: the next one as chosen before the reload
    if (key === null && NEXT_SCENARIO_AT_LOAD) beginDynasty(ts, familySurname.value, readScenarioId(NEXT_SCENARIO_AT_LOAD))

    // Time away is the family's own: play in other families meanwhile
    // doesn't count (data/saveSlots.ts, playedAt)
    const seat = residentSlot()
    const playedElsewhere = seat?.playedAt !== undefined ? Math.max(0, readProfile().playedMs - seat.playedAt) : 0
    const away = loaded.lastUpdate !== null ? ts - loaded.lastUpdate - playedElsewhere : 0

    // A fight carries on after a reload, but not after time away: as in play,
    // a minute or more away calls it off with no cooldown, before any money
    // earned meanwhile could count towards it. Time in another family isn't
    // time away, so leaving for one is no way out of an ordeal.
    if (bosses.bossAttempt.value && (loaded.lastUpdate === null || away >= 60_000)) {
      plays.log(ts, 'boss-end', { gate: bosses.bossAttempt.value.gate, result: 'away' })
      bosses.bossAttempt.value = null
    }

    // No catch-up while the succession is undecided: the family is in
    // mourning; nor once the dynasty is over
    if (loaded.lastUpdate !== null && away > 0 && heirChoices.value.length === 0 && !dynastyComplete.value) {
      const catchUp = computeOfflineCatchUp(away, offlinePerSecond.value, perks.value.offshore, modifiers.value.offlineEfficiencyAdd)
      if (catchUp) {
        // Through creditMoney, so advisor drain applies offline too
        creditMoney(catchUp.moneyEarned, undefined, ts)
        highestClassReached.value = Math.max(highestClassReached.value, classStatus.value.current.level)
        offlineReport.value = catchUp
        cue('welcomeBack')
        resetTelemetry(telemetry.value, ts, money.value)
        refreshSeenItems()
      }
    }
    flushSave(ts)
  }

  function creditMoney(amount: number, source?: IncomeSource, ts = nowMs.value): void {
    if (amount <= 0) {
      return
    }
    // Boss rent, retainers and commissions come off every credit
    amount *= (1 - twist.value.incomeTaxRate) * (1 - modifiers.value.incomeDrain) * (incomePenalty.value?.mult ?? 1)
    if (bosses.bossAttempt.value) {
      bosses.bossAttempt.value.earnedAfterTax += amount
    }
    money.value += amount
    lifetimeEarned.value += amount
    if (source) {
      recordIncome(telemetry.value, ts, amount, source)
    }
    observeBalance(telemetry.value, ts, money.value)
  }

  function addDebugMoney(amount: number, ts = nowMs.value): void {
    nowMs.value = ts
    creditMoney(amount)
    highestClassReached.value = Math.max(highestClassReached.value, classStatus.value.current.level)
    refreshSeenItems()
  }

  function announce(msg: string): void {
    bannerMessage.value = msg
  }

  function handleClassPromotion(prevClass: number): boolean {
    const newClass = classStatus.value.current.level
    if (newClass <= prevClass) {
      return false
    }
    markTelemetryEvent(telemetry.value, 'Class')
    if (newClass > highestClassReached.value) {
      highestClassReached.value = newClass
      celebratedClassLevel.value = newClass
      classModalOpen.value = true
    }
    // A repeat promotion is announced with the boss win itself
    return true
  }

  // cash: what the purchase may spend, if not all your money (a buyer's budget)
  function itemQuote(kind: ItemKind, id: string, modeOverride?: BulkBuyMode, cash?: number) {
    const def = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]
    const owned = kind === 'jobs' ? (jobsPurchased.value[id] ?? 0) : (businessesOwned.value[id] ?? 0)
    return bulkBuyQuote(
      def.baseCost,
      def.scaleFactor,
      owned,
      classStatus.value.costDiscount *
        twist.value.purchaseCostMult *
        modifiers.value.purchaseCostMult *
        (modifiers.value.sectorCostMult[def.sector] ?? 1),
      modeOverride ?? bulkBuyMode.value,
      Math.min(money.value, cash ?? money.value)
    )
  }

  // save: manual purchases save at once; automation relies on the throttled tick save
  function buyItem(
    kind: ItemKind,
    id: string,
    modeOverride?: BulkBuyMode,
    save = true,
    cash?: number,
    // A buyer's purchase, not the player's
    byBuyer = false
  ): { bought: number; hitMilestone: boolean; promotedClass: boolean; cost: number } {
    const quote = itemQuote(kind, id, modeOverride, cash)
    const gatedDef = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]
    if (!quote.canAfford || quote.count < 1 || !gatedDef || gatedDef.baseCost > costCeiling.value) {
      return { bought: 0, hitMilestone: false, promotedClass: false, cost: 0 }
    }

    const map = kind === 'jobs' ? jobsPurchased.value : businessesOwned.value
    const lifeMap = kind === 'jobs' ? lifetimePurchases.value.jobs : lifetimePurchases.value.businesses
    const def = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]

    const prevOwned = map[id] ?? 0
    const nextOwned = prevOwned + quote.count
    money.value -= quote.cost
    spentThisRun.value += quote.cost
    if (bosses.bossAttempt.value) {
      // Every purchase is a stroke in the Charity Golf Match
      bosses.bossAttempt.value.purchases += 1
      if (!byBuyer) bosses.bossAttempt.value.ownPurchases = (bosses.bossAttempt.value.ownPurchases ?? 0) + 1
    }
    map[id] = nextOwned
    lifeMap[id] = (lifeMap[id] ?? 0) + quote.count
    observeBalance(telemetry.value, nowMs.value, money.value)

    refreshSeenItems()

    const crossedMilestone = itemMilestones(def.scaleFactor).filter((m) => prevOwned < m && nextOwned >= m).pop() ?? null
    const promoted = false
    // Automation crosses milestones quietly; only your own purchases get a banner
    if (crossedMilestone !== null && save) {
      markTelemetryEvent(telemetry.value, 'Milestone')
      const step = (MILESTONE_BASE_STEP + MILESTONE_STEP_PER_DEREGULATION_RANK * perks.value.deregulation + modifiers.value.milestoneStepBonus).toFixed(2).replace(/\.00$/, '')
      announce(`${def.label} hit ${crossedMilestone} owned: output x${step}!`)
    }

    if (save) {
      plays.log(nowMs.value, 'buy', { kind, id, n: quote.count, cost: quote.cost, owned: nextOwned })
      flushSave(nowMs.value)
    }
    return {
      bought: quote.count,
      hitMilestone: crossedMilestone !== null,
      promotedClass: promoted,
      cost: quote.cost
    }
  }

  // Once a second each buyer gets a budget, a share of the cash in hand (both
  // from the same snapshot), and buys the best return per pound that fits at
  // the bulk setting, then the next best with what's left, up to its item
  // types, never the same item twice. Unspent budget stays put.
  // What the buyers bought, logged a minute at a time rather than a line a
  // purchase, so they don't crowd everything else out of the log
  const buyerTally = { minute: -1, jobs: 0, jobsCost: 0, businesses: 0, businessesCost: 0 }
  function flushBuyerTally(ts: number): void {
    if (buyerTally.jobs + buyerTally.businesses > 0) {
      const { jobs, jobsCost, businesses, businessesCost } = buyerTally
      plays.log(ts, 'buyers', { jobs, jobsCost, businesses, businessesCost })
    }
    Object.assign(buyerTally, { minute: Math.floor(activeGenerationMs.value / 60_000), jobs: 0, jobsCost: 0, businesses: 0, businessesCost: 0 })
  }

  // One household purse: the buyers at work spend it together on whatever
  // returns most per pound across both lists, each taking up to its own
  // number of item types from its own list. A Job's click pay counts at the
  // rate you are tapping now, on top of what Interns and the allowance make.
  function runBuyers(ts: number): void {
    if (lastAutoBuyAt.value > 0 && ts - lastAutoBuyAt.value < AUTO_BUY_COOLDOWN_MS) return
    const working = (['jobs', 'businesses'] as const).filter((k) => buyers.value[k] !== null && buyerWorking(k))
    if (working.length === 0) return
    const typesLeft: Record<ItemKind, number> = { jobs: 0, businesses: 0 }
    let share = 0
    for (const k of working) {
      const b = buyers.value[k]!
      typesLeft[k] = b.itemTypes
      share = Math.max(share, b.share)
    }
    let left = money.value * share
    const tapsPerSec = moneyPerClick.value > 0 ? manualRealisedPerSecond.value / moneyPerClick.value : 0
    const done = new Set<string>()
    let bought = false
    for (;;) {
      const options: (BuyOption & { kind: ItemKind; itemId: string })[] = []
      for (const kind of working) {
        if (typesLeft[kind] <= 0) continue
        const rows = kind === 'jobs' ? visibleJobs.value : visibleBusinesses.value
        for (const r of rows) {
          const key = `${kind}:${r.item.id}`
          if (r.mode !== 'revealed' || done.has(key) || !isAutoBuyEnabled(kind, r.item.id)) continue
          const q = itemQuote(kind, r.item.id, undefined, left)
          if (!q.canAfford || q.count < 1) continue
          const delta = itemIncomeDelta(kind, r.item.id, q.count)
          const gain = delta.deltaPerSec + (kind === 'jobs' ? delta.deltaPerClick * tapsPerSec : 0)
          options.push({ id: key, kind, itemId: r.item.id, cost: q.cost, valuePerPound: gain / q.cost })
        }
      }
      const best = bestValue(options) as (typeof options)[number] | null
      if (!best) break
      const { kind, itemId } = best
      const result = buyItem(kind, itemId, undefined, false, left, true)
      if (result.bought === 0) break
      done.add(best.id)
      typesLeft[kind]--
      left -= result.cost
      bought = true
      if (buyerTally.minute !== Math.floor(activeGenerationMs.value / 60_000)) flushBuyerTally(ts)
      buyerTally[kind] += result.bought
      buyerTally[kind === 'jobs' ? 'jobsCost' : 'businessesCost'] += result.cost
      const def = kind === 'jobs' ? JOBS_BY_ID[itemId] : BUSINESSES_BY_ID[itemId]
      noteCandlePurchase(telemetry.value, `${buyers.value[kind]!.name} bought ${result.bought} × ${def.label}`)
    }
    if (bought) lastAutoBuyAt.value = ts
  }

  function toggleBuyersPaused(kind: ItemKind): void {
    buyersPaused.value = { ...buyersPaused.value, [kind]: !buyersPaused.value[kind] }
    flushSave(nowMs.value)
  }

  function manualClick(ts = Date.now()): number {
    nowMs.value = ts
    // There is no Get paid while playing without tapping
    if (noTap.value) return 0
    const maxBonus = maxHustle.value - 1
    const step = maxBonus / 20
    hustleBonus.value = Math.min(maxBonus, Number((hustleBonus.value + step).toFixed(2)))
    lastManualClickAt.value = ts
    plays.onTap(hustleMultiplier.value >= maxHustle.value - 0.01)
    const amount = moneyPerClick.value
    creditClicks(amount, 'manual', ts)
    refreshSeenItems()
    return amount
  }

  // Click income during a boss can count towards the Walkout or be diverted
  // into polishing the family silver. Taps count for the Walkout only at
  // full Hustle; Interns and the allowance always count.
  function creditClicks(amount: number, source: IncomeSource, ts: number): void {
    const attempt = bosses.bossAttempt.value
    if (attempt && (source !== 'manual' || hustleMultiplier.value >= maxHustle.value - 0.01)) {
      attempt.clickEarningsAtFullHustle += amount
    }
    if (attempt && twist.value.clicksPolish) {
      attempt.polish += amount
      return
    }
    creditMoney(amount, source, ts)
  }

  function allRevealedOwned(): boolean {
    const jobsOk = visibleJobs.value.every((r) => r.mode !== 'revealed' || (jobsPurchased.value[r.item.id] ?? 0) > 0)
    const bizOk = visibleBusinesses.value.every((r) => r.mode !== 'revealed' || (businessesOwned.value[r.item.id] ?? 0) > 0)
    return jobsOk && bizOk
  }

  function spawnSpecificEvent(kind: MarketEventKind, ts = nowMs.value, rng: () => number = Math.random): void {
    showMarketEvent(MARKET_EVENTS_BY_KIND[kind], ts, rng)
  }

  function showMarketEvent(def: MarketEventDef, ts: number, rng: () => number, corked = false): void {
    nextEventSeq.value += 1
    cue(def.effect.type === 'scandal' ? 'scandal' : 'eventSpawn')
    activeEvent.value = {
      id: nextEventSeq.value,
      def,
      expiresAt: ts + 12_000,
      xPct: 18 + rng() * 64,
      yPct: 18 + rng() * 55,
      corked
    }
  }

  function maybeSpawnRandomEvent(ts: number, rng: () => number = Math.random): void {
    if (activeEvent.value && ts >= activeEvent.value.expiresAt) {
      const expired = activeEvent.value
      activeEvent.value = null
      plays.log(ts, expired.def.effect.type === 'scandal' ? 'scandal-ignored' : 'event-missed', { kind: expired.def.kind })
      if (expired.def.effect.type === 'scandal') {
        // Letting a scandal run is a choice too
        for (const o of expired.def.effect.ignored) applyScandalOutcome(o, expired.def, ts, rng)
        announce(`${expired.def.title.replace(/!$/, '')}: ${expired.def.effect.ignoredText}`)
      }
    }
    const flood = twist.value.flood
    if (flood && !activeEvent.value && !introOpen.value && ts - lastFloodSpawnMs.value >= flood.intervalSec * 1000) {
      lastFloodSpawnMs.value = ts
      showMarketEvent(pickMarketEvent(rng, false), ts, rng, rng() < flood.corkedChance)
      return
    }
    if (!activeEvent.value && !introOpen.value && nextEventAt.value > 0 && ts >= nextEventAt.value) {
      const shady = rng() < modifiers.value.shadyBonus
      showMarketEvent(shady ? MARKET_EVENTS_BY_KIND.shadyDeal : pickMarketEvent(rng), ts, rng)
      scheduleNextEvent(ts, rng)
    }
  }

  // A freeze stops automation. A family with no automation to freeze has its
  // income halved for the same time instead, so the threat always bites.
  function applyFreeze(ms: number, ts: number): void {
    if (hasBuyers.value) {
      autoBuyFrozenUntil.value = Math.max(autoBuyFrozenUntil.value, ts + ms)
      return
    }
    if (!incomePenalty.value || incomePenalty.value.mult >= FREEZE_INCOME_MULT) {
      penalty.value = { mult: FREEZE_INCOME_MULT, until: ts + ms }
    }
  }

  function applyScandalOutcome(o: ScandalOutcome, def: MarketEventDef, ts: number, rng: () => number): void {
    switch (o.type) {
      case 'cashLoss':
        money.value -= money.value * Math.min(1, o.share * modifiers.value.scandalSeverity)
        break
      case 'windfall':
        creditMoney(unbuffedMoneyPerSecond.value * o.seconds * modifiers.value.windfallMult, 'windfall', ts)
        break
      case 'buff': {
        const slot = o.target === 'click' ? clickBuff : businessBuff
        const current = buffView(slot.value)
        if (!current || current.mult <= o.mult) {
          slot.value = { kind: def.kind, label: def.buffLabel, mult: o.mult, until: ts + o.durationSec * 1000 }
        }
        break
      }
      case 'freeze':
        applyFreeze(o.sec * 1000 * modifiers.value.scandalSeverity, ts)
        break
      case 'penalty':
        // A harsher penalty that is still running is kept
        if (!incomePenalty.value || incomePenalty.value.mult >= o.mult) {
          penalty.value = { mult: o.mult, until: ts + o.durationSec * 1000 * modifiers.value.scandalSeverity }
        }
        break
      case 'gamble':
        for (const next of rng() < o.chance ? o.win : o.lose) applyScandalOutcome(next, def, ts, rng)
        break
    }
  }

  // option: which choice the player made, for scandals; ignored otherwise
  function claimMarketEvent(ts = Date.now(), rng: () => number = Math.random, option?: number): ClaimEventOutcome {
    nowMs.value = ts
    const ev = activeEvent.value
    if (!ev) {
      return null
    }
    if (ev.def.effect.type === 'scandal') {
      const choice = option === undefined ? undefined : ev.def.effect.options[option]
      if (!choice) {
        return null
      }
      activeEvent.value = null
      scheduleNextEvent(ts, rng)
      plays.log(ts, 'scandal-choice', { kind: ev.def.kind, option: option! })
      for (const o of choice.outcomes) applyScandalOutcome(o, ev.def, ts, rng)
      achievementProgress.value = { ...achievementProgress.value, scandals: achievementProgress.value.scandals + 1 }
      if (achievementProgress.value.scandals >= 5) unlockAchievement('spin-cycle')
      announce(`${ev.def.title.replace(/!$/, '')}: you chose to ${choice.label.charAt(0).toLowerCase()}${choice.label.slice(1)}.`)
      flushSave(ts)
      return 'scandal'
    }
    activeEvent.value = null
    scheduleNextEvent(ts, rng)
    if (ev.corked) {
      money.value *= 0.95
      announce('Corked! The sommelier sniffs, and 5% of your cash evaporates.')
      return 'corked'
    }
    if (twist.value.flood) {
      // A good bottle during the tasting is worth savouring
      creditMoney(unbuffedMoneyPerSecond.value * 20 * modifiers.value.windfallMult, 'windfall', ts)
    }
    const durationMult = 1 + BUFF_DURATION_PER_INSIDER_RANK * perks.value.insider
    const def = ev.def
    const effect = def.effect
    const rarityPrefix = def.rarity === 'common' ? '' : `${TIP_LABELS[def.rarity]}! `
    const name = def.title.replace(/!$/, '')

    if (def.rarity === 'legendary') {
      achievementProgress.value = { ...achievementProgress.value, legendaryClaims: achievementProgress.value.legendaryClaims + 1 }
      if (achievementProgress.value.legendaryClaims >= 3) unlockAchievement('lucky-streak')
    }
    if (effect.type === 'clickBuff' || effect.type === 'businessBuff') {
      const dur = Math.round(effect.durationSec * durationMult)
      const slot = effect.type === 'clickBuff' ? clickBuff : businessBuff
      const current = buffView(slot.value)
      const target = effect.type === 'clickBuff' ? 'Click' : 'Business'
      markTelemetryEvent(telemetry.value, 'Opportunity')
      if (current && current.mult > effect.mult) {
        // Never downgrade a stronger buff that is still running
        announce(`${name}: your ${current.label} x${current.mult} is stronger, so it keeps running.`)
      } else {
        slot.value = { kind: def.kind, label: def.buffLabel, mult: effect.mult, until: ts + dur * 1000 }
        announce(wording(`${rarityPrefix}${name}: ${target} income x${effect.mult} for ${dur}s!`))
      }
      flushSave(ts)
      return 'golden'
    }
    if (effect.type === 'windfall') {
      const windfall = Math.max(500, unbuffedMoneyPerSecond.value * effect.seconds) * modifiers.value.windfallMult
      markTelemetryEvent(telemetry.value, 'Opportunity')
      creditMoney(windfall, 'windfall', ts)
      refreshSeenItems()
      announce(`${rarityPrefix}${name}: ${formatDuration(effect.seconds)} of passive income wired offshore!`)
      flushSave(ts)
      return 'golden'
    }
    if (effect.type !== 'shady') {
      return null
    }
    // Shady Deal: 50/50 windfall vs a freeze
    if (rng() < 0.5) {
      const windfall = Math.max(1500, unbuffedMoneyPerSecond.value * effect.winSeconds) * modifiers.value.windfallMult
      markTelemetryEvent(telemetry.value, 'Opportunity')
      creditMoney(windfall, 'windfall', ts)
      refreshSeenItems()
      announce(`VIP-Lane Contract Approved! ${formatDuration(effect.winSeconds)} passive windfall!`)
      flushSave(ts)
      return 'shadyWin'
    }
    applyFreeze(effect.freezeSec * 1000, ts)
    announce(
      hasBuyers.value
        ? `Select Committee Inquiry! Your buyers are suspended for ${effect.freezeSec}s (cash untouched).`
        : `Select Committee Inquiry! Income halved for ${effect.freezeSec}s (cash untouched).`
    )
    flushSave(ts)
    return 'shadyFreeze'
  }

  function tick(ts = Date.now()): void {
    nowMs.value = ts
    if (lastTickMs.value === null) {
      lastTickMs.value = ts
      return
    }
    const elapsedMs = Math.max(0, ts - lastTickMs.value)
    lastTickMs.value = ts
    // Time with a family in residence, for every other family's time away
    if (activeSlotId.value !== null) unrecordedPlayMs += Math.min(elapsedMs, 60_000)
    if (heirChoices.value.length > 0 || disgraceReport.value !== null || dynastyComplete.value || menuOpen.value || census.value) {
      // The game pauses while succession, disgrace, the menu or the register
      // is on screen, and stops once the dynasty is over
      return
    }
    noteAwards()

    if (elapsedMs >= 60_000) {
      // Time away abandons a boss fight (no cooldown), so offline income
      // can never win it
      if (bosses.bossAttempt.value) {
        plays.log(ts, 'boss-end', { gate: bosses.bossAttempt.value.gate, result: 'away' })
      }
      plays.log(ts, 'away', { ms: elapsedMs })
      bosses.bossAttempt.value = null
      const catchUp = computeOfflineCatchUp(elapsedMs, offlinePerSecond.value, perks.value.offshore, modifiers.value.offlineEfficiencyAdd)
      if (catchUp) {
        creditMoney(catchUp.moneyEarned, undefined, ts)
        highestClassReached.value = Math.max(highestClassReached.value, classStatus.value.current.level)
        offlineReport.value = catchUp
        cue('welcomeBack')
        resetTelemetry(telemetry.value, ts, money.value)
      }
    } else {
      const deltaSec = Math.min(5, elapsedMs / 1000)
      if (hustleBonus.value > 0 && ts - lastManualClickAt.value > 1500) {
        const decayRate = Math.max(1, (maxHustle.value - 1) / 2.5)
        hustleBonus.value = Math.max(0, Number((hustleBonus.value - deltaSec * decayRate).toFixed(3)))
      }
      activeGenerationMs.value += Math.min(elapsedMs, 5000)
      dynastyMs.value += Math.min(elapsedMs, 5000)
      office.addCampaignTime(Math.min(elapsedMs, 5000))
      const { business, interns, allowance } = computeIncomeBreakdown(economyInput.value)
      creditMoney(business * deltaSec, 'passive', ts)
      creditClicks((interns + allowance) * deltaSec, 'passive', ts)
      endFinishedFavours(ts)
    }

    refreshSeenItems()
    // Before and after: restocking is what pushes an item back over the line
    runBuyers(ts)
    observeBalance(telemetry.value, ts, money.value)
    if (ts - telemetry.value.lastSampleTs >= 250) {
      sampleTelemetry(telemetry.value, ts, moneyPerSecond.value, money.value, undefined, favourPerSecond.value, passiveSources.value)
    }
    maybeSpawnRandomEvent(ts)
    bosses.evaluateAttempt()
    maybeWaveThrough()
    plays.onTick(ts)
    checkStateAchievements()

    if (ts - lastSavedMs.value >= SAVE_THROTTLE_MS) {
      flushSave(ts)
    }
  }

  function toggleAutoBuy(kind: ItemKind, id: string): void {
    autoBuyDisabled.value[kind][id] = !autoBuyDisabled.value[kind][id]
    flushSave(nowMs.value)
  }

  function isAutoBuyEnabled(kind: ItemKind, id: string): boolean {
    return !autoBuyDisabled.value[kind][id]
  }

  // The first pair of Interns cost nothing, so they simply turn up once the
  // family has Legacy to its name, without a trip to the club
  function grantFreeInterns(): void {
    if (perks.value.autoClicker > 0 || legacyPoints.value < 1) return
    if (scenarioDef.value.blockedPerks.includes('autoClicker')) return
    if (perkNextCost('autoClicker', 0) !== 0) return
    perks.value = { ...perks.value, autoClicker: 1 }
    plays.log(nowMs.value, 'perk', { id: 'autoClicker', rank: 1, free: true })
  }

  function buyPerk(id: PerkId): boolean {
    if (legacyPoints.value < 1 || scenarioDef.value.blockedPerks.includes(id)) {
      return false
    }
    const cost = perkNextCost(id, perks.value[id])
    if (cost === null || legacyAvailable.value < cost) {
      return false
    }
    perks.value[id] += 1
    legacySpent.value += cost
    plays.log(nowMs.value, 'perk', { id, rank: perks.value[id] })
    cue('perk')
    flushSave(nowMs.value)
    return true
  }

  // Claims an opportunity and logs what came of it; scandal choices log themselves
  function claimMarketEventLogged(ts = Date.now(), rng: () => number = Math.random, option?: number): ClaimEventOutcome {
    const kind = activeEvent.value?.def.kind
    const result = claimMarketEvent(ts, rng, option)
    if (kind && result && result !== 'scandal') plays.log(ts, 'event', { kind, result })
    return result
  }

  // Write everything now (leaving the page), including the play log
  function flushAll(ts = Date.now()): void {
    flushSave(ts)
    plays.flush(ts)
  }

  // The save JSON with the play log included, for the Copy save button
  function exportSave(ts = Date.now()): string {
    flushBuyerTally(ts)
    flushAll(ts)
    const key = activeKey('state')
    return key ? withPlayLog(localStorage.getItem(key) ?? '', plays.playLog.value, residentSlot()?.tuning ?? ACTIVE_TUNING) : ''
  }

  function hireAdvisor(offerIndex: number, replaceSeat?: HireTarget): boolean {
    const advisorId = office.headhunterOffer.value[offerIndex]
    const offered = office.headhunterOffer.value.join(',')
    const hired = office.hireAdvisor(offerIndex, replaceSeat)
    if (hired) {
      plays.log(nowMs.value, 'hire', { advisor: advisorId, replaced: replaceSeat !== undefined, offered })
      cue('hire')
    }
    return hired
  }

  function skipAdvisorOffer(): boolean {
    const offered = office.headhunterOffer.value.join(',')
    const skipped = office.skipOffer()
    if (skipped) {
      plays.log(nowMs.value, 'skip-hire', { offered })
      cue('pass')
    }
    return skipped
  }

  // Old School Tie: call in a favour. The first call this generation draws
  // three national events, weighted to what would help the family; the offer
  // stays until one is chosen, so closing the dialog costs nothing.
  function callInFavour(ts = Date.now()): boolean {
    nowMs.value = ts
    if (favoursLeft.value <= 0 || heirChoices.value.length > 0 || disgraceReport.value !== null) return false
    if (favours.value.offer.length === 0) {
      const weights = Object.fromEntries(FAVOUR_EVENTS.map((e) => [e.id, Math.max(0, favourEventValue(e.id))]))
      const offer = pickFavourOffer(Math.random, weights)
      if (offer.length === 0) return false
      favours.value = { ...favours.value, offer }
    }
    favourDialogOpen.value = true
    return true
  }

  function chooseFavour(index: number, ts = Date.now()): boolean {
    nowMs.value = ts
    const id = favours.value.offer[index]
    const def = id ? FAVOUR_EVENTS_BY_ID[id] : undefined
    if (!def || favoursLeft.value <= 0) return false
    favours.value = {
      used: favours.value.used + 1,
      active: [...favours.value.active, { id, untilMs: activeGenerationMs.value + FAVOUR_EVENT_MS }],
      offer: []
    }
    favourDialogOpen.value = false
    plays.log(ts, 'favour', { id })
    cue('perk')
    announce(`${def.title}. ${def.effectText}`)
    flushSave(ts)
    return true
  }

  function closeFavourDialog(): void {
    favourDialogOpen.value = false
  }

  // An event whose time is up ends, and the news says how
  function endFinishedFavours(ts: number): void {
    const now = activeGenerationMs.value
    const ended = favours.value.active.filter((e) => e.untilMs <= now)
    if (ended.length === 0) return
    favours.value = { ...favours.value, active: favours.value.active.filter((e) => e.untilMs > now) }
    const news = ended.map((e) => `${FAVOUR_EVENTS_BY_ID[e.id]?.title ?? 'The favour'}: ${pickEnding(Math.random)}.`)
    announce(news.join(' '))
    plays.log(ts, 'favour-end', {})
  }

  // Running events for the boost strip, soonest to end first
  const activeFavours = computed(() =>
    favours.value.active
      .map((e) => ({ id: e.id, title: FAVOUR_EVENTS_BY_ID[e.id]?.title ?? '', leftMs: e.untilMs - activeGenerationMs.value }))
      .sort((a, b) => a.leftMs - b.leftMs)
  )

  // One favour needs no count, the way Buy doesn't say x1
  const favourButtonLabel = computed(() =>
    favoursTotal.value > 1 ? `Call in a favour (${favoursLeft.value}/${favoursTotal.value})` : 'Call in a favour'
  )

  // The offer on the table, with what each would add right now
  const favourOffer = computed(() =>
    favours.value.offer.flatMap((id) => {
      const def = FAVOUR_EVENTS_BY_ID[id]
      return def ? [{ def, value: favourEventValue(id) }] : []
    })
  )

  // A gate the family has beaten before, with nothing waiting on the player,
  // gets a quiet look now and then: if the family has outgrown its boss it
  // falls at once, and otherwise nothing happened
  let lastProbe = { gate: 0, atMs: 0 }
  function maybeWaveThrough(): void {
    const next = bosses.nextBoss.value
    if (
      bosses.bossAttempt.value ||
      next?.status !== 'available' ||
      bestKillMs.value[next.def.gate] == null ||
      mustHireFirst.value ||
      heirChoices.value.length > 0 ||
      disgraceReport.value !== null
    ) {
      return
    }
    const since = activeGenerationMs.value - lastProbe.atMs
    if (lastProbe.gate === next.def.gate && since >= 0 && since < PROBE_EVERY_MS) return
    lastProbe = { gate: next.def.gate, atMs: activeGenerationMs.value }
    bosses.probeBoss()
  }

  function startBossAttempt(): boolean {
    if (heirChoices.value.length > 0 || disgraceReport.value !== null || mustHireFirst.value || !bosses.startBossAttempt()) {
      return false
    }
    const gate = bosses.bossAttempt.value!.gate
    plays.onBossStart(nowMs.value, gate, {
      netWorth: netWorth.value,
      perClick: moneyPerClick.value,
      perSec: moneyPerSecond.value,
      maxHustle: maxHustle.value,
      target: bossTarget(gate)
    })
    cue('bossStart')
    return true
  }

  function retire(ts = Date.now()): boolean {
    nowMs.value = ts
    const gain = legacyOnRetire.value
    if (!canRetire.value) {
      return false
    }
    if (gatesBeaten.value <= 2) unlockAchievement('early-retirement')
    plays.log(ts, 'retire', { gate: gatesBeaten.value, legacy: gain, netWorth: netWorth.value })
    cue('retire')
    const inheritance = endGeneration(ts, gain)
    plays.resetGateWatch(0)
    announce(
      [
        `Retired with +${gain} Legacy! Your heir inherits ${formatCurrency(inheritance)} and a x${formatMultiplier(legacyMultiplier.value)} income multiplier.`,
        ...officeNews
      ].join(' ')
    )
    flushSave(ts)
    return true
  }

  // Wipe the active bloodline (on boss disgrace or voluntary restart),
  // preserving lifetime meta-progress: achievements, titles and best splits.
  function resetBloodline(ts: number): void {
    const oldSurname = familySurname.value
    let nextSurname = generateSurname(Math.random)
    for (let guard = 0; nextSurname === oldSurname && guard < 10; guard++) {
      nextSurname = generateSurname(Math.random)
    }
    familySurname.value = nextSurname
    heir.value = { name: heirName(Math.random, nextSurname, []), traitId: null }
    heirChoices.value = []
    abdicated.value = false
    siblingChoices.value = []
    generation.value = 1
    familyTree.value = []
    legacyPoints.value = 0
    legacySpent.value = 0
    perks.value = { ...EMPTY_PERKS }
    office.loadState({ seats: [], paChairs: [], offer: [], queued: 0 })
    favours.value = emptyFavours()
    money.value = 0
    spentThisRun.value = 0
    jobsPurchased.value = {}
    businessesOwned.value = {}
    seenItems.value = { jobs: { '1': true }, businesses: { '1': true } }
    gatesBeaten.value = 0
    activeGenerationMs.value = 0
    splits.value = emptySplits()
    lastKillMs.value = emptySplits()
    bosses.bossAttempt.value = null
    bosses.bossCooldownUntilMs.value = 0
    hustleBonus.value = 0
    penalty.value = null
    clickBuff.value = null
    businessBuff.value = null
    autoBuyFrozenUntil.value = 0
    lastAutoBuyAt.value = 0
    activeEvent.value = null
    classModalOpen.value = false
    celebratedClassLevel.value = null
    legacyDrawerOpen.value = false
    successionShop.value = null
    achievementProgress.value = { ...EMPTY_PROGRESS }
    plays.resetGateWatch(0)
    resetTelemetry(telemetry.value, ts, 0)
    refreshSeenItems()
    scheduleNextEvent(ts)
    flushSave(ts)
  }

  function closeLegacyDrawer(): void {
    legacyDrawerOpen.value = false
    successionShop.value = null
  }

  function dismissDisgrace(): void {
    if (!disgraceReport.value) return
    disgraceReport.value = null
    announce(`The ${familySurname.value} bloodline begins from scratch.`)
  }

  function startNewBloodline(ts = Date.now()): void {
    nowMs.value = ts
    disgraceReport.value = null
    plays.log(ts, 'new-bloodline', { generation: generation.value, legacy: legacyPoints.value })
    const previous = familySurname.value
    resetBloodline(ts)
    census.value = { previous, departure: 'folded' }
    censusPending.value = null
    announce(`New bloodline: the ${familySurname.value} family enters the market.`)
  }

  // Close the current generation: record it, pay out Legacy and the trust
  // fund, clear the run and draft the next heirs. Returns the trust fund.
  // Promotions earned by the outgoing generation's PAs, for the retirement news
  let officeNews: string[] = []

  // titlesBefore: on elevation, the titles held before it
  function endGeneration(ts: number, gain: number, elevated = false, titlesBefore = titles.value): number {
    flushBuyerTally(ts)
    achievementProgress.value = { ...EMPTY_PROGRESS }
    const pas = office.paChairs.value.filter((a): a is AdvisorInstance => a !== null)
    const payroll = [...pas, ...office.officeSeats.value.filter((a): a is AdvisorInstance => a !== null)]
    familyTree.value = [
      ...familyTree.value,
      {
        generation: generation.value,
        name: heir.value.name,
        traitId: heir.value.traitId,
        inheritId: heir.value.inheritId ?? null,
        deepestGate: gatesBeaten.value,
        legacyEarned: gain,
        activeMs: activeGenerationMs.value,
        advisors: payroll.map((a) => ADVISORS_BY_ID[a.advisorId]?.name ?? a.advisorId),
        splits: [...splits.value],
        ...(elevated ? { elevated: true, becameTitles: titles.value } : {}),
        titles: titlesBefore,
        pas: pas.flatMap((a) => {
          const standing = paStanding(a)
          return standing ? [paTitle(standing)] : []
        })
      }
    ].slice(-MAX_TREE_ENTRIES)
    // Inheritance isn't earned, so it doesn't count toward lifetime earnings.
    // The trust fund is sized for an heir whose Legacy can hold the parent's
    // depth. An elevated line starts with no Legacy, so it gets none: a fund
    // that buys straight past gates its income can't fight would open bosses
    // it can only lose, and losing ends the line.
    const inheritance = elevated ? 0 : heirInheritance(netWorth.value, gatesBeaten.value, modifiers.value.trustFundShareAdd)
    // The outgoing head's traits now live on familyTree (only the inherited
    // one still counts); clear them here until pickHeir sets the next head
    heir.value = { name: heir.value.name, traitId: null, inheritId: null }
    legacyPoints.value += gain
    grantFreeInterns()
    money.value = inheritance
    spentThisRun.value = 0
    jobsPurchased.value = {}
    businessesOwned.value = {}
    gatesBeaten.value = 0
    activeGenerationMs.value = 0
    penalty.value = null
    heirChoices.value = rollHeirChoices(
      Math.random,
      familySurname.value,
      [...familyTree.value.map((r) => r.name), heir.value.name],
      heirChoiceCount(titles.value)
    )
    abdicated.value = false
    siblingChoices.value = []
    officeNews = office.onRetire()
    // Favours are a generation's; any help still here goes home
    favours.value = emptyFavours()
    splits.value = emptySplits()
    lastKillMs.value = emptySplits()
    bosses.bossAttempt.value = null
    bosses.bossCooldownUntilMs.value = 0
    hustleBonus.value = 0
    clickBuff.value = null
    businessBuff.value = null
    autoBuyFrozenUntil.value = 0
    lastAutoBuyAt.value = 0
    activeEvent.value = null
    resetTelemetry(telemetry.value, ts, money.value)
    refreshSeenItems()
    return inheritance
  }

  // Trade Legacy, perks and the office for permanent Titles. The family
  // name and its records carry on; the PA retires with the old line.
  function elevateToLords(ts = Date.now()): boolean {
    nowMs.value = ts
    const gain = titlesOnElevation.value
    if (!canElevate.value || heirChoices.value.length > 0) {
      return false
    }
    const before = titles.value
    titles.value += gain
    plays.log(ts, 'elevate', { titles: gain })
    cue('elevate')
    endGeneration(ts, 0, true, before)
    // The dukedom: the dynasty is complete, and the finale takes over
    if (titles.value >= DUKE_TITLES) {
      dynastyComplete.value = true
      heirChoices.value = []
      plays.log(ts, 'dukedom', { dynastyMs: dynastyMs.value })
      flushSave(ts)
      return true
    }
    plays.resetGateWatch(0)
    legacyPoints.value = 0
    legacySpent.value = 0
    perks.value = { ...EMPTY_PERKS }
    grantFreeInterns()
    // The PAs hand over to their children, who grew up around the job
    office.onElevate()
    const handover = office.paChairs.value.some((pa) => pa !== null) ? ' Your PAs hand over to their children, who grew up around the job.' : ''
    announce(`Elevated to the Lords! The family now holds ${titles.value} title${titles.value === 1 ? '' : 's'}: ${peerageRank(titles.value)}.${handover}`)
    flushSave(ts)
    return true
  }

  // Abdication: the head of the family steps aside mid-generation and a
  // younger sibling takes over the same estate. Both of the outgoing head's
  // traits go with them, no Legacy is paid and the generation carries on.
  // Only one sibling waits in the wings, and the spare is only ever common.
  const canAbdicate = computed(
    () =>
      heir.value.traitId !== null &&
      !abdicated.value &&
      heirChoices.value.length === 0 &&
      disgraceReport.value === null &&
      bosses.fight.value === null
  )

  function offerAbdication(): boolean {
    if (!canAbdicate.value) return false
    siblingChoices.value = rollHeirChoices(
      Math.random,
      familySurname.value,
      [...familyTree.value.map((r) => r.name), heir.value.name],
      2,
      'common',
      // A sibling never shares the outgoing head's first name
      [heir.value.name.split(' ')[0]]
    )
    return siblingChoices.value.length > 0
  }

  function cancelAbdication(): void {
    siblingChoices.value = []
  }

  function pickSibling(index: number): void {
    const chosen = siblingChoices.value[index]
    if (!chosen || !canAbdicate.value) return
    const outgoing = heir.value.name
    plays.log(nowMs.value, 'abdicate', { from: heir.value.traitId ?? 'none', to: chosen.traitId ?? 'none', inherit: chosen.inheritId ?? 'none' })
    heir.value = chosen
    abdicated.value = true
    cue('abdicate')
    siblingChoices.value = []
    announce(`${outgoing} abdicates. ${chosen.name} takes over the family firm.`)
    flushSave(nowMs.value)
  }

  // Choose who inherits after retiring. The trait applies from now on.
  function pickHeir(index: number): void {
    const chosen = heirChoices.value[index]
    if (!chosen) {
      return
    }
    heir.value = chosen
    cue('heir')
    plays.log(nowMs.value, 'heir', {
      trait: chosen.traitId ?? 'none',
      inherit: chosen.inheritId ?? 'none',
      options: heirChoices.value.length,
      // Every heir on offer, as trait/inherited trait
      offered: heirChoices.value.map((h) => `${h.traitId ?? 'none'}/${h.inheritId ?? 'none'}`).join(',')
    })
    heirChoices.value = []
    generation.value += 1
    money.value *= modifiers.value.trustFundMult
    if (successionShop.value === 'pending') {
      successionShop.value = 'open'
      legacyDrawerOpen.value = true
    }
    announce(`${chosen.name} takes over the family firm.`)
    flushSave(nowMs.value)
  }

  // The current target for a gate's boss, after the heir's trait and advisors
  function bossTarget(gate: number): number {
    const def = bossForGate(gate)
    return def ? conditionTarget(def, bossCountsGain(gate)) : 0
  }

  // A gate past the family's best: its net worth boss counts only what is
  // gained during the fight. The rules for a fight in progress stay as they
  // were when it began.
  function bossCountsGain(gate: number): boolean {
    const attempt = bosses.bossAttempt.value
    if (attempt && attempt.gate === gate) return attempt.countsGain
    return gate > bloodlineDeepestGate.value
  }

  function bossConditionText(gate: number): string {
    const def = bossForGate(gate)
    return def ? conditionTextFor(def, bossCountsGain(gate)) : ''
  }

  function unlockAchievement(id: string): void {
    const def = ACHIEVEMENTS_BY_ID[id]
    if (!def || achievements.value.includes(id)) {
      return
    }
    achievements.value = [...achievements.value, id]
    cue('achievement')
    announce(`Achievement: ${def.name}! Income +${Math.round(ACHIEVEMENT_INCOME_BONUS * 100)}% for good.`)
  }

  // Achievements that follow from the state of play, checked each tick
  function checkStateAchievements(): void {
    if (Object.values(jobsPurchased.value).some((n) => n > 0)) unlockAchievement('side-hustle')
    if (Object.values(businessesOwned.value).some((n) => n > 0)) unlockAchievement('entrepreneur')
    if (netWorth.value >= 1e6) unlockAchievement('comfortably-off')
    if (netWorth.value >= 1e9) unlockAchievement('billionaire')
    if (JOBS.every((j) => (jobsPurchased.value[j.id] ?? 0) > 0)) unlockAchievement('portfolio-career')
    if (office.officeSeats.value.every((s) => s !== null)) unlockAchievement('full-house')
    if (office.paChairs.value.some((pa) => (pa?.servedGenerations ?? 0) >= 3)) unlockAchievement('long-service')
    if (generation.value >= 5) unlockAchievement('dynasty')
  }

  function fireAdvisor(seat: number): void {
    if (office.officeSeats.value[seat]) {
      achievementProgress.value = { ...achievementProgress.value, fires: achievementProgress.value.fires + 1 }
      if (achievementProgress.value.fires >= 5) unlockAchievement('revolving-door')
    }
    office.fireAdvisor(seat)
  }

  function openIntro(): void {
    introOpen.value = true
  }

  function closeIntro(ts = Date.now()): void {
    introOpen.value = false
    if (!introSeen.value) {
      introSeen.value = true
      // Market Opportunities start their countdown once the player is playing
      scheduleNextEvent(ts)
      flushSave(ts)
    }
  }

  // After the dukedom: file the dynasty in the Hall and start a new family
  // with nothing. Achievements and settings stay; they aren't power.
  // next: the scenario the new family plays, once any family has made Duke
  // register: false files the dynasty and readies the next family without
  // writing it in yet, for when the player goes back to the menu instead
  function foundNewDynasty(ts = Date.now(), next: ScenarioId = 'standard', register = true): boolean {
    if (!dynastyComplete.value) return false
    const record: DynastyRecord = {
      surname: familySurname.value,
      finishedAt: ts,
      activeMs: dynastyMs.value,
      roll: [...familyTree.value],
      scenario: scenario.value
    }
    hall.value = addToHall(hall.value, record)
    try {
      localStorage.setItem(HALL_KEY, JSON.stringify(hall.value))
    } catch {
      // A full or blocked store: the Hall lives for this visit only
    }
    // Its seat is given up with it; the next family takes one when written in
    leaveSeat(ts)
    beginDynasty(ts, record.surname, next)
    const entry: CensusEntry = { previous: record.surname, departure: 'duke' }
    if (register) census.value = entry
    else censusPending.value = entry
    return true
  }

  // Give up on the dynasty under way: nothing in the Hall, and its seat and
  // save given up. No family takes its place until one is begun.
  function abandonDynasty(ts = Date.now()): void {
    if (activeSlotId.value === null) return
    const previous = familySurname.value
    plays.log(ts, 'abandon-dynasty', { surname: previous, activeMs: dynastyMs.value })
    leaveSeat(ts)
    beginDynasty(ts, previous, 'standard')
    // The next family's register shows this one struck off
    census.value = null
    censusPending.value = { previous, departure: 'abandoned' }
  }

  // The family in residence gives up its seat, and its save and play log
  function leaveSeat(ts: number): void {
    const id = activeSlotId.value
    if (id === null) return
    removeSlot(id)
    activeSlotId.value = null
    plays.clear(ts)
    saveIndex.value = readIndex()
  }

  function beginDynasty(ts: number, previousSurname: string, next: ScenarioId): void {
    // Scenarios open once a family has made Duke
    const chosen = scenariosOpen(hall.value) ? next : 'standard'
    const record = { surname: previousSurname, activeMs: dynastyMs.value }
    const fresh = createInitialSceneState()
    fresh.achievements = [...achievements.value]
    fresh.bulkBuyMode = bulkBuyMode.value
    fresh.compactAutoBuy = compactAutoBuy.value
    // The player's own choice, unless the old scenario made it for them
    fresh.noTap = scenarioDef.value.noTap === undefined ? noTap.value : false
    fresh.scenario = chosen
    fresh.muted = muted.value
    // A player's very first family still meets the intro
    fresh.introSeen = introSeen.value
    fresh.tradingDeskCollapsed = tradingDeskCollapsed.value
    // Rooms the player has reached stay theirs, and so does the one they chose
    fresh.roomsReached = Math.max(roomsReached.value, highestClassReached.value)
    fresh.decor = decor.value
    // A new surname, never the one just filed
    let surname = generateSurname(Math.random)
    for (let guard = 0; surname === record.surname && guard < 10; guard++) surname = generateSurname(Math.random)
    fresh.familySurname = surname
    applyLoadedState(fresh, ts)
    offlineReport.value = null
    legacyDrawerOpen.value = false
    successionShop.value = null
    plays.log(ts, 'new-dynasty', { previous: record.surname, activeMs: record.activeMs, scenario: chosen })
    announce(`A new dynasty: the ${surname} family enters the market with nothing but ambition.`)
    flushSave(ts)
  }

  function openMenu(page: 'main' | 'found' | 'scenario' = 'main'): void {
    menuPage.value = page
    menuOpen.value = true
  }

  // Write a family that hasn't started into the register, from the menu
  function openCensus(): void {
    census.value = censusPending.value ?? { previous: null, departure: null }
    censusPending.value = null
  }

  // The ink is dry: into the game, the family in a seat of its own
  function closeCensus(ts = Date.now()): void {
    census.value = null
    if (activeSlotId.value === null) {
      claimFamilySeat(ts)
      flushSave(ts)
    }
    if (menuOpen.value) closeMenu(ts)
    else lastTickMs.value = ts
  }

  function closeMenu(ts = Date.now()): void {
    menuOpen.value = false
    // The clock starts again from here, not from when the menu opened
    lastTickMs.value = ts
  }

  function hardReset(ts = Date.now()): void {
    census.value = null
    censusPending.value = null
    const fresh = createInitialSceneState()
    applyLoadedState(fresh, ts)
    // Achievements and settings are the player's, not this family's
    applyProfile()
    plays.clear(ts)
    offlineReport.value = null
    bannerMessage.value = null
    legacyDrawerOpen.value = false
    successionShop.value = null
    flushSave(ts)
  }

  function dismissOfflineReport(): void {
    offlineReport.value = null
  }

  function toggleMute(): void {
    muted.value = !muted.value
    flushSave(nowMs.value)
  }

  function setBulkBuyMode(mode: BulkBuyMode): void {
    bulkBuyMode.value = mode
    flushSave(nowMs.value)
  }

  function toggleCompactAutoBuy(): void {
    compactAutoBuy.value = !compactAutoBuy.value
    flushSave(nowMs.value)
  }

  // Pin a room the family has reached, or 'auto' to follow the current class
  function setDecor(choice: RoomId | 'auto'): void {
    if (choice !== 'auto' && !unlockedRooms.value.some((r) => r.id === choice)) return
    decor.value = choice
    flushSave(nowMs.value)
  }

  // Any time, either way: the allowance and tapping never come together
  function toggleNoTap(): void {
    if (scenarioDef.value.noTap !== undefined) return
    noTap.value = !noTap.value
    hustleBonus.value = 0
    flushSave(nowMs.value)
  }

  function itemIncomeDelta(kind: ItemKind, id: string, count: number): IncomeDeltaQuote {
    return quoteIncomeDelta(kind, id, count, economyInput.value)
  }

  function toggleTradingDesk(): void {
    tradingDeskCollapsed.value = !tradingDeskCollapsed.value
    flushSave(nowMs.value)
  }

  function openClassPyramid(): void {
    celebratedClassLevel.value = null
    classModalOpen.value = true
  }

  function closeClassModal(): void {
    classModalOpen.value = false
    celebratedClassLevel.value = null
  }

  return {
    money,
    spentThisRun,
    jobsPurchased,
    businessesOwned,
    legacyPoints,
    legacySpent,
    perks,
    lifetimePurchases,
    autoBuyDisabled,
    seenItems,
    lifetimeEarned,
    highestClassReached,
    bulkBuyMode,
    buyersPaused,
    compactAutoBuy,
    decor,
    unlockedRooms,
    activeRoom,
    setDecor,
    noTap,
    toggleNoTap,
    settingsOpen,
    sfxQueue,
    muted,
    introSeen,
    introOpen,
    openIntro,
    closeIntro,
    tradingDeskCollapsed,
    lastUpdate,
    nowMs,
    telemetry,
    hustleBonus,
    activeEvent,
    offlineReport,
    bannerMessage,
    lastVictory,
    disgraceReport,
    dismissDisgrace,
    startNewBloodline,
    legacyDrawerOpen,
    successionShop,
    closeLegacyDrawer,
    classModalOpen,
    celebratedClassLevel,
    netWorth,
    gatesBeaten,
    bloodlineDeepestGate,
    minRetireGate,
    canRetire,
    handleClassPromotion,
    familySurname,
    heir,
    heirChoices,
    abdicated,
    siblingChoices,
    canAbdicate,
    offerAbdication,
    cancelAbdication,
    pickSibling,
    generation,
    bloodlineTraitPills,
    allowancePill,
    wording,
    modifiers,
    pickHeir,
    bossTarget,
    bossCountsGain,
    bossConditionText,
    familyTree,
    familyTreeOpen,
    hallOpen,
    menuOpen,
    menuPage,
    census,
    familyIsFresh,
    openCensus,
    closeCensus,
    openMenu,
    closeMenu,
    abandonDynasty,
    officeSeats: office.officeSeats,
    paChairs: office.paChairs,
    headhunterOffer: office.headhunterOffer,
    queuedOffers: office.queuedOffers,
    hireAdvisor,
    skipAdvisorOffer,
    playLog: plays.playLog,
    flushAll,
    exportSave,
    rollOffer: office.rollOffer,
    waitingOffers: office.waitingOffers,
    offerOptional: office.offerOptional,
    closeOffer: office.closeOffer,
    showWaitingOffer: office.showWaitingOffer,
    mustHireFirst,
    fireAdvisor,
    achievements,
    achievementsOpen,
    titles,
    dynastyMs,
    dynastyComplete,
    scenario,
    scenarioDef,
    hall,
    foundNewDynasty,
    titlesOnElevation,
    canElevate,
    elevateToLords,
    firePA: office.firePA,
    promoteToPA: office.promoteToPA,
    replacedBuyer: office.replacedBuyer,
    costCeiling,
    activeGenerationMs,
    bossAttempt: bosses.bossAttempt,
    twist,
    nextBoss: bosses.nextBoss,
    canBackOut: bosses.canBackOut,
    backOutSec: bosses.backOutSec,
    startBossAttempt,
    favours,
    favoursTotal,
    favoursLeft,
    offlinePerSecond,
    favourPerSecond,
    favourDialogOpen,
    favourButtonLabel,
    favourOffer,
    activeFavours,
    callInFavour,
    chooseFavour,
    closeFavourDialog,
    favourEventValue,
    abandonBossAttempt: bosses.abandonBossAttempt,
    classStatus,
    legacyMultiplier,
    legacyAvailable,
    legacyOnRetire,
    splits,
    bestSplits,
    lastKillMs,
    bestKillMs,
    heirInheritancePreview,
    autoClickers,
    maxHustle,
    hustleMultiplier,
    activeClickBuff,
    activeBusinessBuff,
    isAutoBuyFrozen,
    incomePenalty,
    autoBuyFreezeRemainingSec,
    economyInput,
    moneyPerClick,
    baseMoneyPerClick,
    jobBaseEconomyInput,
    jobBaseMoneyPerClick,
    moneyPerSecond,
    realisedPerSecond,
    manualRealisedPerSecond,
    sectorSlices,
    dominanceHeld,
    awards,
    saveIndex,
    activeSlotId,
    hasFamily,
    seatsFull,
    familyTuning,
    canAddSave,
    refreshSaves,
    playSave,
    beginNewFamily,
    removeSave,
    importSave,
    exportSlot,
    passiveSources,
    allowanceLabel,
    allowancePerSecond,
    allowanceTapRate,
    visibleJobs,
    visibleBusinesses,
    hydrateFromStorage,
    flushSave,
    addDebugMoney,
    itemQuote,
    itemIncomeDelta,
    buyItem,
    manualClick,
    spawnSpecificEvent,
    claimMarketEvent: claimMarketEventLogged,
    tick,
    toggleAutoBuy,
    isAutoBuyEnabled,
    buyers,
    hasBuyers,
    buyerWorking,
    toggleBuyersPaused,
    buyPerk,
    retire,
    hardReset,
    dismissOfflineReport,
    toggleMute,
    setBulkBuyMode,
    toggleCompactAutoBuy,
    toggleTradingDesk,
    openClassPyramid,
    closeClassModal
  }
})
