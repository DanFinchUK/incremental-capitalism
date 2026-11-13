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
  RARITY_LABELS,
  pickMarketEvent,
  type MarketEventDef,
  type MarketEventKind,
  type ScandalOutcome
} from '../data/events'
import { EMPTY_PERKS, perkNextCost, type PerkId, type PerkRanks } from '../data/perks'
import {
  bulkBuyQuote,
  computeClickIncome,
  computeIncomeBreakdown,
  heirInheritance,
  computeOfflineCatchUp,
  computePassivePerSecond,
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
  STORAGE_KEY,
  createInitialSceneState,
  parseSavedState,
  serializeState,
  type PersistedSceneState
} from '../engine/migration'
import {
  createTelemetryState,
  currentManualPerSec,
  currentRealisedPerSec,
  markTelemetryEvent,
  observeBalance,
  recordIncome,
  resetTelemetry,
  sampleTelemetry,
  type IncomeSource,
  type TelemetryState
} from '../engine/telemetry'
import { formatCurrency, formatDuration, formatMultiplier } from '../utils/format'
import { bossForGate, conditionTarget, itemCostCeiling, legacyForDepth } from '../engine/bosses'
import { combineModifiers, type ModifierSource } from '../engine/modifiers'
import { TRAITS_BY_ID, generateSurname, heirName, rollHeirChoices, type Heir } from '../data/heirs'
import { createPlayLogModule } from './modules/playLog'
import { loadPlayLog, withPlayLog } from '../engine/playLog'
import { MAX_AUTOMATION_PURCHASES_PER_TICK, automationShare, isWithinAutomationLine } from '../engine/automation'
import { emptySplits, mergeBests, withSplit } from '../engine/splits'
import { createBossModule } from './modules/bosses'
import { createOfficeModule } from './modules/office'
import { MAX_TREE_ENTRIES, type GenerationRecord } from '../engine/family'
import { heirChoiceCount, peerageRank, titleExtraSeats, titleSource, titlesFor } from '../engine/peerage'
import { ACHIEVEMENTS_BY_ID, ACHIEVEMENT_INCOME_BONUS, EMPTY_PROGRESS, type AchievementProgress } from '../data/achievements'
import type { AdvisorInstance } from '../engine/office'
import { ADVISORS_BY_ID } from '../data/advisors'

export type VisibleRow<T> =
  | { mode: 'revealed'; item: T }
  | { mode: 'teaser'; key: string }
  | { mode: 'gated'; key: string; bossTitle: string }

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

const SAVE_THROTTLE_MS = 2000
const AUTO_BUY_COOLDOWN_MS = 1000
// Income multiplier while a freeze lands on a family with no automation
const FREEZE_INCOME_MULT = 0.5

function achievementSource(count: number): ModifierSource {
  const mult = 1 + ACHIEVEMENT_INCOME_BONUS * count
  return { clickMult: mult, businessMult: mult }
}

