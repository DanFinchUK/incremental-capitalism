import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { MARKET_EVENTS } from '../src/data/events'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('scandal data', () => {
  it('has at least four scandals, each with two choices', () => {
    const scandals = MARKET_EVENTS.filter((e) => e.effect.type === 'scandal')
    expect(scandals.length).toBeGreaterThanOrEqual(4)
    for (const s of scandals) {
      if (s.effect.type !== 'scandal') continue
      expect(s.effect.options).toHaveLength(2)
      for (const o of s.effect.options) expect(o.label.length).toBeGreaterThan(5)
    }
  })
})

describe('scandals in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function ready() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.toggleAutoBuyPaused()
    store.money = 1_000_000
    store.businessesOwned = { '1': 5 }
    return store
  }

  it('needs a choice: claiming without one does nothing', () => {
    const store = ready()
    store.spawnSpecificEvent('leakedWhatsApps', T0)
    expect(store.claimMarketEvent(T0)).toBeNull()
    expect(store.activeEvent).not.toBeNull()
  })

  it('paying the hush money costs 10% of cash', () => {
    const store = ready()
    store.spawnSpecificEvent('leakedWhatsApps', T0)
    store.claimMarketEvent(T0, () => 0.5, 0)
    expect(store.money).toBeCloseTo(900_000)
    expect(store.activeEvent).toBeNull()
  })

  it('riding it out is a gamble: publicity boost or income halved', () => {
    const lucky = ready()
    lucky.spawnSpecificEvent('leakedWhatsApps', T0)
    lucky.claimMarketEvent(T0, () => 0.1, 1)
    expect(lucky.activeBusinessBuff?.mult).toBe(3)

    setActivePinia(createPinia())
    const unlucky = ready()
    const before = unlucky.money
    unlucky.spawnSpecificEvent('leakedWhatsApps', T0)
    unlucky.claimMarketEvent(T0, () => 0.9, 1)
    expect(unlucky.incomePenalty?.mult).toBe(0.5)
    unlucky.manualClick(T0 + 10)
    const click = unlucky.moneyPerClick
    expect(unlucky.money - before).toBeCloseTo(click * 0.5)
  })

  it('shows two choices on the card and resolves the one you pick', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.money = 1_000_000
    store.spawnSpecificEvent('leakedWhatsApps')
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('[data-testid="scandal-option"]')
    expect(buttons).toHaveLength(2)
    await buttons[0].trigger('click')
    expect(store.activeEvent).toBeNull()
    expect(store.money).toBeCloseTo(900_000)
    wrapper.unmount()
  })
})
