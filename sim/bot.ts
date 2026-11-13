// A scripted player for pacing checks. It drives the real game store with
// synthetic timestamps and only uses what a human player could: clicking,
// buying visible items, claiming opportunities, fighting bosses, buying
// perks and retiring. Its buying choices are its own return-per-pound
// arithmetic, not a game feature.
import { createPinia, setActivePinia } from 'pinia'
import type { ItemKind } from '../src/data/items'
import type { PerkId } from '../src/data/perks'
import { TRAITS_BY_ID } from '../src/data/heirs'
import { ADVISORS_BY_ID } from '../src/data/advisors'
import { useGameStore } from '../src/stores/game'

// The sim plays hours in one synchronous loop. jsdom's localStorage queues a
// storage event (holding the old and new values) for every write, and those
// never run until the loop yields, so memory climbs until the process dies.
// A plain in-memory store has the same interface without the queue.
class MemoryStorage {
  private items = new Map<string, string>()
  get length(): number {
    return this.items.size
  }
  clear(): void {
    this.items.clear()
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.items.delete(key)
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value))
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })

export interface BotConfig {
  // Clicking hard: the opening minutes of a generation and every boss fight
  clicksPerSec: number
  // Clicking now and then while the businesses do the work
  casualClicksPerSec: number
  openingMinutes: number
  decideEverySec: number
  // Retire after this long without beating a new gate
  stallMinutes: number
  // A first-time player has no feel yet for when retiring pays, so pushes on
  firstGenerationStallMinutes: number
}

// The human model from the original pacing test: four clicks a second to get
// going, then the odd click. Players also hammer the button during bosses.
export const HUMAN_PACE: BotConfig = {
  clicksPerSec: 4,
  casualClicksPerSec: 0.3,
  openingMinutes: 2.5,
  decideEverySec: 2,
  stallMinutes: 4,
  firstGenerationStallMinutes: 10
}

// A steady player who taps once a second, start to finish, and still buys,
// fights bosses and claims opportunities. Used for minimum stage times.
export const ONE_TAP_PACE: BotConfig = {
  ...HUMAN_PACE,
  clicksPerSec: 1,
  casualClicksPerSec: 1
}

export interface GenerationResult {
  generation: number
  activeMinutes: number
  deepestGate: number
  splitsMs: (number | null)[]
  killMs: (number | null)[]
  netWorthAt4Min: number
  legacyEarned: number
  // Active time played before this generation started
  cumulativeActiveMs: number
  // False if money or income ever stopped being a finite number
  stayedFinite: boolean
}

type Store = ReturnType<typeof useGameStore>

const PERK_PRIORITY: ReadonlyArray<PerkId> = ['officeSeats', 'autoClicker', 'hustleCap', 'deregulation']

function revealedItems(store: Store): Array<{ kind: ItemKind; id: string }> {
  const items: Array<{ kind: ItemKind; id: string }> = []
  for (const r of store.visibleJobs) if (r.mode === 'revealed') items.push({ kind: 'jobs', id: r.item.id })
  for (const r of store.visibleBusinesses) if (r.mode === 'revealed') items.push({ kind: 'businesses', id: r.item.id })
  return items
}

