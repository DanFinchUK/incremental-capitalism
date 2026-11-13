import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { gateThreshold } from '../src/engine/bosses'
import { computeIncomeBreakdown, computePassivePerSecond } from '../src/engine/economy'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

// A store at gate `gate` with the boss unlocked and the intro closed.
function readyFor(gate: number) {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  store.gatesBeaten = gate - 1
  store.addDebugMoney(gateThreshold(gate), T0)
  store.tick(T0)
  return store
}

describe('boss attempts', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
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
    store.legacyPoints = 1
    store.lifetimePurchases.businesses['1'] = 500
    store.startBossAttempt()
    for (let i = 1; i <= 3; i++) store.tick(T0 + i * 1100)
    expect(store.businessesOwned['1'] ?? 0).toBe(0)
    store.abandonBossAttempt()
    store.tick(T0 + 5000)
    expect(store.businessesOwned['1'] ?? 0).toBeGreaterThan(0)
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
    store.startBossAttempt()
    const before = store.money
    const click = store.manualClick(T0 + 10)
    expect(store.money).toBe(before)
    expect(store.bossAttempt!.polish).toBeCloseTo(click)
    const { business, interns } = computeIncomeBreakdown(store.economyInput)
    const polishBefore = store.bossAttempt!.polish
    store.tick(T0 + 1000)
    // Money is around 1e17 here, so allow for float spacing
    expect(store.money - before).toBeCloseTo(business, -2)
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
