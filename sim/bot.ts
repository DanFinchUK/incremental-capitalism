// A scripted player for pacing checks. It drives the real game store with
// synthetic timestamps and only uses what a human player could: clicking,
// buying visible items, claiming opportunities, fighting bosses, buying
// perks and retiring. Its buying choices are its own return-per-pound
// arithmetic, not a game feature.
import { createPinia, setActivePinia } from 'pinia'
import { BUSINESSES, BUSINESSES_BY_ID, JOBS, JOBS_BY_ID, SYNERGY_JOB_FOR_BUSINESS, type ItemKind } from '../src/data/items'
import { DOMINANCE_AT, DOMINANCE_BONUS, dominanceMultiplier } from '../src/engine/economy'
import type { PerkId } from '../src/data/perks'
import { TRAITS_BY_ID } from '../src/data/heirs'
import { ADVISORS_BY_ID } from '../src/data/advisors'
import { SCENARIOS_BY_ID, type ScenarioId } from '../src/data/scenarios'
import { useGameStore } from '../src/stores/game'
import { pauseStateWrites } from '../src/utils/stateWrites'
import { setSimIncomeMult } from '../src/utils/simIncome'

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
  // From this generation on, play with this patience instead (for probing how
  // long gates past the bloodline's best take when the player never gives up)
  probe?: { fromGeneration: number; stallMinutes: number }
  // Plays with the "Play without tapping" setting on
  noTap?: boolean
  // The order Legacy goes into perks: the first one still buyable wins.
  // Defaults to office seats, then Interns
  perkPriority?: ReadonlyArray<PerkId>
  // Elevate to the Lords this many times when a bloodline completes, and play
  // the new lines, instead of stopping at the first completed bloodline
  elevations?: number
  // The dynasty's scenario (src/data/scenarios.ts)
  scenario?: ScenarioId
  // Buy an item up to 1,000 for market dominance when finishing it pays back
  // better than the best ordinary purchase (on unless set false)
  chaseDominance?: boolean
  // Turns down every introduction and leaves the PA chairs alone (for
  // measuring one advisor at a time)
  noHiring?: boolean
  // A whole run with one thing available (the strength report): every heir
  // has this trait and inherited trait (none if null), and the headhunter
  // only ever brings this advisor, one copy at most (nobody if null)
  solo?: { trait: string | null; inherit: string | null; advisor: string | null }
  // All income multiplied by this, for the strength report's yardstick
  incomeMult?: number
}

// The player the pacing targets are set for: taps about five times a second
// the whole way through, as playtesters actually do, so Hustle never drops.
// Retires after 12 minutes without a new gate, which by the prestige rule
// (docs/pacing.md) lands most generations at +1 to +3.
export const FAST_TAPPER: BotConfig = {
  clicksPerSec: 5,
  casualClicksPerSec: 5,
  openingMinutes: 0,
  decideEverySec: 2,
  stallMinutes: 12,
  firstGenerationStallMinutes: 12
}

// A mostly idle player: four clicks a second to get going, then the odd
// click while the businesses do the work, hammering again during bosses.
// Slower than the fast tapper, and bounded by its own looser targets.
export const CASUAL_PACE: BotConfig = {
  ...FAST_TAPPER,
  clicksPerSec: 4,
  casualClicksPerSec: 0.3,
  openingMinutes: 2.5
}

// A player who never taps Get paid: the allowance, Interns and businesses do
// all the earning. Still buys, hires, fights bosses and retires.
export const ZERO_TAP: BotConfig = {
  ...FAST_TAPPER,
  clicksPerSec: 0,
  casualClicksPerSec: 0,
  noTap: true
}

