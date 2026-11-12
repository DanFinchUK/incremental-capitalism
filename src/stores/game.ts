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
import { MARKET_EVENTS, type MarketEventDef, type MarketEventKind } from '../data/events'
import { perkNextCost, type PerkId, type PerkRanks } from '../data/perks'
import {
  autoBuyThreshold,
  bulkBuyQuote,
  computeClickIncome,
  computeLegacyBracket,
  computeLegacyGain,
  computeOfflineCatchUp,
  computePassivePerSecond,
  computeSectorSlices,
  isItemAutoBuyActive,
  isItemAutoBuyUnlocked,
  itemMilestones,
  legacyMultiplier as calcLegacyMultiplier,
  maxHustleMultiplier,
  nextLegacyLifetimeThreshold,
  quoteIncomeDelta,
  selectAutoBuyTarget,
  socialClassInfo,
  type AutoBuySelectionInput,
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

export type VisibleRow<T> =
  | { mode: 'revealed'; item: T }
  | { mode: 'teaser'; key: string }

export interface ActiveMarketEvent {
  id: number
  def: MarketEventDef
  expiresAt: number
  xPct: number
  yPct: number
}

export type ClaimEventOutcome = 'golden' | 'shadyWin' | 'shadyFreeze' | null

const SAVE_THROTTLE_MS = 2000
const AUTO_BUY_COOLDOWN_MS = 1000

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
  const bullRunUntil = ref<number>(0)
  const overtimeUntil = ref<number>(0)
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
  const classStatus = computed(() => socialClassInfo(netWorth.value))
  const legacyMultiplier = computed(() => calcLegacyMultiplier(legacyPoints.value))
  const legacyAvailable = computed(() => Math.max(0, legacyPoints.value - legacySpent.value))
  const legacyGain = computed(() => computeLegacyGain(lifetimeEarned.value, legacyPoints.value))
  const nextLegacyAt = computed(() => nextLegacyLifetimeThreshold(legacyPoints.value))
  const legacyBracket = computed(() => computeLegacyBracket(lifetimeEarned.value, legacyPoints.value))
  const autoClickers = computed(() => perks.value.autoClicker)
  const maxHustle = computed(() => maxHustleMultiplier(perks.value.hustleCap))
  const hustleMultiplier = computed(() => 1 + hustleBonus.value)

  const isBullRunActive = computed(() => nowMs.value < bullRunUntil.value)
  const isOvertimeActive = computed(() => nowMs.value < overtimeUntil.value)
  const isAutoBuyFrozen = computed(() => nowMs.value < autoBuyFrozenUntil.value)

  const bullRunRemainingSec = computed(() => Math.max(0, Math.ceil((bullRunUntil.value - nowMs.value) / 1000)))
  const overtimeRemainingSec = computed(() => Math.max(0, Math.ceil((overtimeUntil.value - nowMs.value) / 1000)))
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
    businessBuffMultiplier: isBullRunActive.value ? 5 : 1,
    clickBuffMultiplier: isOvertimeActive.value ? 7 : 1,
    hustleMultiplier: hustleMultiplier.value
  }))

  const selectionInput = computed<AutoBuySelectionInput>(() => ({
    ...economyInput.value,
    lifetimePurchases: lifetimePurchases.value,
    autoBuyDisabled: autoBuyDisabled.value,
    nepotismRank: perks.value.nepotism
  }))

  const moneyPerClick = computed(() => computeClickIncome(economyInput.value, true))
  const baseMoneyPerClick = computed(() => computeClickIncome(economyInput.value, false))
  const moneyPerSecond = computed(() => computePassivePerSecond(economyInput.value))
  const autoBuyTarget = computed(() =>
    autoBuyPaused.value ? null : selectAutoBuyTarget(selectionInput.value)
  )
  const realisedPerSecond = computed(() => currentRealisedPerSec(telemetry.value, nowMs.value))
  const manualRealisedPerSecond = computed(() => currentManualPerSec(telemetry.value, nowMs.value))
  const sectorSlices = computed(() => computeSectorSlices(economyInput.value, manualRealisedPerSecond.value))

  function refreshSeenItems(): void {
    for (let i = 0; i < JOBS.length; i++) {
      const job = JOBS[i]
      const prev = i > 0 ? JOBS[i - 1] : null
      const prevOwned = prev ? ((jobsPurchased.value[prev.id] ?? 0) > 0 || (lifetimePurchases.value.jobs[prev.id] ?? 0) > 0) : false
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

  function buildVisibleList<T extends { id: string }>(
    items: ReadonlyArray<T>,
    seenMap: Readonly<Record<string, boolean>>,
    prefix: string
  ): VisibleRow<T>[] {
    let highestSeen = 0
    for (let i = 0; i < items.length; i++) {
      if (seenMap[items[i].id]) {
        highestSeen = i
      }
    }
    const rows: VisibleRow<T>[] = []
    for (let i = 0; i <= highestSeen; i++) {
      rows.push({ mode: 'revealed', item: items[i] })
    }
    if (highestSeen + 1 < items.length) {
      rows.push({ mode: 'teaser', key: `${prefix}-teaser-${items[highestSeen + 1].id}` })
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
      bulkBuyMode: bulkBuyMode.value,
      autoBuyPaused: autoBuyPaused.value,
      compactAutoBuy: compactAutoBuy.value,
      muted: muted.value,
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
    const delaySec = (45 + rng() * 45) * Math.pow(0.85, perks.value.insider)
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
    bulkBuyMode.value = loaded.bulkBuyMode
    autoBuyPaused.value = loaded.autoBuyPaused
    compactAutoBuy.value = loaded.compactAutoBuy
    muted.value = loaded.muted
    tradingDeskCollapsed.value = loaded.tradingDeskCollapsed
    lastUpdate.value = loaded.lastUpdate
    nowMs.value = ts
    lastTickMs.value = ts
    lastAutoBuyAt.value = 0
    hustleBonus.value = 0
    bullRunUntil.value = 0
    overtimeUntil.value = 0
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

    if (loaded.lastUpdate !== null && ts > loaded.lastUpdate) {
      const catchUp = computeOfflineCatchUp(ts - loaded.lastUpdate, moneyPerSecond.value, perks.value.offshore)
      if (catchUp) {
        money.value += catchUp.moneyEarned
        lifetimeEarned.value += catchUp.moneyEarned
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
    let autoBuyRemaining: number | undefined
    if (kind === 'businesses') {
      const threshold = autoBuyThreshold('businesses', def.scaleFactor, perks.value.nepotism)
      const lifetime = lifetimePurchases.value.businesses[id] ?? 0
      if (lifetime < threshold) {
        autoBuyRemaining = threshold - lifetime
      }
    }
    return bulkBuyQuote(
      def.baseCost,
      def.scaleFactor,
      owned,
      classStatus.value.costDiscount,
      modeOverride ?? bulkBuyMode.value,
      money.value,
      autoBuyRemaining
    )
  }

  function buyItem(kind: ItemKind, id: string, modeOverride?: BulkBuyMode): { bought: number; hitMilestone: boolean; promotedClass: boolean } {
    const prevClass = classStatus.value.current.level
    const quote = itemQuote(kind, id, modeOverride)
    if (!quote.canAfford || quote.count < 1) {
      return { bought: 0, hitMilestone: false, promotedClass: false }
    }

    const map = kind === 'jobs' ? jobsPurchased.value : businessesOwned.value
    const lifeMap = kind === 'jobs' ? lifetimePurchases.value.jobs : lifetimePurchases.value.businesses
    const def = kind === 'jobs' ? JOBS_BY_ID[id] : BUSINESSES_BY_ID[id]

    const prevOwned = map[id] ?? 0
    const nextOwned = prevOwned + quote.count
    money.value -= quote.cost
    spentThisRun.value += quote.cost
    map[id] = nextOwned
    lifeMap[id] = (lifeMap[id] ?? 0) + quote.count
    observeBalance(telemetry.value, nowMs.value, money.value)

    refreshSeenItems()

    const crossedMilestone = itemMilestones(def.scaleFactor).filter((m) => prevOwned < m && nextOwned >= m).pop() ?? null
    const promoted = handleClassPromotion(prevClass)
    if (!promoted && crossedMilestone !== null) {
      markTelemetryEvent(telemetry.value, 'M')
      const step = (2 + 0.25 * perks.value.deregulation).toFixed(2).replace(/\.00$/, '')
      announce(`${def.label} hit ${crossedMilestone} owned — ${step}x output milestone!`)
    }

    flushSave(nowMs.value)
    return {
      bought: quote.count,
      hitMilestone: crossedMilestone !== null,
      promotedClass: promoted
    }
  }

  function runAutoBuy(ts: number): void {
    if (isAutoBuyFrozen.value || autoBuyPaused.value) {
      return
    }
    if (lastAutoBuyAt.value > 0 && ts - lastAutoBuyAt.value < AUTO_BUY_COOLDOWN_MS) {
      return
    }
    const target = autoBuyTarget.value
    if (target && money.value >= target.cost) {
      // Honour the bulk-buy setting so late-game cash gets spent at a useful
      // pace; drop to a single unit when the bulk amount isn't affordable yet.
      let res = buyItem(target.kind, target.id)
      if (res.bought === 0) {
        res = buyItem(target.kind, target.id, 1)
      }
      if (res.bought > 0) {
        lastAutoBuyAt.value = ts
      }
    }
  }

  function manualClick(ts = Date.now()): number {
    nowMs.value = ts
    const maxBonus = maxHustle.value - 1
    const step = maxBonus / 20
    hustleBonus.value = Math.min(maxBonus, Number((hustleBonus.value + step).toFixed(2)))
    lastManualClickAt.value = ts
    const prevClass = classStatus.value.current.level
    const amount = moneyPerClick.value
    creditMoney(amount, 'manual', ts)
    refreshSeenItems()
    handleClassPromotion(prevClass)
    return amount
  }

  function spawnSpecificEvent(kind: MarketEventKind, ts = nowMs.value, rng: () => number = Math.random): void {
    const def = MARKET_EVENTS.find((e) => e.kind === kind) ?? MARKET_EVENTS[0]
    nextEventSeq.value += 1
    activeEvent.value = {
      id: nextEventSeq.value,
      def,
      expiresAt: ts + 12_000,
      xPct: 18 + rng() * 64,
      yPct: 18 + rng() * 55
    }
  }

  function maybeSpawnRandomEvent(ts: number, rng: () => number = Math.random): void {
    if (activeEvent.value && ts >= activeEvent.value.expiresAt) {
      activeEvent.value = null
    }
    if (!activeEvent.value && nextEventAt.value > 0 && ts >= nextEventAt.value) {
      const roll = rng()
      let kind: MarketEventKind
      if (roll < 0.25) {
        kind = 'shadyDeal'
      } else if (roll < 0.5) {
        kind = 'bullRun'
      } else if (roll < 0.75) {
        kind = 'overtimeFrenzy'
      } else {
        kind = 'taxRebate'
      }
      spawnSpecificEvent(kind, ts, rng)
      scheduleNextEvent(ts, rng)
    }
  }

  function claimMarketEvent(ts = Date.now(), rng: () => number = Math.random): ClaimEventOutcome {
    nowMs.value = ts
    const ev = activeEvent.value
    if (!ev) {
      return null
    }
    activeEvent.value = null
    scheduleNextEvent(ts, rng)
    const durationMult = 1 + 0.25 * perks.value.insider

    if (ev.def.kind === 'bullRun') {
      const dur = Math.round(ev.def.baseDurationSec * durationMult)
      bullRunUntil.value = ts + dur * 1000
      markTelemetryEvent(telemetry.value, '★')
      announce(`Quantitative Easing! 5x Business income for ${dur}s!`)
      flushSave(ts)
      return 'golden'
    }
    if (ev.def.kind === 'overtimeFrenzy') {
      const dur = Math.round(ev.def.baseDurationSec * durationMult)
      overtimeUntil.value = ts + dur * 1000
      markTelemetryEvent(telemetry.value, '★')
      announce(`Mandatory Unpaid Overtime! 7x Click income for ${dur}s!`)
      flushSave(ts)
      return 'golden'
    }
    if (ev.def.kind === 'taxRebate') {
      const prevClass = classStatus.value.current.level
      const windfall = Math.max(500, moneyPerSecond.value * 60)
      markTelemetryEvent(telemetry.value, '★')
      creditMoney(windfall, 'windfall', ts)
      refreshSeenItems()
      if (!handleClassPromotion(prevClass)) {
        announce('Non-Dom Tax Rebate! 60s of passive income wired offshore!')
      }
      flushSave(ts)
      return 'golden'
    }
    // Shady Deal: 50/50 windfall vs 15s auto-buy freeze
    if (rng() < 0.5) {
      const prevClass = classStatus.value.current.level
      const windfall = Math.max(1500, moneyPerSecond.value * 180)
      markTelemetryEvent(telemetry.value, '★')
      creditMoney(windfall, 'windfall', ts)
      refreshSeenItems()
      if (!handleClassPromotion(prevClass)) {
        announce('VIP-Lane Contract Approved! 180s passive windfall!')
      }
      flushSave(ts)
      return 'shadyWin'
    }
    autoBuyFrozenUntil.value = ts + 15_000
    announce('Select Committee Inquiry! Auto-buying paused for 15s (cash untouched).')
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

    if (elapsedMs >= 60_000) {
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
      const prevClass = classStatus.value.current.level
      creditMoney(moneyPerSecond.value * deltaSec, 'passive', ts)
      handleClassPromotion(prevClass)
    }

    refreshSeenItems()
    runAutoBuy(ts)
    observeBalance(telemetry.value, ts, money.value)
    if (ts - telemetry.value.lastSampleTs >= 250) {
      sampleTelemetry(telemetry.value, ts, moneyPerSecond.value, money.value)
    }
    maybeSpawnRandomEvent(ts)

    if (ts - lastSavedMs.value >= SAVE_THROTTLE_MS) {
      flushSave(ts)
    }
  }

  function toggleAutoBuy(kind: ItemKind, id: string): void {
    autoBuyDisabled.value[kind][id] = !autoBuyDisabled.value[kind][id]
    flushSave(nowMs.value)
  }

  function isAutoBuyUnlocked(kind: ItemKind, id: string): boolean {
    const scale = kind === 'jobs' ? JOBS_BY_ID[id].scaleFactor : BUSINESSES_BY_ID[id].scaleFactor
    return isItemAutoBuyUnlocked(
      kind,
      id,
      scale,
      lifetimePurchases.value,
      perks.value.nepotism,
      legacyPoints.value
    )
  }

  function isAutoBuyEnabled(kind: ItemKind, id: string): boolean {
    return !autoBuyDisabled.value[kind][id]
  }

  function isAutoBuyActive(kind: ItemKind, id: string): boolean {
    if (autoBuyPaused.value) {
      return false
    }
    const scale = kind === 'jobs' ? JOBS_BY_ID[id].scaleFactor : BUSINESSES_BY_ID[id].scaleFactor
    return isItemAutoBuyActive(kind, id, scale, selectionInput.value)
  }

  function isNextAutoBuy(kind: ItemKind, id: string): boolean {
    return (
      autoBuyTarget.value !== null &&
      autoBuyTarget.value.kind === kind &&
      autoBuyTarget.value.id === id
    )
  }

  function itemAutoBuyThreshold(kind: ItemKind, id: string): number {
    const scale = kind === 'jobs' ? JOBS_BY_ID[id].scaleFactor : BUSINESSES_BY_ID[id].scaleFactor
    return autoBuyThreshold(kind, scale, perks.value.nepotism)
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
    flushSave(nowMs.value)
    return true
  }

  function retire(ts = Date.now()): boolean {
    nowMs.value = ts
    const gain = legacyGain.value
    if (gain < 1) {
      return false
    }
    legacyPoints.value += gain
    money.value = 0
    spentThisRun.value = 0
    jobsPurchased.value = {}
    businessesOwned.value = {}
    hustleBonus.value = 0
    bullRunUntil.value = 0
    overtimeUntil.value = 0
    autoBuyFrozenUntil.value = 0
    lastAutoBuyAt.value = 0
    activeEvent.value = null
    resetTelemetry(telemetry.value, ts, money.value)
    refreshSeenItems()
    announce(`Retired with +${gain} Legacy! Income multiplier is now x${legacyMultiplier.value.toFixed(2)}.`)
    flushSave(ts)
    return true
  }

  function hardReset(ts = Date.now()): void {
    const fresh = createInitialSceneState()
    applyLoadedState(fresh, ts)
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
    classStatus,
    legacyMultiplier,
    legacyAvailable,
    legacyGain,
    nextLegacyAt,
    legacyBracket,
    autoClickers,
    hustleMultiplier,
    isBullRunActive,
    isOvertimeActive,
    isAutoBuyFrozen,
    bullRunRemainingSec,
    overtimeRemainingSec,
    autoBuyFreezeRemainingSec,
    economyInput,
    moneyPerClick,
    baseMoneyPerClick,
    moneyPerSecond,
    realisedPerSecond,
    manualRealisedPerSecond,
    sectorSlices,
    autoBuyTarget,
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
    claimMarketEvent,
    tick,
    toggleAutoBuy,
    isAutoBuyUnlocked,
    isAutoBuyEnabled,
    isAutoBuyActive,
    isNextAutoBuy,
    itemAutoBuyThreshold,
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
