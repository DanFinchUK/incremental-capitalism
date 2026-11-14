import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../src/stores/game'
import { GATE_NET_WORTH } from '../src/data/classes'
import { BUSINESSES_BY_ID } from '../src/data/items'
import { BASE_CLICK_VALUE } from '../src/engine/economy'

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
    expect(first).toBeGreaterThan(BASE_CLICK_VALUE)
    for (let i = 0; i < 25; i++) {
      store.manualClick(1000 + i * 50)
    }
    expect(store.hustleMultiplier).toBeCloseTo(3.0, 5)

    store.tick(2250) // initialize lastTickMs
    store.tick(5250) // 3s later (>1.5s idle) -> decays back toward 1x
    expect(store.hustleMultiplier).toBeLessThan(1.5)
  })

  it('supports Retire, free 1st Intern, one Legacy per perk rank, and +1x/rank Grindset Hustle cap', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    // Cannot claim free 0-cost Intern before earning at least 1 Legacy
    expect(store.buyPerk('autoClicker')).toBe(false)

    store.addDebugMoney(1e12, 1000)
    store.gatesBeaten = 2 // two gates past a fresh bloodline's best of 0: +2
    expect(store.legacyOnRetire).toBe(2)
    const estate = store.netWorth
    const lifetimeBefore = store.lifetimeEarned
    // The trust fund is 5% of the estate, but a deep estate is capped so the
    // heir lands one gate short of the parent: here, at the gate 1 threshold
    expect(estate * 0.05).toBeGreaterThan(GATE_NET_WORTH[1])
    expect(store.heirInheritancePreview).toBe(GATE_NET_WORTH[1])
    store.retire(2000)
    expect(store.legacyPoints).toBe(2)
    // The trust fund isn't counted as earned
    expect(store.money).toBe(GATE_NET_WORTH[1])
    expect(store.lifetimeEarned).toBe(lifetimeBefore)
    expect(store.legacyAvailable).toBe(2)

    // 1st Intern costs 0, then every rank costs 1
    expect(store.buyPerk('autoClicker')).toBe(true)
    expect(store.perks.autoClicker).toBe(1)
    expect(store.legacyAvailable).toBe(2)

    expect(store.buyPerk('autoClicker')).toBe(true)
    expect(store.perks.autoClicker).toBe(2)
    expect(store.legacyAvailable).toBe(1)

    expect(store.buyPerk('hustleCap')).toBe(true) // costs 1 -> raises max Hustle to 4x!
    expect(store.perks.hustleCap).toBe(1)
    expect(store.legacyAvailable).toBe(0)
    expect(store.buyPerk('hustleCap')).toBe(false)

    for (let i = 0; i < 25; i++) {
      store.manualClick(2100 + i * 40)
    }
    expect(store.hustleMultiplier).toBeCloseTo(4.0, 5)
  })

  it('resolves Golden Opportunities and 50/50 Shady Deals without ever taking player cash', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.businessesOwned['1'] = 2
    store.money = 10_000

    store.spawnSpecificEvent('quantitativeEasing', 2000)
    const res1 = store.claimMarketEvent(2100, () => 0.2)
    expect(res1).toBe('golden')
    expect(store.activeBusinessBuff).toMatchObject({ mult: 5, label: 'QE', remainingSec: 20 })

    // Losing the 50/50 shady roll freezes for 15s; with no automation that
    // halves income instead. Zero cash lost either way
    store.spawnSpecificEvent('shadyDeal', 3000)
    const res2 = store.claimMarketEvent(3100, () => 0.9)
    expect(res2).toBe('shadyFreeze')
    expect(store.money).toBe(10_000)
    expect(store.incomePenalty).toMatchObject({ mult: 0.5 })
  })

  it('pays windfalls from unbuffed income and never downgrades a stronger running buff', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.businessesOwned['1'] = 1
    store.money = 0
    const etsy = BUSINESSES_BY_ID['1'].moneyPerSecond

    store.spawnSpecificEvent('quantitativeEasing', 2000)
    store.claimMarketEvent(2000)
    expect(store.moneyPerSecond).toBeCloseTo(etsy * 5, 5)

    // Tax Rebate during 5x QE still pays 60s of *unbuffed* income
    store.spawnSpecificEvent('taxRebate', 3000)
    store.claimMarketEvent(3000)
    expect(store.money).toBeCloseTo(etsy * 60, 5)

    // A weaker 3x Stimulus doesn't replace the running 5x QE
    store.spawnSpecificEvent('stimulusCheque', 4000)
    store.claimMarketEvent(4000)
    expect(store.activeBusinessBuff).toMatchObject({ mult: 5, label: 'QE' })

    // Legendary Unpaid Overtime replaces a weaker click buff
    store.spawnSpecificEvent('paidOvertime', 5000)
    store.claimMarketEvent(5000)
    expect(store.activeClickBuff?.mult).toBe(2)
    store.spawnSpecificEvent('unpaidOvertime', 6000)
    store.claimMarketEvent(6000)
    expect(store.activeClickBuff).toMatchObject({ mult: 7, label: 'Unpaid Overtime' })
  })

  it('credits offline catch-up when returning after >=60s and throttles tick saves', () => {
    const store1 = useGameStore()
    store1.hydrateFromStorage(10_000)
    store1.businessesOwned['1'] = 1
    store1.flushSave(10_000)

    setActivePinia(createPinia())
    const store2 = useGameStore()
    store2.hydrateFromStorage(10_000 + 120_000) // 2 minutes later
    expect(store2.offlineReport).not.toBeNull()
    expect(store2.offlineReport?.efficiency).toBe(0.5)
    expect(store2.offlineReport?.moneyEarned).toBeCloseTo(BUSINESSES_BY_ID['1'].moneyPerSecond * 120 * 0.5, 2)

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