export const useGameStore = defineStore('game', () => {
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
  const autoBuyPaused = ref<boolean>(initial.autoBuyPaused)
  const compactAutoBuy = ref<boolean>(initial.compactAutoBuy)
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
  const legacyDrawerOpen = ref<boolean>(false)
  const classModalOpen = ref<boolean>(false)
  const celebratedClassLevel = ref<number | null>(null)

  const netWorth = computed(() => money.value + spentThisRun.value)
  const gatesBeaten = ref<number>(initial.gatesBeaten)
  const familySurname = ref<string>(initial.familySurname)
  const heir = ref<Heir>(initial.heir ?? { name: '', traitId: null })
  const heirChoices = ref<Heir[]>(initial.heirChoices)
  const generation = ref<number>(initial.generation)
  const familyTree = ref<GenerationRecord[]>(initial.familyTree)
  const familyTreeOpen = ref(false)
  const achievements = ref<string[]>(initial.achievements)
  const achievementProgress = ref<AchievementProgress>(initial.achievementProgress)
  const achievementsOpen = ref(false)
  const titles = ref<number>(initial.titles)
  // Elevation needs the Royal Garden Party beaten at least once, ever
  const titlesOnElevation = computed(() => titlesFor(legacyPoints.value))
  const canElevate = computed(() => bestSplits.value[9] != null && titlesOnElevation.value >= 1)
  const office = createOfficeModule({
    money,
    extraSeats: () => perks.value.officeSeats + titleExtraSeats(titles.value),
    announce: (msg) => announce(msg),
    flushSave: () => flushSave(nowMs.value)
  })
  // Every rule-bending source in play: the heir's trait and the family office
  const modifiers = computed(() =>
    combineModifiers([
      ...(heir.value.traitId && TRAITS_BY_ID[heir.value.traitId] ? [TRAITS_BY_ID[heir.value.traitId].mods] : []),
      ...office.officeSources.value,
      achievementSource(achievements.value.length),
      titleSource(titles.value)
    ])
  )
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
    announce: (msg) => announce(msg),
    onBossWon: (gate, killMs, purchases) => {
      if (gate === 1) unlockAchievement('solidarity')
      if (gate === 4 && purchases <= 10) unlockAchievement('under-par')
      if (gate === 6) unlockAchievement('silver-service')
      if (gate === 9) unlockAchievement('garden-party')
      if (killMs <= 3000) unlockAchievement('no-sweat')
      splits.value = withSplit(splits.value, gate, activeGenerationMs.value)
      lastKillMs.value = withSplit(lastKillMs.value, gate, killMs)
      bestSplits.value = mergeBests(bestSplits.value, splits.value)
      bestKillMs.value = mergeBests(bestKillMs.value, lastKillMs.value)
      office.rollOffer()
    },
    bestKillFor: (gate) => bestKillMs.value[gate] ?? null,
    bossTimeMult: () => modifiers.value.bossTimeMult,
    twistStrength: () => modifiers.value.twistStrength,
    onAttemptEnded: (ended) => {
      plays.onAttemptEnded(nowMs.value, ended)
      // Corked bottles belong to the tasting; they leave with the sommelier
      if (activeEvent.value?.corked) {
        activeEvent.value = null
      }
    }
  })
  const twist = bosses.twist
  const plays = createPlayLogModule(loadPlayLog(), {
    generation: () => generation.value,
    activeMs: () => activeGenerationMs.value,
    netWorth: () => netWorth.value,
    openGate: () => {
      const boss = bosses.nextBoss.value
      return boss && boss.status !== 'locked' ? boss.def.gate : null
    },
    attempt: () => {
      const tracker = bosses.bossAttempt.value
      const boss = bosses.nextBoss.value
      return tracker && boss ? { gate: tracker.gate, startedActiveMs: tracker.startedActiveMs, progress: boss.progress } : null
    },
    hustle: () => hustleMultiplier.value
  })
  plays.resetGateWatch(initial.gatesBeaten)
  const classStatus = computed(() => classInfoForLevel(gatesBeaten.value, netWorth.value))
  const costCeiling = computed(() => itemCostCeiling(gatesBeaten.value))
  const heirInheritancePreview = computed(() => heirInheritance(netWorth.value, modifiers.value.trustFundShareAdd))
  const legacyMultiplier = computed(() => calcLegacyMultiplier(legacyPoints.value, modifiers.value.legacyScale))
  const legacyAvailable = computed(() => Math.max(0, legacyPoints.value - legacySpent.value))
  const legacyOnRetire = computed(() => legacyForDepth(gatesBeaten.value))
  const autoClickers = computed(() => (modifiers.value.internsDisabled ? 0 : perks.value.autoClicker))
  const maxHustle = computed(() => maxHustleMultiplier(perks.value.hustleCap))
  const hustleMultiplier = computed(() => 1 + hustleBonus.value)

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
    mods: modifiers.value
  }))

  // Share of cash under which an item's next unit restocks itself
  const automationLine = computed(() => automationShare(perks.value.nepotism, modifiers.value.automationShareBonus))

  const moneyPerClick = computed(() => computeClickIncome(economyInput.value, true))
  const baseMoneyPerClick = computed(() => computeClickIncome(economyInput.value, false))
  const moneyPerSecond = computed(() => computePassivePerSecond(economyInput.value))
  // Income ignoring Market Opportunity buffs, so windfalls can't stack on them
  const unbuffedMoneyPerSecond = computed(() =>
    computePassivePerSecond({ ...economyInput.value, businessBuffMultiplier: 1, clickBuffMultiplier: 1 })
  )
  const realisedPerSecond = computed(() => currentRealisedPerSec(telemetry.value, nowMs.value))
  const manualRealisedPerSecond = computed(() => currentManualPerSec(telemetry.value, nowMs.value))
  const sectorSlices = computed(() => computeSectorSlices(economyInput.value, manualRealisedPerSecond.value))

  function refreshSeenItems(): void {
    for (let i = 0; i < JOBS.length; i++) {
      const job = JOBS[i]
      const prev = i > 0 ? JOBS[i - 1] : null
      const prevOwned = prev ? ((jobsPurchased.value[prev.id] ?? 0) > 0 || (lifetimePurchases.value.jobs[prev.id] ?? 0) > 0) : false
      if (job.baseCost > costCeiling.value) {
        continue
      }
      if (
        i === 0 ||
        (jobsPurchased.value[job.id] ?? 0) > 0 ||
        (lifetimePurchases.value.jobs[job.id] ?? 0) > 0 ||
        money.value >= 0.5 * job.baseCost ||
        prevOwned
      ) {
        seenItems.value.jobs[job.id] = true
      }
    }
    for (let i = 0; i < BUSINESSES.length; i++) {
      const biz = BUSINESSES[i]
      const prev = i > 0 ? BUSINESSES[i - 1] : null
      const prevOwned = prev
        ? ((businessesOwned.value[biz.id] ?? 0) > 0 || (lifetimePurchases.value.businesses[biz.id] ?? 0) > 0)
        : false
      if (biz.baseCost > costCeiling.value) {
        continue
      }
      if (
        i === 0 ||
        (businessesOwned.value[biz.id] ?? 0) > 0 ||
        (lifetimePurchases.value.businesses[biz.id] ?? 0) > 0 ||
        money.value >= 0.5 * biz.baseCost ||
        prevOwned
      ) {
        seenItems.value.businesses[biz.id] = true
      }
    }
  }

  function buildVisibleList<T extends { id: string; baseCost: number }>(
    items: ReadonlyArray<T>,
    seenMap: Readonly<Record<string, boolean>>,
    prefix: string
  ): VisibleRow<T>[] {
    // Items are listed cheapest first, so everything up to the last seen
    // item under the ceiling is revealed.
    let highestSeen = -1
    for (let i = 0; i < items.length; i++) {
      if (items[i].baseCost <= costCeiling.value && seenMap[items[i].id]) {
        highestSeen = i
      }
    }
    const rows: VisibleRow<T>[] = []
    for (let i = 0; i <= highestSeen; i++) {
      rows.push({ mode: 'revealed', item: items[i] })
    }
    const next = items[highestSeen + 1]
    if (next && next.baseCost > costCeiling.value) {
      rows.push({ mode: 'gated', key: `${prefix}-gated-${next.id}`, bossTitle: bossForGate(gatesBeaten.value + 1)?.title ?? '' })
    } else if (next) {
      rows.push({ mode: 'teaser', key: `${prefix}-teaser-${next.id}` })
    }
    return rows
  }

  const visibleJobs = computed<VisibleRow<JobDef>[]>(() =>
    buildVisibleList(JOBS, seenItems.value.jobs, 'job')
  )
  const visibleBusinesses = computed<VisibleRow<BusinessDef>[]>(() =>
    buildVisibleList(BUSINESSES, seenItems.value.businesses, 'biz')
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
      generation: generation.value,
      office: office.snapshot(),
      familyTree: familyTree.value,
      achievements: achievements.value,
      titles: titles.value,
      achievementProgress: achievementProgress.value,
      bulkBuyMode: bulkBuyMode.value,
      autoBuyPaused: autoBuyPaused.value,
      compactAutoBuy: compactAutoBuy.value,
      muted: muted.value,
      introSeen: introSeen.value,
      tradingDeskCollapsed: tradingDeskCollapsed.value,
      lastUpdate: ts
    }
  }

  function flushSave(ts = nowMs.value): void {
    lastUpdate.value = ts
    lastSavedMs.value = ts
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(snapshotPersisted(ts)))
    } catch {
      // Ignore storage quota or private-browsing write errors
    }
  }

  function scheduleNextEvent(fromMs: number, rng: () => number = Math.random): void {
    const delaySec = (45 + rng() * 45) * Math.pow(0.85, perks.value.insider) * modifiers.value.eventIntervalMult
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
    generation.value = loaded.generation
    office.loadState(loaded.office)
    familyTree.value = loaded.familyTree
    achievements.value = loaded.achievements
    titles.value = loaded.titles
    achievementProgress.value = loaded.achievementProgress
    penalty.value = null
    bosses.bossAttempt.value = null
    bosses.bossCooldownUntilMs.value = 0
    bulkBuyMode.value = loaded.bulkBuyMode
    autoBuyPaused.value = loaded.autoBuyPaused
    compactAutoBuy.value = loaded.compactAutoBuy
    muted.value = loaded.muted
    introSeen.value = loaded.introSeen
    introOpen.value = !loaded.introSeen
    tradingDeskCollapsed.value = loaded.tradingDeskCollapsed
    lastUpdate.value = loaded.lastUpdate
    plays.resetGateWatch(loaded.gatesBeaten)
    nowMs.value = ts
    lastTickMs.value = ts
    lastAutoBuyAt.value = 0
    hustleBonus.value = 0
    clickBuff.value = null
    businessBuff.value = null
    autoBuyFrozenUntil.value = 0
    activeEvent.value = null
    classModalOpen.value = false
    celebratedClassLevel.value = null
    resetTelemetry(telemetry.value, ts, loaded.money)
    refreshSeenItems()
    scheduleNextEvent(ts)
  }

  function hydrateFromStorage(ts = Date.now()): void {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch {
      raw = null
    }
    const loaded = parseSavedState(raw)
    applyLoadedState(loaded, ts)

    // No catch-up while the succession is undecided: the family is in mourning
    if (loaded.lastUpdate !== null && ts > loaded.lastUpdate && heirChoices.value.length === 0) {
      const catchUp = computeOfflineCatchUp(ts - loaded.lastUpdate, moneyPerSecond.value, perks.value.offshore)
      if (catchUp) {
        // Through creditMoney, so advisor drain applies offline too
        creditMoney(catchUp.moneyEarned, undefined, ts)
        highestClassReached.value = Math.max(highestClassReached.value, classStatus.value.current.level)
        offlineReport.value = catchUp
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
    markTelemetryEvent(telemetry.value, 'M')
    if (newClass > highestClassReached.value) {
      highestClassReached.value = newClass
      celebratedClassLevel.value = newClass
      classModalOpen.value = true
    } else {
      announce(`Promoted to ${classStatus.value.current.label}! (${classStatus.value.current.perkSummary})`)
    }
    return true
  }

  function itemQuote(kind: ItemKind, id: string, modeOverride?: BulkBuyMode) {
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
      money.value
    )
  }

  // save: manual purchases save at once; automation relies on the throttled tick save
  function buyItem(kind: ItemKind, id: string, modeOverride?: BulkBuyMode, save = true): { bought: number; hitMilestone: boolean; promotedClass: boolean } {
    const quote = itemQuote(kind, id, modeOverride)
    const gatedDef = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]
    if (!quote.canAfford || quote.count < 1 || !gatedDef || gatedDef.baseCost > costCeiling.value) {
      return { bought: 0, hitMilestone: false, promotedClass: false }
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
    }
    map[id] = nextOwned
    lifeMap[id] = (lifeMap[id] ?? 0) + quote.count
    observeBalance(telemetry.value, nowMs.value, money.value)

    refreshSeenItems()

    const crossedMilestone = itemMilestones(def.scaleFactor).filter((m) => prevOwned < m && nextOwned >= m).pop() ?? null
    const promoted = false
    // Automation crosses milestones quietly; only your own purchases get a banner
    if (crossedMilestone !== null && save) {
      markTelemetryEvent(telemetry.value, 'M')
      const step = (2 + 0.25 * perks.value.deregulation + modifiers.value.milestoneStepBonus).toFixed(2).replace(/\.00$/, '')
      announce(`${def.label} hit ${crossedMilestone} owned: ${step}x output milestone!`)
    }

    if (save) {
      plays.log(nowMs.value, 'buy', { kind, id, n: quote.count, cost: quote.cost, owned: nextOwned })
      flushSave(nowMs.value)
    }
    return {
      bought: quote.count,
      hitMilestone: crossedMilestone !== null,
      promotedClass: promoted
    }
  }

  function isAutomated(kind: ItemKind, id: string): boolean {
    if (autoBuyDisabled.value[kind][id] || twist.value.automationPaused || isAutoBuyFrozen.value) {
      return false
    }
    const def = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]
    if (!def || def.baseCost > costCeiling.value) {
      return false
    }
    return isWithinAutomationLine(itemQuote(kind, id, 1).cost, money.value, automationLine.value)
  }

  // Once a second, restock every item behind the automation line, cheapest
  // first, up to a cap so a huge bank balance can't stall a tick.
  function runAutoBuy(ts: number): void {
    if (isAutoBuyFrozen.value || autoBuyPaused.value || twist.value.automationPaused) {
      return
    }
    if (lastAutoBuyAt.value > 0 && ts - lastAutoBuyAt.value < AUTO_BUY_COOLDOWN_MS) {
      return
    }
    const candidates: Array<{ kind: ItemKind; id: string }> = [
      ...visibleJobs.value.flatMap((r) => (r.mode === 'revealed' ? [{ kind: 'jobs' as const, id: r.item.id }] : [])),
      ...visibleBusinesses.value.flatMap((r) => (r.mode === 'revealed' ? [{ kind: 'businesses' as const, id: r.item.id }] : []))
    ]
    let bought = 0
    while (bought < MAX_AUTOMATION_PURCHASES_PER_TICK) {
      let cheapest: { kind: ItemKind; id: string; cost: number } | null = null
      for (const c of candidates) {
        if (!isAutomated(c.kind, c.id)) continue
        const cost = itemQuote(c.kind, c.id, 1).cost
        if (!cheapest || cost < cheapest.cost) cheapest = { ...c, cost }
      }
      if (!cheapest || buyItem(cheapest.kind, cheapest.id, 1, false).bought === 0) {
        break
      }
      bought += 1
    }
    if (bought > 0) {
      lastAutoBuyAt.value = ts
    }
  }

  function manualClick(ts = Date.now()): number {
    nowMs.value = ts
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

  // Click income (manual or Interns) during a boss can count towards the
  // Walkout or be diverted into polishing the family silver.
  function creditClicks(amount: number, source: IncomeSource, ts: number): void {
    const attempt = bosses.bossAttempt.value
    if (attempt && hustleMultiplier.value >= maxHustle.value - 0.01) {
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
    if (automationLine.value > 0) {
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
    const durationMult = 1 + 0.25 * perks.value.insider
    const def = ev.def
    const effect = def.effect
    const rarityPrefix = def.rarity === 'common' ? '' : `${RARITY_LABELS[def.rarity]}! `
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
      markTelemetryEvent(telemetry.value, '★')
      if (current && current.mult > effect.mult) {
        // Never downgrade a stronger buff that is still running
        announce(`${name}: your ${current.mult}x ${current.label} is stronger, so it keeps running.`)
      } else {
        slot.value = { kind: def.kind, label: def.buffLabel, mult: effect.mult, until: ts + dur * 1000 }
        announce(`${rarityPrefix}${name}: ${effect.mult}x ${target} income for ${dur}s!`)
      }
      flushSave(ts)
      return 'golden'
    }
    if (effect.type === 'windfall') {
      const windfall = Math.max(500, unbuffedMoneyPerSecond.value * effect.seconds) * modifiers.value.windfallMult
      markTelemetryEvent(telemetry.value, '★')
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
      markTelemetryEvent(telemetry.value, '★')
      creditMoney(windfall, 'windfall', ts)
      refreshSeenItems()
      announce(`VIP-Lane Contract Approved! ${formatDuration(effect.winSeconds)} passive windfall!`)
      flushSave(ts)
      return 'shadyWin'
    }
    applyFreeze(effect.freezeSec * 1000, ts)
    announce(
      automationLine.value > 0
        ? `Select Committee Inquiry! Automation paused for ${effect.freezeSec}s (cash untouched).`
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
    if (heirChoices.value.length > 0) {
      // The family waits for the succession to be settled
      return
    }

    if (elapsedMs >= 60_000) {
      // Time away abandons a boss fight (no cooldown), so offline income
      // can never win it
      if (bosses.bossAttempt.value) {
        plays.log(ts, 'boss-end', { gate: bosses.bossAttempt.value.gate, result: 'away' })
      }
      plays.log(ts, 'away', { ms: elapsedMs })
      bosses.bossAttempt.value = null
      const catchUp = computeOfflineCatchUp(elapsedMs, moneyPerSecond.value, perks.value.offshore)
      if (catchUp) {
        creditMoney(catchUp.moneyEarned, undefined, ts)
        highestClassReached.value = Math.max(highestClassReached.value, classStatus.value.current.level)
        offlineReport.value = catchUp
        resetTelemetry(telemetry.value, ts, money.value)
      }
    } else {
      const deltaSec = Math.min(5, elapsedMs / 1000)
      if (hustleBonus.value > 0 && ts - lastManualClickAt.value > 1500) {
        const decayRate = Math.max(1, (maxHustle.value - 1) / 2.5)
        hustleBonus.value = Math.max(0, Number((hustleBonus.value - deltaSec * decayRate).toFixed(3)))
      }
      activeGenerationMs.value += Math.min(elapsedMs, 5000)
      office.addCampaignTime(Math.min(elapsedMs, 5000))
      const { business, interns } = computeIncomeBreakdown(economyInput.value)
      creditMoney(business * deltaSec, 'passive', ts)
      creditClicks(interns * deltaSec, 'passive', ts)
    }

    refreshSeenItems()
    runAutoBuy(ts)
    observeBalance(telemetry.value, ts, money.value)
    if (ts - telemetry.value.lastSampleTs >= 250) {
      sampleTelemetry(telemetry.value, ts, moneyPerSecond.value, money.value)
    }
    maybeSpawnRandomEvent(ts)
    bosses.evaluateAttempt()
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

  function buyPerk(id: PerkId): boolean {
    if (legacyPoints.value < 1) {
      return false
    }
    const cost = perkNextCost(id, perks.value[id])
    if (cost === null || legacyAvailable.value < cost) {
      return false
    }
    perks.value[id] += 1
    legacySpent.value += cost
    plays.log(nowMs.value, 'perk', { id, rank: perks.value[id] })
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
    flushAll(ts)
    return withPlayLog(localStorage.getItem(STORAGE_KEY) ?? '', plays.playLog.value)
  }

  function hireAdvisor(offerIndex: number, replaceSeat?: number): boolean {
    const advisorId = office.headhunterOffer.value[offerIndex]
    const hired = office.hireAdvisor(offerIndex, replaceSeat)
    if (hired) plays.log(nowMs.value, 'hire', { advisor: advisorId, replaced: replaceSeat !== undefined })
    return hired
  }

  function startBossAttempt(): boolean {
    if (heirChoices.value.length > 0 || !bosses.startBossAttempt()) {
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
    return true
  }

  function retire(ts = Date.now()): boolean {
    nowMs.value = ts
    const gain = legacyOnRetire.value
    if (gatesBeaten.value < 1 || gain < 1 || heirChoices.value.length > 0) {
      return false
    }
    if (gatesBeaten.value <= 2) unlockAchievement('early-retirement')
    plays.log(ts, 'retire', { gate: gatesBeaten.value, legacy: gain, netWorth: netWorth.value })
    const inheritance = endGeneration(ts, gain)
    plays.resetGateWatch(0)
    announce(
      `Retired with +${gain} Legacy! Your heir inherits ${formatCurrency(inheritance)} and a x${formatMultiplier(legacyMultiplier.value)} income multiplier.`
    )
    flushSave(ts)
    return true
  }

  // Close the current generation: record it, pay out Legacy and the trust
  // fund, clear the run and draft the next heirs. Returns the trust fund.
  function endGeneration(ts: number, gain: number): number {
    achievementProgress.value = { ...EMPTY_PROGRESS }
    const payroll = [office.paChair.value, ...office.officeSeats.value].filter((a): a is AdvisorInstance => a !== null)
    familyTree.value = [
      ...familyTree.value,
      {
        generation: generation.value,
        name: heir.value.name,
        traitId: heir.value.traitId,
        deepestGate: gatesBeaten.value,
        legacyEarned: gain,
        activeMs: activeGenerationMs.value,
        advisors: payroll.map((a) => ADVISORS_BY_ID[a.advisorId]?.name ?? a.advisorId),
        splits: [...splits.value]
      }
    ].slice(-MAX_TREE_ENTRIES)
    // Inheritance isn't earned, so it doesn't count toward lifetime earnings
    const inheritance = heirInheritance(netWorth.value, modifiers.value.trustFundShareAdd)
    legacyPoints.value += gain
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
    office.onRetire()
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
    titles.value += gain
    plays.log(ts, 'elevate', { titles: gain })
    endGeneration(ts, 0)
    plays.resetGateWatch(0)
    legacyPoints.value = 0
    legacySpent.value = 0
    perks.value = { ...EMPTY_PERKS }
    office.firePA()
    announce(`Elevated to the Lords! The family now holds ${titles.value} title${titles.value === 1 ? '' : 's'}: ${peerageRank(titles.value)}.`)
    flushSave(ts)
    return true
  }

  // Choose who inherits after retiring. The trait applies from now on.
  function pickHeir(index: number): void {
    const chosen = heirChoices.value[index]
    if (!chosen) {
      return
    }
    heir.value = chosen
    plays.log(nowMs.value, 'heir', { trait: chosen.traitId ?? 'none', options: heirChoices.value.length })
    heirChoices.value = []
    generation.value += 1
    money.value *= modifiers.value.trustFundMult
    announce(`${chosen.name} takes over the family firm.`)
    flushSave(nowMs.value)
  }

  // The current target for a gate's boss, after the heir's trait and advisors
  function bossTarget(gate: number): number {
    const def = bossForGate(gate)
    return def ? conditionTarget(def) : 0
  }

  function unlockAchievement(id: string): void {
    const def = ACHIEVEMENTS_BY_ID[id]
    if (!def || achievements.value.includes(id)) {
      return
    }
    achievements.value = [...achievements.value, id]
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
    if ((office.paChair.value?.servedGenerations ?? 0) >= 3) unlockAchievement('long-service')
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

  function hardReset(ts = Date.now()): void {
    const fresh = createInitialSceneState()
    applyLoadedState(fresh, ts)
    plays.clear(ts)
    offlineReport.value = null
    bannerMessage.value = null
    legacyDrawerOpen.value = false
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

  function toggleAutoBuyPaused(): void {
    autoBuyPaused.value = !autoBuyPaused.value
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
    autoBuyPaused,
    compactAutoBuy,
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
    legacyDrawerOpen,
    classModalOpen,
    celebratedClassLevel,
    netWorth,
    gatesBeaten,
    handleClassPromotion,
    familySurname,
    heir,
    heirChoices,
    generation,
    modifiers,
    pickHeir,
    bossTarget,
    familyTree,
    familyTreeOpen,
    officeSeats: office.officeSeats,
    paChair: office.paChair,
    headhunterOffer: office.headhunterOffer,
    hireAdvisor,
    playLog: plays.playLog,
    flushAll,
    exportSave,
    skipOffer: office.skipOffer,
    fireAdvisor,
    achievements,
    achievementsOpen,
    titles,
    titlesOnElevation,
    canElevate,
    elevateToLords,
    firePA: office.firePA,
    promoteToPA: office.promoteToPA,
    costCeiling,
    activeGenerationMs,
    bossAttempt: bosses.bossAttempt,
    twist,
    nextBoss: bosses.nextBoss,
    startBossAttempt,
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
    hustleMultiplier,
    activeClickBuff,
    activeBusinessBuff,
    isAutoBuyFrozen,
    incomePenalty,
    autoBuyFreezeRemainingSec,
    economyInput,
    moneyPerClick,
    baseMoneyPerClick,
    moneyPerSecond,
    realisedPerSecond,
    manualRealisedPerSecond,
    sectorSlices,
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
    isAutomated,
    automationLine,
    buyPerk,
    retire,
    hardReset,
    dismissOfflineReport,
    toggleMute,
    setBulkBuyMode,
    toggleCompactAutoBuy,
    toggleAutoBuyPaused,
    toggleTradingDesk,
    openClassPyramid,
    closeClassModal
  }
})
