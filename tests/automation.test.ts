import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { automationShare, isWithinAutomationLine, MAX_AUTOMATION_PURCHASES_PER_TICK } from '../src/engine/automation'
import { useGameStore } from '../src/stores/game'

describe('automation line', () => {
  it('starts at 1% of cash and moves 1% per Old School Tie rank', () => {
    expect(automationShare(0, 0)).toBeCloseTo(0.01)
    expect(automationShare(2, 0)).toBeCloseTo(0.03)
    expect(automationShare(0, 0.1)).toBeCloseTo(0.11)
    expect(automationShare(4, 5)).toBeCloseTo(0.5) // capped
    expect(isWithinAutomationLine(1000, 100_000, 0.01)).toBe(true)
    expect(isWithinAutomationLine(1001, 100_000, 0.01)).toBe(false)
  })
})

describe('mastery automation in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function fresh(money: number) {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.closeIntro(1000)
    store.money = money
    return store
  }

  it('keeps cheap items stocked and leaves the frontier alone, with no Interns or Legacy', () => {
    const store = fresh(100_000)
    store.tick(1000) // reveals the cheap jobs
    expect(store.isAutomated('jobs', '2')).toBe(false)
    store.tick(2100)
    expect(store.jobsPurchased['1'] ?? 0).toBeGreaterThan(0) // £20 gig rider
    expect(store.jobsPurchased['19'] ?? 0).toBeGreaterThan(0) // £350 hairdresser
    expect(store.jobsPurchased['2'] ?? 0).toBe(0) // £2,500 cleaner is over 1% of cash
    // Restocked up to the line and no further
    expect(store.isAutomated('jobs', '1')).toBe(false)
  })

  it('skips excluded items and stops while paused', () => {
    const store = fresh(100_000)
    store.toggleAutoBuy('jobs', '1')
    store.tick(2100)
    expect(store.jobsPurchased['1'] ?? 0).toBe(0)
    expect(store.jobsPurchased['19'] ?? 0).toBeGreaterThan(0)
    store.toggleAutoBuyPaused()
    const owned = store.jobsPurchased['19']
    store.tick(3200)
    expect(store.jobsPurchased['19']).toBe(owned)
  })

  it('Old School Tie moves the line closer to the frontier', () => {
    const store = fresh(300_000)
    store.perks.nepotism = 2 // 3% of cash; 1% would stay under the £2,500 Cleaner
    // The per-second cap means the cheapest items fill first
    for (let i = 1; i <= 4; i++) store.tick(1000 + i * 1100)
    expect(store.jobsPurchased['2'] ?? 0).toBeGreaterThan(0)
  })

  it('buys at most a capped number of units per second', () => {
    const store = fresh(1e30)
    store.gatesBeaten = 9
    store.tick(2100)
    const units = Object.values(store.jobsPurchased).reduce((a, b) => a + b, 0) + Object.values(store.businessesOwned).reduce((a, b) => a + b, 0)
    expect(units).toBeLessThanOrEqual(MAX_AUTOMATION_PURCHASES_PER_TICK)
    expect(units).toBeGreaterThan(0)
    store.tick(2500) // within the one-second cooldown
    const again = Object.values(store.jobsPurchased).reduce((a, b) => a + b, 0) + Object.values(store.businessesOwned).reduce((a, b) => a + b, 0)
    expect(again).toBe(units)
  })
})
