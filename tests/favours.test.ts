import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BUSINESSES_BY_ID, JOBS, JOBS_BY_ID } from '../src/data/items'
import { FAVOUR_DEPARTURES } from '../src/data/favours'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'
import {
  BASE_CLICK_VALUE,
  computeClickIncome,
  computeIncomeBreakdown,
  computeSectorSlices,
  favourIncome,
  legacyMultiplier,
  type EconomySnapshotInput
} from '../src/engine/economy'

const T0 = 1_000_000

function input(over: Partial<EconomySnapshotInput> = {}): EconomySnapshotInput {
  return {
    jobsPurchased: {},
    businessesOwned: {},
    legacyPoints: 0,
    classLevel: 0,
    deregulationRank: 0,
    autoClickers: 0,
    businessBuffMultiplier: 1,
    clickBuffMultiplier: 1,
    hustleMultiplier: 1,
    ...over
  }
}

describe('lent units', () => {
  it('a lent Job pays one unit at the family\'s rates, ignoring any owned', () => {
    const broker = JOBS_BY_ID['13']
    const base = input({ legacyPoints: 2, classLevel: 3 })
    const lent = input({ legacyPoints: 2, classLevel: 3, loans: { jobs: { '13': 1 }, businesses: {} } })
    const familyRate = (1 + 0.15 * 3) * legacyMultiplier(2)
    expect((computeClickIncome(lent, false) - computeClickIncome(base, false)) / (broker.moneyPerClick * familyRate)).toBeCloseTo(1)

    // Owning 50 Brokers (well past a milestone) doesn't change what the lent one pays
    const owned = input({ legacyPoints: 2, classLevel: 3, jobsPurchased: { '13': 50 } })
    const ownedAndLent = input({ ...owned, loans: { jobs: { '13': 1 }, businesses: {} } })
    expect((computeClickIncome(ownedAndLent, false) - computeClickIncome(owned, false)) / (broker.moneyPerClick * familyRate)).toBeCloseTo(1)
  })

  it('a lent Business pays one unit, without milestones or synergy', () => {
    const coffee = BUSINESSES_BY_ID['3']
    // A synergy Job owned, which would boost an owned Coffee shop
    const owned = input({ jobsPurchased: { '2': 40 } })
    const lent = input({ jobsPurchased: { '2': 40 }, loans: { jobs: {}, businesses: { '3': 2 } } })
    expect(computeIncomeBreakdown(lent).business - computeIncomeBreakdown(owned).business).toBeCloseTo(2 * coffee.moneyPerSecond)
  })

  it('reports what favours bring in, by the second', () => {
    const lent = input({ autoClickers: 2, loans: { jobs: { '1': 1 }, businesses: { '1': 1 } } })
    const f = favourIncome(lent, 0)
    expect(f.businessPerSec).toBeCloseTo(BUSINESSES_BY_ID['1'].moneyPerSecond)
    // Two Interns tap a second, and a lent rider is £1 of the £2 click pay
    expect(f.clickPerSec).toBeCloseTo(2 * JOBS_BY_ID['1'].moneyPerClick)
    expect(computeClickIncome(lent, false)).toBeCloseTo(BASE_CLICK_VALUE + JOBS_BY_ID['1'].moneyPerClick)
    expect(favourIncome(input(), 0)).toEqual({ businessPerSec: 0, clickPerSec: 0 })
  })

  it('gives favours their own slice of the revenue mix, taken out of the others', () => {
    const lent = input({ autoClickers: 2, businessesOwned: { '1': 10 }, loans: { jobs: { '1': 1 }, businesses: { '1': 1 } } })
    const slices = computeSectorSlices(lent, 0)
    const favours = slices.find((s) => s.id === 'favours')!
    expect(favours.label).toBe('Favours')
    const f = favourIncome(lent, 0)
    const total = slices.reduce((a, s) => a + s.perSec, 0)
    expect(favours.perSec).toBeCloseTo(f.businessPerSec + f.clickPerSec)
    expect(total).toBeCloseTo(computeIncomeBreakdown(lent).business + computeIncomeBreakdown(lent).interns)
    expect(computeSectorSlices(input({ businessesOwned: { '1': 10 } }), 0).some((s) => s.id === 'favours')).toBe(false)
  })
})

