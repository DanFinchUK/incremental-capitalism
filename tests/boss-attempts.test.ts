import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { gateThreshold } from '../src/engine/bosses'
import { computeIncomeBreakdown, computePassivePerSecond } from '../src/engine/economy'
import { hireEstateManager } from './helpers'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

// A store at gate `gate` with the boss unlocked and the intro closed.
function readyFor(gate: number) {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  store.gatesBeaten = gate - 1
  // A little over the threshold: automation spends from the first tick, and
  // float rounding could otherwise leave net worth a hair under it
  // (and an ignored scandal can cost a little cash during long tests)
  store.addDebugMoney(gateThreshold(gate) * 1.1, T0)
  store.tick(T0)
  return store
}

describe('boss attempts', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('only the next gate can be attempted, once unlocked', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    expect(store.nextBoss).toMatchObject({ status: 'locked' })
    expect(store.nextBoss!.def.gate).toBe(1)
    expect(store.startBossAttempt()).toBe(false)
    store.addDebugMoney(gateThreshold(1), T0)
    expect(store.nextBoss!.status).toBe('available')
    expect(store.startBossAttempt()).toBe(true)
    expect(store.nextBoss!.status).toBe('active')
    expect(store.nextBoss!.remainingSec).toBe(180)
    store.gatesBeaten = 9
    expect(store.nextBoss).toBeNull()
  })

  it('Walkout halves click pay only during the attempt', () => {
    const store = readyFor(1)
    const before = store.moneyPerClick
    store.startBossAttempt()
    expect(store.moneyPerClick).toBeCloseTo(before / 2)
    store.abandonBossAttempt()
    expect(store.moneyPerClick).toBeCloseTo(before)
  })

  it('Planning makes purchases cost 50% more only during the attempt', () => {
    const store = readyFor(3)
    const before = store.itemQuote('jobs', '1', 1).cost
    store.startBossAttempt()
    expect(store.itemQuote('jobs', '1', 1).cost).toBeCloseTo(before * 1.5)
    store.abandonBossAttempt()
    expect(store.itemQuote('jobs', '1', 1).cost).toBeCloseTo(before)
  })

  it('Grilling pauses automation only during the attempt', () => {
    const store = readyFor(8)
    hireEstateManager(store)
    const units = () => Object.values(store.jobsPurchased).reduce((a, b) => a + b, 0) + Object.values(store.businessesOwned).reduce((a, b) => a + b, 0)
    store.startBossAttempt()
    const during = units()
    for (let i = 1; i <= 3; i++) store.tick(T0 + i * 1100)
    expect(units()).toBe(during)
    store.abandonBossAttempt()
    store.tick(T0 + 5000)
    expect(units()).toBeGreaterThan(during)
  })

  it("Landlord's rent applies to every income credit, including windfalls and clicks", () => {
    const store = readyFor(2)
    store.businessesOwned['1'] = 1
    store.startBossAttempt()
    const before = store.money
    store.spawnSpecificEvent('taxRebate', T0)
    store.claimMarketEvent(T0)
    const windfall = Math.max(500, computePassivePerSecond({ ...store.economyInput, businessBuffMultiplier: 1, clickBuffMultiplier: 1 }) * 60)
    expect(store.money - before).toBeCloseTo(windfall * 0.7)
    const mid = store.money
    const click = store.manualClick(T0 + 10)
    expect(store.money - mid).toBeCloseTo(click * 0.7)
    expect(store.bossAttempt!.earnedAfterTax).toBeCloseTo(store.money - before)
  })

  it('Silver diverts click income, manual and Interns, into polish', () => {
    const store = readyFor(6)
    store.businessesOwned['1'] = 2
    store.jobsPurchased['1'] = 5
    store.perks.autoClicker = 2
    store.toggleAutoBuyPaused() // keep automation's spending out of the sums
    store.startBossAttempt()
    const before = store.money
    const click = store.manualClick(T0 + 10)
    expect(store.money).toBe(before)
    expect(store.bossAttempt!.polish).toBeCloseTo(click)
    const { business, interns } = computeIncomeBreakdown(store.economyInput)
    const polishBefore = store.bossAttempt!.polish
    store.tick(T0 + 1000)
    // Money is around 1e18 here, so allow for float spacing
    expect(store.money - before).toBeCloseTo(business, -3)
    expect(store.bossAttempt!.polish - polishBefore).toBeGreaterThan(interns * 0.9)
  })

  it('Golf is lost once purchases exceed par', () => {
    const store = readyFor(4)
    store.money = 1e15
    store.startBossAttempt()
    for (let i = 0; i < 16; i++) store.buyItem('jobs', '1', 1)
    expect(store.bossAttempt!.purchases).toBe(16)
    store.tick(T0 + 1000)
    expect(store.bossAttempt).toBeNull()
    expect(store.nextBoss!.status).toBe('cooldown')
  })

  it('a win promotes, opens the class modal on first reach, and clears the twist', () => {
    const store = readyFor(1)
    store.jobsPurchased['1'] = 400
    store.startBossAttempt()
    const halfClick = store.moneyPerClick
    for (let i = 0; i < 60; i++) store.manualClick(T0 + 10 + i * 20)
    store.tick(T0 + 1500)
    expect(store.gatesBeaten).toBe(1)
    expect(store.classStatus.current.level).toBe(1)
    expect(store.classModalOpen).toBe(true)
    expect(store.celebratedClassLevel).toBe(1)
    expect(store.bossAttempt).toBeNull()
    expect(store.moneyPerClick).toBeGreaterThan(halfClick * 1.5)
    expect(store.nextBoss!.def.gate).toBe(2)
  })

  it('a loss starts a cooldown measured in active time', () => {
    // Four minutes of play: pin chance so a random scandal can't move net worth
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const store = readyFor(1)
    store.startBossAttempt()
    let t = T0
    for (let i = 0; i < 181; i++) store.tick((t += 1000))
    expect(store.bossAttempt).toBeNull()
    expect(store.nextBoss!.status).toBe('cooldown')
    expect(store.nextBoss!.cooldownSec).toBeGreaterThan(55)
    store.tick((t += 2 * 3600 * 1000))
    expect(store.nextBoss!.status).toBe('cooldown')
    for (let i = 0; i < 61; i++) store.tick((t += 1000))
    expect(store.nextBoss!.status).toBe('available')
  })

  it('reload mid-attempt abandons it with no cooldown and no lingering twist', () => {
    const store = readyFor(3)
    const normal = store.itemQuote('jobs', '1', 1).cost
    store.startBossAttempt()
    store.flushSave(T0 + 500)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 600)
    expect(again.bossAttempt).toBeNull()
    expect(again.nextBoss!.status).toBe('available')
    expect(again.itemQuote('jobs', '1', 1).cost).toBeCloseTo(normal)
  })

  it('offline time never advances the active clock', () => {
    const store = readyFor(1)
    const start = store.activeGenerationMs
    store.tick(T0 + 1000)
    expect(store.activeGenerationMs).toBe(start + 1000)
    store.tick(T0 + 1000 + 2 * 3600 * 1000)
    expect(store.activeGenerationMs).toBe(start + 1000)
  })

  it('time away mid-attempt abandons the fight before crediting offline income', () => {
    const store = readyFor(2)
    store.businessesOwned['1'] = 50
    store.startBossAttempt()
    store.tick(T0 + 3600 * 1000)
    expect(store.offlineReport).not.toBeNull()
    expect(store.bossAttempt).toBeNull()
    expect(store.gatesBeaten).toBe(1)
    expect(store.nextBoss!.status).toBe('available')
  })

  it('Golf benches automation so only your own purchases are strokes', () => {
    const store = readyFor(4)
    store.startBossAttempt()
    expect(store.twist.automationPaused).toBe(true)
    expect(store.nextBoss!.def.twistText.toLowerCase()).toContain('automation')
  })

  it('abandoning after the first few seconds still costs the cooldown', () => {
    const store = readyFor(1)
    store.startBossAttempt()
    store.abandonBossAttempt()
    expect(store.nextBoss!.status).toBe('available') // a misclick is free
    store.startBossAttempt()
    let t = T0
    for (let i = 0; i < 15; i++) store.tick((t += 1000))
    store.abandonBossAttempt()
    expect(store.nextBoss!.status).toBe('cooldown')
  })

  it('a corked bottle leaves with the sommelier when the fight ends', () => {
    const store = readyFor(5)
    store.startBossAttempt()
    store.tick(T0 + 7000)
    store.activeEvent!.corked = true
    store.abandonBossAttempt()
    expect(store.activeEvent).toBeNull()
  })

  it('good tastings during the Champagne fight pay a fine-vintage bonus', () => {
    const store = readyFor(5)
    store.businessesOwned['1'] = 10
    store.startBossAttempt()
    store.spawnSpecificEvent('paidOvertime', T0)
    const before = store.money
    store.claimMarketEvent(T0)
    const income = computePassivePerSecond({ ...store.economyInput, businessBuffMultiplier: 1, clickBuffMultiplier: 1 })
    expect(store.money - before).toBeCloseTo(income * 20, -2)
  })

  it('the Champagne flood waits while the intro is open', () => {
    const store = readyFor(5)
    store.startBossAttempt()
    store.openIntro()
    store.tick(T0 + 7000)
    expect(store.activeEvent).toBeNull()
  })

  it('Champagne floods opportunities, and a corked one costs 5% of cash', () => {
    const store = readyFor(5)
    store.startBossAttempt()
    store.tick(T0 + 7000)
    expect(store.activeEvent).not.toBeNull()
    store.activeEvent!.corked = true
    const before = store.money
    expect(store.claimMarketEvent(T0 + 7100)).toBe('corked')
    expect(store.money).toBeCloseTo(before * 0.95)
  })
})
