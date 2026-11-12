import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FIRST_LEGACY_LIFETIME } from '../src/engine/economy'
import { useGameStore } from '../src/stores/game'

describe('useGameStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('reveals initial items with a single ??? teaser and lifts fog-of-war as items are bought', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    // Start: Job 1 revealed, Job 2 teaser (because Job 1 not owned yet? Spec: i===0 revealed; if i-1 owned or seen, i revealed + i+1 teaser)
    expect(store.visibleJobs[0]).toMatchObject({ mode: 'revealed' })
    expect(store.visibleJobs.some((r) => r.mode === 'teaser')).toBe(true)
    expect(store.visibleJobs.length).toBeLessThan(5)

    store.money = 500
    store.buyItem('jobs', '1', 1)
    // Owning Job #1 ('1' Gig delivery rider) reveals Job #2 ('19' Hairdresser) and pushes teaser to Job #3
    const revealedIds = store.visibleJobs.filter((r) => r.mode === 'revealed').map((r) => r.item.id)
    expect(revealedIds).toContain('1')
    expect(revealedIds).toContain('19')
  })

  it('builds Hustle Streak on manual clicks up to 3x and decays after 1.5s', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    const first = store.manualClick(1000)
    expect(first).toBeGreaterThan(30)
    for (let i = 0; i < 25; i++) {
      store.manualClick(1000 + i * 50)
    }
    expect(store.hustleMultiplier).toBeCloseTo(3.0, 5)

    store.tick(2250) // initialize lastTickMs
    store.tick(5250) // 3s later (>1.5s idle) -> decays back toward 1x
    expect(store.hustleMultiplier).toBeLessThan(1.5)
  })

  it('supports Retire with Trust Fund seed cash and Old Boys Network perk purchases', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.addDebugMoney(FIRST_LEGACY_LIFETIME * 9, 1000) // enough for 3 legacy points
    expect(store.legacyGain).toBe(3)
    store.retire(2000)
    expect(store.legacyPoints).toBe(3)
    expect(store.legacyAvailable).toBe(3)

    expect(store.buyPerk('trustFund')).toBe(true) // costs 1
    expect(store.perks.trustFund).toBe(1)
    expect(store.legacyAvailable).toBe(2)

    store.addDebugMoney(FIRST_LEGACY_LIFETIME * 16, 3000)
    store.retire(4000)
    expect(store.money).toBe(25_000) // Trust Fund rank 1 starting cash
  })

  it('resolves Golden Opportunities and 50/50 Shady Deals without ever taking player cash', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.businessesOwned['1'] = 2
    store.money = 10_000

    store.spawnSpecificEvent('bullRun', 2000)
    const res1 = store.claimMarketEvent(2100, () => 0.2)
    expect(res1).toBe('golden')
    expect(store.isBullRunActive).toBe(true)

    // Losing 50/50 shady roll freezes auto-buy for 15s, zero cash lost
    store.spawnSpecificEvent('shadyDeal', 3000)
    const res2 = store.claimMarketEvent(3100, () => 0.9)
    expect(res2).toBe('shadyFreeze')
    expect(store.money).toBe(10_000)
    expect(store.isAutoBuyFrozen).toBe(true)
  })

  it('credits offline catch-up when returning after >=60s and throttles tick saves', () => {
    const store1 = useGameStore()
    store1.hydrateFromStorage(10_000)
    store1.businessesOwned['1'] = 1 // £2,600/s
    store1.flushSave(10_000)

    setActivePinia(createPinia())
    const store2 = useGameStore()
    store2.hydrateFromStorage(10_000 + 120_000) // 2 minutes later
    expect(store2.offlineReport).not.toBeNull()
    expect(store2.offlineReport?.efficiency).toBe(0.5)
    expect(store2.offlineReport?.moneyEarned).toBeCloseTo(2600 * 120 * 0.5, 2)

    // Tick at +500ms does not overwrite localStorage yet; at +2500ms it flushes
    const savedBefore = localStorage.getItem('state')
    store2.tick(130_500)
    expect(localStorage.getItem('state')).toBe(savedBefore)
    store2.tick(132_600)
    expect(localStorage.getItem('state')).not.toBe(savedBefore)
  })

  it('persists compactAutoBuy toggle across reloads', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)

    expect(store.compactAutoBuy).toBe(false)
    store.toggleCompactAutoBuy()
    expect(store.compactAutoBuy).toBe(true)

    setActivePinia(createPinia())
    const reloaded = useGameStore()
    reloaded.hydrateFromStorage(2000)
    expect(reloaded.compactAutoBuy).toBe(true)
  })
})