// Other valid ways to play, checked in sim/styles.sim.ts. Some are stronger
// than others; each must still finish a bloodline without breaking the
// prestige rule.
export const PLAYSTYLES: ReadonlyArray<{ name: string; cfg: BotConfig; finishWithinHours: number }> = [
  {
    // Taps hard and puts Legacy into compounding milestones and automation
    name: 'tapper building milestones and automation',
    cfg: { ...FAST_TAPPER, perkPriority: ['deregulation', 'signingAuthority', 'nepotism', 'officeSeats', 'hustleCap', 'autoClicker'] },
    finishWithinHours: 3
  },
  {
    // Taps hard and makes every tap count: Hustle first, then Interns to ride it
    name: 'tapper chasing Hustle',
    cfg: { ...FAST_TAPPER, perkPriority: ['hustleCap', 'autoClicker'] },
    finishWithinHours: 3
  },
  {
    // Never taps; every point of Legacy goes on Interns
    name: 'non-tapper with an Intern army',
    cfg: { ...ZERO_TAP, perkPriority: ['autoClicker'] },
    finishWithinHours: 4
  },
  {
    // Never taps; lets the estate run itself, then builds milestones
    name: 'non-tapper automating everything',
    cfg: { ...ZERO_TAP, perkPriority: ['signingAuthority', 'officeSeats', 'nepotism', 'deregulation', 'autoClicker'] },
    finishWithinHours: 4
  }
]

// The scenarios, played by the fast tapper (or for Absent Landlord, the
// player who never taps), each with Legacy going where it still does good
export const SCENARIO_PLAYS: ReadonlyArray<{ cfg: BotConfig; finishWithinHours: number }> = [
  { cfg: { ...FAST_TAPPER, scenario: 'hands-on', perkPriority: ['hustleCap', 'officeSeats', 'deregulation', 'nepotism', 'offshore'] }, finishWithinHours: 3 },
  { cfg: { ...ZERO_TAP, scenario: 'absent-landlord' }, finishWithinHours: 3.5 },
  { cfg: { ...FAST_TAPPER, scenario: 'austerity', perkPriority: ['autoClicker', 'hustleCap', 'deregulation', 'nepotism'] }, finishWithinHours: 3 }
]

// A steady player who taps once a second, start to finish, and still buys,
// fights bosses and claims opportunities. Used for minimum stage times.
export const ONE_TAP_PACE: BotConfig = {
  ...FAST_TAPPER,
  clicksPerSec: 1,
  casualClicksPerSec: 1
}

export interface GenerationResult {
  generation: number
  activeMinutes: number
  deepestGate: number
  // The deepest gate the bloodline had beaten before this generation began.
  // Gate bestBefore + k is this generation's "+k".
  bestBefore: number
  splitsMs: (number | null)[]
  killMs: (number | null)[]
  netWorthAt4Min: number
  legacyEarned: number
  // Active time played before this generation started
  cumulativeActiveMs: number
  // False if money or income ever stopped being a finite number
  stayedFinite: boolean
  // The generation's first head abdicated to a sibling partway through
  abdicated: boolean
  // Jobs and Businesses held at 1,000 (market dominance) when it ended
  dominance: number
  // On the bloodline's first, uninherited climb: how many of the rung below
  // the player owned when they first bought each Job or Business (index = list
  // position; null for the first rung and for rungs never bought)
  rungHandover: Record<ItemKind, (number | null)[]> | null
}

export type Store = ReturnType<typeof useGameStore>

const DEFAULT_PERK_PRIORITY: ReadonlyArray<PerkId> = ['officeSeats', 'autoClicker', 'hustleCap', 'deregulation']

function revealedItems(store: Store): Array<{ kind: ItemKind; id: string }> {
  const items: Array<{ kind: ItemKind; id: string }> = []
  for (const r of store.visibleJobs) if (r.mode === 'revealed') items.push({ kind: 'jobs', id: r.item.id })
  for (const r of store.visibleBusinesses) if (r.mode === 'revealed') items.push({ kind: 'businesses', id: r.item.id })
  return items
}

// Every revealed item priced once: its next unit's cost, whether it's
// affordable, and what it adds. The bot's buying choices all read from this.
interface Priced {
  item: { kind: ItemKind; id: string }
  cost: number
  canAfford: boolean
  perSec: number
  perClick: number
}

// cache: prices kept from earlier in the same decision. A single unit's cost
// and gain depend only on what the family owns of that item and its synergy
// partner, and on the income and cost modifiers; affordability is checked
// against the cash every time.
function priceItems(store: Store, cache?: Map<string, Priced>): Priced[] {
  const { itemQuote, itemIncomeDelta } = store.pricing
  const money = store.money
  return revealedItems(store).map((item) => {
    const key = `${item.kind}:${item.id}`
    const kept = cache?.get(key)
    if (kept) return { ...kept, canAfford: money >= kept.cost }
    const quote = itemQuote(item.kind, item.id, 1)
    const delta = itemIncomeDelta(item.kind, item.id, 1)
    const priced = { item, cost: quote.cost, canAfford: quote.canAfford, perSec: delta.deltaPerSec, perClick: delta.deltaPerClick }
    cache?.set(key, priced)
    return priced
  })
}