// The best affordable single purchase by income gained per pound, counting
// clicks at the bot's click rate.
function bestBuy(store: Store, cfg: BotConfig): { kind: ItemKind; id: string } | null {
  let best: { kind: ItemKind; id: string } | null = null
  let bestScore = 0
  const boss = store.nextBoss
  const clickBossOpen =
    boss && boss.status !== 'locked' && (boss.def.condition.kind === 'clickEarningsAtFullHustle' || boss.def.condition.kind === 'polish')
  const clickWeight = clickBossOpen ? cfg.clicksPerSec * store.maxHustle : cfg.casualClicksPerSec
  for (const item of revealedItems(store)) {
    const quote = store.itemQuote(item.kind, item.id, 1)
    if (!quote.canAfford) continue
    const delta = store.itemIncomeDelta(item.kind, item.id, 1)
    const score = (delta.deltaPerSec + delta.deltaPerClick * clickWeight) / quote.cost
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}

// Hire the rarest candidate while there is a free seat; the first hire
// becomes the PA so the office has continuity.
function manageOffice(store: Store): void {
  if (store.headhunterOffer.length > 0) {
    let best = 0
    store.headhunterOffer.forEach((id, i) => {
      if (RARITY_RANK[ADVISORS_BY_ID[id].rarity] > RARITY_RANK[ADVISORS_BY_ID[store.headhunterOffer[best]].rarity]) best = i
    })
    if (store.officeSeats.some((s) => s === null)) {
      store.hireAdvisor(best)
    } else {
      let seat = 0
      store.officeSeats.forEach((inst, i) => {
        const rank = (x: typeof inst) => (x ? RARITY_RANK[ADVISORS_BY_ID[x.advisorId].rarity] : -1)
        if (rank(inst) < rank(store.officeSeats[seat])) seat = i
      })
      const existingRank = store.officeSeats[seat] ? RARITY_RANK[ADVISORS_BY_ID[store.officeSeats[seat]!.advisorId].rarity] : -1
      const candidateRank = RARITY_RANK[ADVISORS_BY_ID[store.headhunterOffer[best]].rarity]
      if (candidateRank > existingRank) {
        store.hireAdvisor(best, seat)
      } else {
        store.skipAdvisorOffer()
      }
    }
  }
  if (!store.paChair) {
    const seat = store.officeSeats.findIndex((s) => s !== null)
    if (seat >= 0) store.promoteToPA(seat)
  }
}

// Because losing a boss ends the bloodline, wait until income can comfortably
// clear the boss condition within the time limit before pressing Start.
function readyToChallengeBoss(store: Store, cfg: BotConfig): boolean {
  const boss = store.nextBoss
  if (!boss || boss.status !== 'available') return false
  const timeSec = boss.def.timeLimitSec * store.modifiers.bossTimeMult
  const target = store.bossTarget(boss.def.gate)
  const fullHustleFactor = store.maxHustle / Math.max(1, store.hustleMultiplier)
  const clickRate = (cfg.clicksPerSec + store.autoClickers) * store.moneyPerClick * fullHustleFactor
  const cond = boss.def.condition

  switch (cond.kind) {
    case 'clickEarningsAtFullHustle': {
      const twistMult = 1 - (1 - 0.5) * store.modifiers.twistStrength
      return clickRate * twistMult * (timeSec * 0.65) >= target * 1.15
    }
    case 'earnedAfterTax': {
      const rent = 0.3 * store.modifiers.twistStrength
      const gross = store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor
      return gross * (1 - rent) * (timeSec * 0.7) >= target * 1.15
    }
    case 'polish': {
      return clickRate * (timeSec * 0.65) >= target * 1.15
    }
    case 'ownAllRevealed': {
      let missingCost = 0
      for (const item of revealedItems(store)) {
        const owned = item.kind === 'jobs' ? store.jobsPurchased[item.id] : store.businessesOwned[item.id]
        if (!owned) missingCost += store.itemQuote(item.kind, item.id, 1).cost
      }
      if (store.money < missingCost * 1.1) return false
      const gap = Math.max(0, target - store.netWorth)
      const flow = store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor
      return gap <= flow * (timeSec * 0.65)
    }
    case 'netWorthWithinPar': {
      const gap = Math.max(0, target - store.netWorth)
      const flow = store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor
      return gap <= flow * (timeSec * 0.55)
    }
    case 'netWorth': {
      const gap = Math.max(0, target - store.netWorth)
      const flow = (store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor) * 0.85
      return gap <= flow * (timeSec * 0.65)
    }
  }
}

function decide(store: Store, cfg: BotConfig): void {
  manageOffice(store)
  const ev = store.activeEvent
  if (ev && ev.def.effect.type === 'scandal') {
    // Ignoring a scandal costs something, so the bot pays the first option
    store.claimMarketEvent(store.nowMs, Math.random, 0)
  } else if (ev && !ev.corked && !ev.def.shady) {
    store.claimMarketEvent(store.nowMs)
  }

  if (readyToChallengeBoss(store, cfg)) {
    store.startBossAttempt()
  }

  // Read the boss after starting it, so this turn already plays to its rules
  const boss = store.nextBoss
  const attempt = store.bossAttempt
  const condition = boss?.status === 'active' ? boss.def.condition : null
  if (condition?.kind === 'ownAllRevealed') {
    // Buy one of anything still missing before optimising
    for (const item of revealedItems(store)) {
      const owned = item.kind === 'jobs' ? store.jobsPurchased[item.id] : store.businessesOwned[item.id]
      if (!owned) store.buyItem(item.kind, item.id, 1)
    }
  }
  if (condition?.kind === 'netWorthWithinPar' && attempt) {
    // Make each stroke count: one Max purchase per decision, within par
    if (attempt.purchases < condition.par - 1) {
      const pick = bestBuy(store, cfg)
      if (pick) store.buyItem(pick.kind, pick.id, 'max')
    }
    return
  }
  // Spend in a few chunky steps: Max on the best buy while it costs little
  // of the cash, otherwise one at a time.
  for (let i = 0; i < 12; i++) {
    const pick = bestBuy(store, cfg)
    if (!pick) break
    const mode = store.itemQuote(pick.kind, pick.id, 1).cost < store.money * 0.02 ? 'max' : 1
    if (store.buyItem(pick.kind, pick.id, mode).bought === 0) break
  }
}

const RARITY_RANK: Readonly<Record<string, number>> = { legendary: 3, rare: 2, common: 1 }

// The bot avoids stacking mutually ruinous downsides (e.g. Nepo Baby + click
// penalties before Silver is cleared), picking the strongest heir otherwise.
function pickHeir(store: Store): void {
  let best = 0
  let bestScore = -Infinity
  store.heirChoices.forEach((h, i) => {
    const trait = h.traitId ? TRAITS_BY_ID[h.traitId] : null
    let score = trait ? RARITY_RANK[trait.rarity] * 10 : 0
    if (h.traitId === 'nepo-baby' && store.modifiers.clickMult < 0.8) score -= 25
    if (trait?.mods.clickMult !== undefined && trait.mods.clickMult < 1 && store.modifiers.clickMult < 0.6) score -= 15
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  store.pickHeir(best)
}

function buyPerks(store: Store): void {
  for (;;) {
    let bought = false
    for (const id of PERK_PRIORITY) {
      if (store.buyPerk(id)) {
        bought = true
        break
      }
    }
    if (!bought) return
  }
}

// Small seeded generator so campaigns (and their Market Opportunities) are
// repeatable run to run.
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function runCampaign(hours: number, cfg: BotConfig = HUMAN_PACE, seed = 1): GenerationResult[] {
  const realRandom = Math.random
  Math.random = seededRandom(seed)
  try {
    return playCampaign(hours, cfg)
  } finally {
    Math.random = realRandom
  }
}

export interface TapOnlyResult {
  // Units of any Job or Business the player ended up owning
  itemsOwned: number
  netWorth: number
}

// A player who taps Get Paid once a second and touches nothing else: no
// purchases, no bosses, no opportunities. Any growth comes from the game.
export function runTapOnly(minutes: number, tapsPerSec = 1): TapOnlyResult {
  localStorage.clear()
  setActivePinia(createPinia())
  const store = useGameStore()
  let ts = 1_000_000
  store.hydrateFromStorage(ts)
  store.closeIntro(ts)
  store.tick(ts)
  for (let sec = 0; sec < minutes * 60; sec++) {
    for (let c = 0; c < tapsPerSec; c++) store.manualClick(ts + Math.floor((c * 1000) / tapsPerSec))
    ts += 1000
    store.tick(ts)
  }
  const count = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0)
  return { itemsOwned: count(store.jobsPurchased) + count(store.businessesOwned), netWorth: store.netWorth }
}

function playCampaign(hours: number, cfg: BotConfig): GenerationResult[] {
  localStorage.clear()
  setActivePinia(createPinia())
  const store = useGameStore()
  let ts = 1_000_000
  store.hydrateFromStorage(ts)
  store.closeIntro(ts)
  store.tick(ts)

  const results: GenerationResult[] = []
  const limitMs = hours * 3600 * 1000
  let cumulativeMs = 0
  let generation = 1
  let netWorthAt4Min = 0
  let lastGateAtMs = 0
  let lastGates = 0
  let stayedFinite = true
  let clickCredit = 0

  const finishGeneration = () => {
    results.push({
      generation,
      activeMinutes: store.activeGenerationMs / 60_000,
      deepestGate: store.gatesBeaten,
      splitsMs: [...store.splits],
      killMs: [...store.lastKillMs],
      netWorthAt4Min,
      legacyEarned: store.legacyOnRetire,
      cumulativeActiveMs: cumulativeMs,
      stayedFinite
    })
  }

  while (cumulativeMs + store.activeGenerationMs < limitMs) {
    const hard = store.activeGenerationMs < cfg.openingMinutes * 60_000 || store.bossAttempt !== null
    clickCredit += hard ? cfg.clicksPerSec : cfg.casualClicksPerSec
    const clicks = Math.floor(clickCredit)
    clickCredit -= clicks
    for (let c = 0; c < clicks; c++) {
      store.manualClick(ts + Math.floor((c * 1000) / clicks))
    }
    ts += 1000
    store.tick(ts)

    const genMs = store.activeGenerationMs
    if (!Number.isFinite(store.money) || !Number.isFinite(store.moneyPerSecond)) {
      stayedFinite = false
      break
    }
    if (netWorthAt4Min === 0 && genMs >= 240_000) {
      netWorthAt4Min = store.netWorth
    }
    if (store.gatesBeaten > lastGates) {
      lastGates = store.gatesBeaten
      lastGateAtMs = genMs
      if (store.classModalOpen) store.closeClassModal()
    }
    if ((ts / 1000) % cfg.decideEverySec === 0) {
      decide(store, cfg)
    }

    if (store.disgraceReport) {
      finishGeneration()
      cumulativeMs += genMs
      store.dismissDisgrace()
      generation = 1
      netWorthAt4Min = 0
      lastGateAtMs = 0
      lastGates = 0
      continue
    }

    const patience = generation === 1 ? cfg.firstGenerationStallMinutes : cfg.stallMinutes
    const stalled = genMs - lastGateAtMs >= patience * 60_000
    if (store.canRetire && (store.gatesBeaten >= 9 || stalled) && !store.bossAttempt) {
      finishGeneration()
      cumulativeMs += genMs
      store.retire(ts)
      pickHeir(store)
      buyPerks(store)
      generation += 1
      netWorthAt4Min = 0
      lastGateAtMs = 0
      lastGates = 0
      if (results.at(-1)?.deepestGate === 9) break
    }
  }
  finishGeneration()
  return results
}