describe('calling in a favour', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // A family at gate 3 with two favours, the Jobs list stopping at a locked card
  function family() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.gatesBeaten = 2
    store.perks.nepotism = 2
    for (const j of JOBS) if (j.baseCost <= store.costCeiling) store.jobsPurchased[j.id] = 1
    store.tick(T0)
    return store
  }

  it('lends the bottom card, even a locked one, without making it yours', () => {
    const store = family()
    const bottom = store.visibleJobs.at(-1)!
    expect(bottom.mode).toBe('gated')
    const id = bottom.item.id
    const worth = store.netWorth
    const pay = store.baseMoneyPerClick
    expect(store.callInFavour('jobs', T0)).toBe(true)
    expect(store.lentUnits.jobs[id]).toBe(1)
    expect(store.baseMoneyPerClick).toBeGreaterThan(pay)
    expect(store.netWorth).toBe(worth)
    expect(store.jobsPurchased[id]).toBeUndefined()
    // Still locked, and nothing past it revealed
    expect(store.visibleJobs.at(-1)).toMatchObject({ mode: 'gated', item: { id } })
    expect(store.favoursLeft).toBe(1)
  })

  it('runs each favour on its own clock, then says where the help went', () => {
    const store = family()
    const id = store.favourTarget('jobs')!
    store.callInFavour('jobs', T0)
    // Two minutes of play later, a second favour
    let t = T0
    for (let i = 0; i < 120; i++) store.tick((t += 1000))
    store.callInFavour('jobs', t)
    expect(store.favourLoansFor('jobs', id)).toHaveLength(2)
    expect(store.favoursLeft).toBe(0)
    expect(store.callInFavour('jobs', t)).toBe(false)
    // At three minutes the first leaves; the second has another two to run
    for (let i = 0; i < 61; i++) store.tick((t += 1000))
    expect(store.favourLoansFor('jobs', id)).toHaveLength(1)
    expect(store.favourLoansFor('jobs', id)[0]).toBeGreaterThan(110_000)
    expect(store.favourDeparturesFor('jobs', id)).toHaveLength(1)
    expect(FAVOUR_DEPARTURES).toContain(store.favourDeparturesFor('jobs', id)[0])
    for (let i = 0; i < 125; i++) store.tick((t += 1000))
    expect(store.lentUnits.jobs[id]).toBeUndefined()
    const gone = store.favourDeparturesFor('jobs', id)
    expect(gone).toHaveLength(2)
    expect(new Set(gone).size).toBe(2)
  })

  it('needs the perk, and ends with the generation', () => {
    const store = family()
    store.perks.nepotism = 0
    expect(store.callInFavour('jobs', T0)).toBe(false)
    store.perks.nepotism = 1
    expect(store.callInFavour('businesses', T0)).toBe(true)
    store.retire(T0 + 10)
    expect(store.favours).toEqual({ used: 0, loans: [], departures: [] })
  })

  it('survives a reload, but time away earns nothing from it', () => {
    const store = family()
    const id = store.favourTarget('jobs')!
    store.callInFavour('jobs', T0)
    store.callInFavour('businesses', T0)
    // A lent Business earns while you play, but not while you're away
    expect(store.moneyPerSecond).toBeGreaterThan(store.offlinePerSecond)
    store.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 20)
    expect(again.lentUnits.jobs[id]).toBe(1)
    expect(again.favoursLeft).toBe(0)
  })
})

describe('favours on screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('puts the button on the bottom card, lends it, and shows the help on the desk', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(T0)
    if (store.tradingDeskCollapsed) store.toggleTradingDesk()
    store.gatesBeaten = 2
    store.perks.nepotism = 1
    for (const j of JOBS) if (j.baseCost <= store.costCeiling) store.jobsPurchased[j.id] = 1
    store.businessesOwned = { '1': 5 }
    await wrapper.vm.$nextTick()

    // One favour: no count on the button, and only on the bottom cards
    const buttons = wrapper.findAll('[data-testid="call-in-favour"]')
    expect(buttons.length).toBe(2)
    expect(buttons[0].text()).toBe('Call in a favour')

    const id = store.favourTarget('businesses')!
    let t = Date.now()
    store.callInFavour('businesses', t)
    for (let i = 0; i < 8; i++) store.tick((t += 500))
    await wrapper.vm.$nextTick()

    const lent = wrapper.find(`[data-item-key="businesses-${id}"]`)
    expect(lent.text()).toContain(`${BUSINESSES_BY_ID[id].label} (1)`)
    expect(lent.find('[data-testid="favour-help"]').text()).toMatch(/^Lending you a hand for 2:5\d$/)
    // The favour is spent, so no more buttons anywhere
    expect(wrapper.findAll('[data-testid="call-in-favour"]')).toHaveLength(0)

    expect(wrapper.find('[data-testid="favour-band"]').exists()).toBe(true)
    expect(wrapper.find('.scn-Desk').text()).toContain('From favours')
    expect(wrapper.find('.scn-SectorStrip').text()).toContain('Favours')
    wrapper.unmount()
  })
})