// Everything a price depends on besides what's owned
function sameEconomy(a: Store['economyInput'], b: Store['economyInput']): boolean {
  return (
    a.legacyPoints === b.legacyPoints &&
    a.classLevel === b.classLevel &&
    a.deregulationRank === b.deregulationRank &&
    a.autoClickers === b.autoClickers &&
    a.businessBuffMultiplier === b.businessBuffMultiplier &&
    a.clickBuffMultiplier === b.clickBuffMultiplier &&
    a.hustleMultiplier === b.hustleMultiplier &&
    a.noTap === b.noTap &&
    a.mods === b.mods
  )
}

// Forget the prices a purchase changed: the item and its synergy partner
function forgetPrices(cache: Map<string, Priced>, kind: ItemKind, id: string): void {
  cache.delete(`${kind}:${id}`)
  if (kind === 'jobs') cache.delete(`businesses:${JOBS_BY_ID[id].synergyBusinessId}`)
  else {
    const job = SYNERGY_JOB_FOR_BUSINESS[id]
    if (job) cache.delete(`jobs:${job.id}`)
  }
}

// The best affordable single purchase by income gained per pound, counting
// clicks at the bot's click rate.
function bestBuy(store: Store, cfg: BotConfig): { kind: ItemKind; id: string } | null {
  return bestBuyScored(store, cfg, priceItems(store)).pick
}

function bestBuyScored(store: Store, cfg: BotConfig, priced: Priced[]): { pick: { kind: ItemKind; id: string } | null; score: number } {
  let best: { kind: ItemKind; id: string } | null = null
  let bestScore = 0
  const boss = store.nextBoss
  const clickBossOpen =
    boss && boss.status !== 'locked' && (boss.def.condition.kind === 'clickEarningsAtFullHustle' || boss.def.condition.kind === 'polish')
  const clickWeight = clickBossOpen ? cfg.clicksPerSec * store.maxHustle : cfg.casualClicksPerSec
  for (const p of priced) {
    if (!p.canAfford) continue
    const score = (p.perSec + p.perClick * clickWeight) / p.cost
    if (score > bestScore) {
      bestScore = score
      best = p.item
    }
  }
  return { pick: best, score: bestScore }
}


