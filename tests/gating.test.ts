import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BUSINESSES, JOBS } from '../src/data/items'
import { SOCIAL_CLASSES } from '../src/data/classes'
import { classInfoForLevel } from '../src/engine/economy'
import { useGameStore } from '../src/stores/game'

describe('classInfoForLevel', () => {
  it('takes perks from the level and progress from net worth', () => {
    const c = classInfoForLevel(2, SOCIAL_CLASSES[2].threshold)
    expect(c.current.level).toBe(2)
    expect(c.incomeMultiplier).toBeCloseTo(1.3)
    expect(c.costDiscount).toBeCloseTo(0.96)
    expect(c.bracketProgress).toBe(0)
    expect(classInfoForLevel(2, SOCIAL_CLASSES[3].threshold).bracketProgress).toBe(1)
    expect(classInfoForLevel(9, 1e30).next).toBeNull()
  })
})

describe('class gates in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('keeps class at the gates beaten, whatever the net worth', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.addDebugMoney(1e12, 1000)
    expect(store.classStatus.current.level).toBe(0)
    store.gatesBeaten = 2
    expect(store.classStatus.current.level).toBe(2)
    expect(store.costCeiling).toBe(SOCIAL_CLASSES[3].threshold)
  })

  it('persists gates beaten', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.gatesBeaten = 3
    store.flushSave(1000)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(1000)
    expect(again.gatesBeaten).toBe(3)
  })

  it('hides items above the ceiling even when cash could buy them', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.money = 1e12
    // Own one of everything, so only the ceiling limits what is shown
    for (const j of JOBS) store.jobsPurchased[j.id] = 1
    for (const b of BUSINESSES) store.businessesOwned[b.id] = 1
    store.tick(1000)
    store.tick(2000)
    for (const list of [store.visibleJobs, store.visibleBusinesses]) {
      const revealed = list.flatMap((r) => (r.mode === 'revealed' ? [r.item.baseCost] : []))
      expect(Math.max(...revealed)).toBeLessThanOrEqual(store.costCeiling)
      expect(list.at(-1)).toMatchObject({ mode: 'gated', bossTitle: 'Zero-Hours Walkout' })
    }
  })

  it('hides items owned in earlier generations if they are above the ceiling', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    const above = JOBS.find((j) => j.baseCost > store.costCeiling)!
    store.lifetimePurchases.jobs[above.id] = 40
    store.tick(1000)
    store.tick(2000)
    expect(store.visibleJobs.some((r) => r.mode === 'revealed' && r.item.id === above.id)).toBe(false)
  })

  it('never buys an item above the ceiling, by hand or with Max', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.money = 1e15
    const above = JOBS.find((j) => j.baseCost > store.costCeiling)!
    expect(store.buyItem('jobs', above.id).bought).toBe(0)
    const bizAbove = BUSINESSES.find((b) => b.baseCost > store.costCeiling)!
    expect(store.buyItem('businesses', bizAbove.id).bought).toBe(0)
    store.setBulkBuyMode('max')
    expect(store.buyItem('jobs', JOBS[0].id).bought).toBeGreaterThan(0)
    expect(store.jobsPurchased[above.id] ?? 0).toBe(0)
  })

  it('auto-buy never buys above the ceiling', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.legacyPoints = 1
    for (const b of BUSINESSES) store.lifetimePurchases.businesses[b.id] = 500
    store.money = 1e15
    for (let i = 1; i <= 5; i++) store.tick(1000 + i * 1100)
    for (const b of BUSINESSES.filter((x) => x.baseCost > store.costCeiling)) {
      expect(store.businessesOwned[b.id] ?? 0).toBe(0)
    }
  })

  it('does not promote on net worth alone', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.businessesOwned = {}
    store.addDebugMoney(1e9, 1000)
    store.tick(1000)
    store.tick(2000)
    expect(store.classStatus.current.level).toBe(0)
    expect(store.classModalOpen).toBe(false)
  })
})
