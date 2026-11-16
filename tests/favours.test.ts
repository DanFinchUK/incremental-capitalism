import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import {
  FAVOUR_ENDINGS,
  FAVOUR_EVENTS,
  FAVOUR_EVENTS_BY_ID,
  favourEventSource,
  pickFavourOffer
} from '../src/data/favours'
import { computeIncomeBreakdown, computeSectorSlices, type EconomySnapshotInput } from '../src/engine/economy'
import { combineModifiers } from '../src/engine/modifiers'
import { useGameStore } from '../src/stores/game'

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

describe('favour events', () => {
  it('offers different events, in proportion to their worth, never ones worth nothing', () => {
    const weights = Object.fromEntries(FAVOUR_EVENTS.map((e) => [e.id, 0]))
    weights['planning'] = 1
    weights['no-meetings'] = 1
    expect(pickFavourOffer(Math.random, weights).sort()).toEqual(['no-meetings', 'planning'])
    const all = Object.fromEntries(FAVOUR_EVENTS.map((e) => [e.id, 1]))
    const offer = pickFavourOffer(Math.random, all)
    expect(offer).toHaveLength(3)
    expect(new Set(offer).size).toBe(3)
  })

  it('does what each event says', () => {
    const planning = combineModifiers([favourEventSource(FAVOUR_EVENTS_BY_ID['planning'])])
    expect(planning.sectorBusinessMult.property).toBe(2)
    expect(combineModifiers([favourEventSource(FAVOUR_EVENTS_BY_ID['no-meetings'])]).clickMult).toBe(1.5)
    expect(combineModifiers([favourEventSource(FAVOUR_EVENTS_BY_ID['strong-pound'])])).toMatchObject({ clickMult: 1.25, businessMult: 1.25 })
    const interns = combineModifiers([favourEventSource(FAVOUR_EVENTS_BY_ID['coffee-machine'])])
    const base = input({ autoClickers: 2 })
    expect(computeIncomeBreakdown({ ...base, mods: interns }).interns).toBeCloseTo(2 * computeIncomeBreakdown(base).interns)
  })

  it('gives favours their own slice of the revenue mix, taken from the rest in proportion', () => {
    const slices = computeSectorSlices(input({ businessesOwned: { '1': 10 }, autoClickers: 2 }), 0, 'Allowance', 5)
    const favours = slices.find((s) => s.id === 'favours')!
    expect(favours.label).toBe('Favours')
    expect(favours.perSec).toBe(5)
    const total = slices.reduce((a, s) => a + s.perSec, 0)
    const without = computeSectorSlices(input({ businessesOwned: { '1': 10 }, autoClickers: 2 }), 0)
    expect(total).toBeCloseTo(without.reduce((a, s) => a + s.perSec, 0))
  })
})

describe('calling in a favour', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // A family with businesses in food, two favours, and no Interns
  function family() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.perks.nepotism = 2
    store.businessesOwned = { '1': 50, '3': 20 }
    store.tick(T0)
    return store
  }

  it('offers three events that would help, and never one worth nothing', () => {
    const store = family()
    expect(store.callInFavour(T0)).toBe(true)
    expect(store.favourDialogOpen).toBe(true)
    expect(store.favourOffer.length).toBeGreaterThan(0)
    for (const o of store.favourOffer) expect(o.value).toBeGreaterThan(0)
    // No Interns and no media: neither is ever offered
    for (let i = 0; i < 30; i++) {
      store.favours = { ...store.favours, offer: [] }
      store.callInFavour(T0)
      expect(store.favours.offer).not.toContain('coffee-machine')
      expect(store.favours.offer).not.toContain('licence-fee')
    }
  })

  it('closing keeps the favour and the same offer', () => {
    const store = family()
    store.callInFavour(T0)
    const offer = [...store.favours.offer]
    store.closeFavourDialog()
    expect(store.favoursLeft).toBe(2)
    store.callInFavour(T0)
    expect(store.favours.offer).toEqual(offer)
  })

  it('runs each event on its own clock, then the news says how it ended', () => {
    const store = family()
    const before = store.moneyPerSecond
    store.favours = { ...store.favours, offer: ['sunny-bank-holiday'] }
    store.chooseFavour(0, T0)
    expect(store.favourDialogOpen).toBe(false)
    expect(store.favoursLeft).toBe(1)
    expect(store.moneyPerSecond).toBeGreaterThan(before)
    expect(store.favourPerSecond).toBeGreaterThan(0)
    expect(store.offlinePerSecond).toBeCloseTo(before)
    let t = T0
    for (let i = 0; i < 120; i++) store.tick((t += 1000))
    store.favours = { ...store.favours, offer: ['strong-pound'] }
    store.chooseFavour(0, t)
    expect(store.activeFavours).toHaveLength(2)
    expect(store.favoursLeft).toBe(0)
    expect(store.callInFavour(t)).toBe(false)
    for (let i = 0; i < 61; i++) store.tick((t += 1000))
    expect(store.activeFavours).toHaveLength(1)
    expect(store.activeFavours[0].leftMs).toBeGreaterThan(110_000)
    const news = store.bannerMessage ?? ''
    expect(news).toContain(FAVOUR_EVENTS_BY_ID['sunny-bank-holiday'].title)
    expect(FAVOUR_ENDINGS.some((e) => news.includes(e))).toBe(true)
  })

  it('needs the perk, survives a reload, and ends with the generation', () => {
    const store = family()
    store.perks.nepotism = 0
    expect(store.callInFavour(T0)).toBe(false)
    store.perks.nepotism = 1
    store.favours = { ...store.favours, offer: ['planning'] }
    store.chooseFavour(0, T0)
    store.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 20)
    expect(again.activeFavours.map((f) => f.id)).toEqual(['planning'])
    expect(again.favoursLeft).toBe(0)
    again.gatesBeaten = 1
    again.addDebugMoney(1e9, T0 + 30)
    again.retire(T0 + 40)
    expect(again.favours).toEqual({ used: 0, active: [], offer: [] })
  })
})

describe('favours on screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('calls one in from the boost strip, offers three in a dialog, and shows it running', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(T0)
    if (store.tradingDeskCollapsed) store.toggleTradingDesk()
    store.perks.nepotism = 1
    store.businessesOwned = { '1': 50, '3': 20, '5': 10 }
    await wrapper.vm.$nextTick()

    // One favour: no count on the button
    const call = wrapper.find('[data-testid="call-in-favour"]')
    expect(call.text()).toBe('Call in a favour')
    await call.trigger('click')
    const modal = wrapper.find('[data-testid="favour-modal"]')
    expect(modal.attributes('aria-modal')).toBe('true')
    const options = modal.findAll('[data-testid="favour-option"]')
    expect(options.length).toBe(3)
    const title = store.favourOffer[0].def.title
    await options[0].find('button').trigger('click')
    expect(wrapper.find('[data-testid="favour-modal"]').exists()).toBe(false)

    let t = Date.now()
    for (let i = 0; i < 8; i++) store.tick((t += 500))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="favour-running"]').text()).toMatch(new RegExp(`^${title} · 2:5\\d$`))
    expect(wrapper.find('[data-testid="call-in-favour"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="favour-band"]').exists()).toBe(true)
    expect(wrapper.find('.scn-SectorStrip').text()).toContain('Favours')
    wrapper.unmount()
  })
})