// Market dominance worth finishing: what one more adds to income, against
// the cost of every unit still needed to reach 1,000
function dominanceToChase(store: Store, cfg: BotConfig, beat: number, priced: Priced[]): { kind: ItemKind; id: string } | null {
  if (cfg.chaseDominance === false) return null
  const income = store.moneyPerSecond + store.moneyPerClick * cfg.casualClicksPerSec
  const gain = (income * DOMINANCE_BONUS) / dominanceMultiplier(store.dominanceHeld)
  // Beat the best ordinary buy, affordable yet or not: saving up for the
  // next rung is a choice too
  for (const p of priced) {
    if (Number.isFinite(p.cost) && p.cost > 0) beat = Math.max(beat, (p.perSec + p.perClick * cfg.casualClicksPerSec) / p.cost)
  }
  let best: { kind: ItemKind; id: string } | null = null
  let bestScore = beat
  for (const { item, cost: next } of priced) {
    const owned = (item.kind === 'jobs' ? store.jobsPurchased[item.id] : store.businessesOwned[item.id]) ?? 0
    if (owned < 1 || owned >= DOMINANCE_AT) continue
    const def = item.kind === 'jobs' ? JOBS_BY_ID[item.id] : BUSINESSES_BY_ID[item.id]
    const left = DOMINANCE_AT - owned
    const cost = (next * (Math.pow(def.scaleFactor, left) - 1)) / (def.scaleFactor - 1)
    const score = gain / cost
    if (Number.isFinite(score) && score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}

// Hire the rarest candidate// Hire the rarest candidate while there is a free seat; the first hire
// becomes the PA so the office has continuity.
function manageOffice(store: Store, cfg: BotConfig): void {
  if (cfg.noHiring) {
    if (store.headhunterOffer.length > 0) store.skipAdvisorOffer()
    return
  }
  if (cfg.solo) {
    if (store.headhunterOffer.length === 0 && store.waitingOffers > 0) store.showWaitingOffer()
    if (store.headhunterOffer.length > 0) {
      const id = cfg.solo.advisor
      // One of the family at most: after an elevation the PA's child may hold
      // another role in it (a Day Trader's child can be a Hedge Fund Founder)
      const family = id ? ADVISORS_BY_ID[id].family : null
      const held = [...store.officeSeats, ...store.paChairs].some((a) => a && ADVISORS_BY_ID[a.advisorId]?.family === family)
      if (id && !held && store.officeSeats.some((a) => a === null)) {
        store.headhunterOffer = [id]
        store.hireAdvisor(0)
      } else {
        store.skipAdvisorOffer()
      }
    }
    for (let guard = 0; guard < 8 && store.paChairs.some((c) => c === null); guard++) {
      const seat = store.officeSeats.findIndex((a) => a !== null)
      if (seat < 0) break
      store.promoteToPA(seat)
    }
    return
  }
  // Introductions from ordeals waved through wait to be asked for: a player
  // who wants staff asks
  if (store.headhunterOffer.length === 0 && store.waitingOffers > 0) store.showWaitingOffer()
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
  // Fill empty PA chairs from the office, so the best stay on at retirement
  for (let guard = 0; guard < 8 && store.paChairs.some((c) => c === null); guard++) {
    const seat = store.officeSeats.findIndex((s) => s !== null)
    if (seat < 0) break
    store.promoteToPA(seat)
  }
}

// Because losing a boss ends the bloodline, wait until income can comfortably
// clear the boss condition within the time limit before pressing Start.
function readyToChallengeBoss(store: Store, cfg: BotConfig): boolean {
  const boss = store.nextBoss
  if (!boss || boss.status !== 'available') return false
  // A running buff inflates income for a few seconds only; judge on the
  // income the fight will actually see
  if (store.activeClickBuff || store.activeBusinessBuff) return false
  const timeSec = boss.def.timeLimitSec * store.modifiers.bossTimeMult
  const target = store.bossTarget(boss.def.gate)
  const fullHustleFactor = store.maxHustle / Math.max(1, store.hustleMultiplier)
  // Taps and Interns ride Hustle; the allowance is a tap a second without it
  const clickRate = (cfg.clicksPerSec + store.autoClickers) * store.moneyPerClick * fullHustleFactor + store.allowancePerSecond
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
      const gap = store.bossCountsGain(boss.def.gate) ? target : Math.max(0, target - store.netWorth)
      const flow = store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor
      return gap <= flow * (timeSec * 0.65)
    }
    case 'netWorthWithinPar': {
      const gap = store.bossCountsGain(boss.def.gate) ? target : Math.max(0, target - store.netWorth)
      const flow = store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor
      return gap <= flow * (timeSec * 0.55)
    }
    case 'netWorth': {
      const gap = store.bossCountsGain(boss.def.gate) ? target : Math.max(0, target - store.netWorth)
      const flow = (store.moneyPerSecond + cfg.clicksPerSec * store.moneyPerClick * fullHustleFactor) * 0.85
      return gap <= flow * (timeSec * 0.65)
    }
  }
}

// A favour once a list has hit a locked card: a push towards the boss.
// The bot takes whichever event is worth most to it.
function callInFavours(store: Store): void {
  if (store.favoursLeft <= 0 || store.bossAttempt) return
  const stuck = store.visibleJobs.at(-1)?.mode === 'gated' || store.visibleBusinesses.at(-1)?.mode === 'gated'
  if (!stuck || !store.callInFavour(store.nowMs)) return
  let best = 0
  store.favourOffer.forEach((o, i) => {
    if (o.value > store.favourOffer[best].value) best = i
  })
  store.chooseFavour(best, store.nowMs)
}

export function decide(store: Store, cfg: BotConfig): void {
  manageOffice(store, cfg)
  const ev = store.activeEvent
  if (ev && ev.def.effect.type === 'scandal') {
    // Ignoring a scandal costs something, so the bot pays the first option
    store.claimMarketEvent(store.nowMs, Math.random, 0)
  } else if (ev && !ev.corked && !ev.def.shady) {
    store.claimMarketEvent(store.nowMs)
  }

  callInFavours(store)

  if (readyToChallengeBoss(store, cfg)) {
    store.startBossAttempt()
  }

  // Read the boss after starting it, so this turn already plays to its rules
  const boss = store.nextBoss
  const attempt = store.bossAttempt
  const condition = boss?.status === 'active' ? boss.def.condition : null
  // Gate 7 wants one of everything revealed: buy what's missing first, and
  // while waiting for it, save up rather than spend the cash elsewhere
  if (boss && boss.status !== 'locked' && boss.def.condition.kind === 'ownAllRevealed') {
    let missing = false
    for (const item of revealedItems(store)) {
      const owned = item.kind === 'jobs' ? store.jobsPurchased[item.id] : store.businessesOwned[item.id]
      if (!owned && store.buyItem(item.kind, item.id, 1).bought === 0) missing = true
    }
    if (missing) return
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
  const cache = new Map<string, Priced>()
  let mods = store.modifiers
  let economy = store.economyInput
  for (let i = 0; i < 12; i++) {
    // An achievement, award or market dominance can change every price
    if (store.modifiers !== mods || !sameEconomy(store.economyInput, economy)) cache.clear()
    mods = store.modifiers
    economy = store.economyInput
    const priced = priceItems(store, cache)
    const scored = bestBuyScored(store, cfg, priced)
    const dominance = dominanceToChase(store, cfg, scored.score, priced)
    if (dominance) {
      // Buy as many towards 1,000 as the cash allows
      if (store.buyItem(dominance.kind, dominance.id, 'max').bought === 0) break
      forgetPrices(cache, dominance.kind, dominance.id)
      continue
    }
    const pick = scored.pick
    if (!pick) break
    const mode = store.itemQuote(pick.kind, pick.id, 1).cost < store.money * 0.02 ? 'max' : 1
    if (store.buyItem(pick.kind, pick.id, mode).bought === 0) break
    forgetPrices(cache, pick.kind, pick.id)
  }
}

const RARITY_RANK: Readonly<Record<string, number>> = { legendary: 3, rare: 2, common: 1 }

// The bot avoids stacking mutually ruinous downsides (e.g. Nepo Baby + click
// penalties before Silver is cleared), picking the strongest heir otherwise.
function pickHeir(store: Store, cfg: BotConfig): void {
  if (cfg.solo) {
    store.heirChoices = [{ name: store.heirChoices[0]?.name ?? 'Heir', traitId: cfg.solo.trait, inheritId: cfg.solo.inherit }]
    store.pickHeir(0)
    return
  }
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

export function buyPerks(store: Store, cfg: BotConfig): void {
  for (;;) {
    let bought = false
    for (const id of cfg.perkPriority ?? DEFAULT_PERK_PRIORITY) {
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
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// probe: called once a minute of play, to look at the game without changing it
export type CampaignProbe = (store: Store, generation: number) => void
// Called after each retirement, before the heir is picked; return true to
// stop the campaign there (the store is left as it is, heirs on offer)
export type SuccessionHook = (store: Store, nextGeneration: number, ts: number) => boolean

export function runCampaign(
  hours: number,
  cfg: BotConfig = FAST_TAPPER,
  seed = 1,
  probe?: CampaignProbe,
  atSuccession?: SuccessionHook
): GenerationResult[] {
  const realRandom = Math.random
  Math.random = seededRandom(seed)
  // Nothing reads the save back mid-campaign, so don't spend time writing it
  pauseStateWrites(true)
  setSimIncomeMult(cfg.incomeMult ?? 1)
  try {
    return playCampaign(hours, cfg, probe, atSuccession)
  } finally {
    Math.random = realRandom
    pauseStateWrites(false)
    setSimIncomeMult(1)
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

function playCampaign(hours: number, cfg: BotConfig, probe?: CampaignProbe, atSuccession?: SuccessionHook): GenerationResult[] {
  localStorage.clear()
  setActivePinia(createPinia())
  const store = useGameStore()
  let ts = 1_000_000
  store.hydrateFromStorage(ts)
  store.closeIntro(ts)
  if (cfg.noTap) store.toggleNoTap()
  if (cfg.scenario) {
    store.scenario = cfg.scenario
    store.noTap = SCENARIOS_BY_ID[cfg.scenario].noTap ?? store.noTap
  }
  // Buyers follow the bulk setting; a player with staff buys to the next milestone
  store.bulkBuyMode = 'next'
  store.tick(ts)

  const results: GenerationResult[] = []
  const limitMs = hours * 3600 * 1000
  let cumulativeMs = 0
  let generation = 1
  let bloodlineBest = 0
  let netWorthAt4Min = 0
  let lastGateAtMs = 0
  let lastGates = 0
  let stayedFinite = true
  let clickCredit = 0
  let elevationsLeft = cfg.elevations ?? 0

  const finishGeneration = () => {
    results.push({
      generation,
      activeMinutes: store.activeGenerationMs / 60_000,
      deepestGate: store.gatesBeaten,
      bestBefore: bloodlineBest,
      splitsMs: [...store.splits],
      killMs: [...store.lastKillMs],
      netWorthAt4Min,
      legacyEarned: store.legacyOnRetire,
      cumulativeActiveMs: cumulativeMs,
      stayedFinite,
      abdicated: store.abdicated,
      dominance: store.dominanceHeld,
      rungHandover: freshClimb ? rungHandover : null
    })
    freshClimb = false
  }

  // Only the bloodline's first generation climbs from nothing; heirs start
  // with a trust fund and items they have seen before.
  let freshClimb = true
  const rungHandover: Record<ItemKind, (number | null)[]> = {
    jobs: JOBS.map(() => null),
    businesses: BUSINESSES.map(() => null)
  }
  const recordHandovers = () => {
    for (const [kind, items, owned] of [
      ['jobs', JOBS, store.jobsPurchased],
      ['businesses', BUSINESSES, store.businessesOwned]
    ] as const) {
      for (let i = 1; i < items.length; i++) {
        if (rungHandover[kind][i] === null && (owned[items[i].id] ?? 0) > 0) {
          rungHandover[kind][i] = owned[items[i - 1].id] ?? 0
        }
      }
    }
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
    if (probe && genMs % 60_000 === 0) probe(store, generation)
    if ((ts / 1000) % cfg.decideEverySec === 0) {
      decide(store, cfg)
      if (freshClimb) recordHandovers()
    }

    if (store.disgraceReport) {
      finishGeneration()
      cumulativeMs += genMs
      store.dismissDisgrace()
      generation = 1
      bloodlineBest = 0
      netWorthAt4Min = 0
      lastGateAtMs = 0
      lastGates = 0
      continue
    }

    const patience =
      cfg.probe && generation >= cfg.probe.fromGeneration
        ? cfg.probe.stallMinutes
        : generation === 1
          ? cfg.firstGenerationStallMinutes
          : cfg.stallMinutes
    const stalled = genMs - lastGateAtMs >= patience * 60_000
    // Stuck short of the gate retiring needs: hand over to a sibling, as a
    // player would, and give them a fresh stretch to get going
    if (stalled && !store.canRetire && store.canAbdicate && store.offerAbdication()) {
      if (cfg.solo) store.siblingChoices = [{ name: store.siblingChoices[0]?.name ?? 'Sibling', traitId: cfg.solo.trait, inheritId: cfg.solo.inherit }]
      store.pickSibling(0)
      lastGateAtMs = genMs
    }
    if (store.gatesBeaten >= 9 && elevationsLeft > 0 && store.canElevate && !store.bossAttempt) {
      finishGeneration()
      cumulativeMs += genMs
      store.elevateToLords(ts)
      pickHeir(store, cfg)
      buyPerks(store, cfg)
      elevationsLeft -= 1
      generation += 1
      bloodlineBest = 0
      netWorthAt4Min = 0
      lastGateAtMs = 0
      lastGates = 0
      continue
    }
    if (store.canRetire && (store.gatesBeaten >= 9 || stalled) && !store.bossAttempt) {
      finishGeneration()
      bloodlineBest = Math.max(bloodlineBest, store.gatesBeaten)
      cumulativeMs += genMs
      store.retire(ts)
      if (results.at(-1)?.deepestGate !== 9 && atSuccession?.(store, generation + 1, ts)) return results
      pickHeir(store, cfg)
      buyPerks(store, cfg)
      generation += 1
      netWorthAt4Min = 0
      lastGateAtMs = 0
      lastGates = 0
      // The bloodline is complete; the heir just drafted never plays
      if (results.at(-1)?.deepestGate === 9) return results
    }
  }
  finishGeneration()
  return results
}
