import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { legacyForRetiring } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('family tree', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function retireOnce() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.addDebugMoney(1e9, T0)
    store.gatesBeaten = 2
    store.activeGenerationMs = 25 * 60_000
    store.headhunterOffer = ['sommelier', 'lobbyist', 'proxy']
    store.hireAdvisor(0)
    store.promoteToPA(0)
    const founder = store.heir.name
    store.retire(T0)
    return { store, founder }
  }

  it('records each generation when it retires', () => {
    const { store, founder } = retireOnce()
    expect(store.familyTree).toHaveLength(1)
    expect(store.familyTree[0]).toMatchObject({
      generation: 1,
      name: founder,
      traitId: null,
      deepestGate: 2,
      legacyEarned: legacyForRetiring(2, 0),
      activeMs: 25 * 60_000,
      advisors: ['Sommelier']
    })
  })

  it('remembers the tree through a reload', () => {
    const { store } = retireOnce()
    store.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 20)
    expect(again.familyTree).toHaveLength(1)
  })

  it('opens from the header and lists the generations and stacked bloodline traits', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.perks.autoClicker = 3
    store.familyTree = [
      { generation: 1, name: 'Hugo Ashcombe-Blythe', traitId: 'nepo-baby', deepestGate: 4, legacyEarned: 15, activeMs: 1_800_000, advisors: ['Sommelier'], splits: [] }
    ]
    store.heir = { name: 'Cressida Ashcombe-Blythe', traitId: 'black-sheep' }
    await wrapper.vm.$nextTick()

    // Ancestor Nepo Baby + current Black Sheep both stack permanently
    expect(store.modifiers.internsDisabled).toBe(true)
    expect(store.autoClickers).toBe(0)
    expect(store.modifiers.businessMult).toBeCloseTo(2)
    expect(store.modifiers.clickMult).toBeCloseTo(0.5)

    // Having reached Gate 4 previously, retiring requires at least Gate 3
    expect(store.minRetireGate).toBe(3)
    store.gatesBeaten = 2
    expect(store.canRetire).toBe(false)
    store.gatesBeaten = 3
    expect(store.canRetire).toBe(true)

    await wrapper.find('[data-testid="open-family-tree"]').trigger('click')
    const modal = wrapper.find('[data-testid="family-tree"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('Hugo Ashcombe-Blythe')
    expect(modal.text()).toContain('Charity Golf Match')
    expect(modal.text()).toContain(store.heir.name)
    expect(modal.find('[data-testid="bloodline-traits"]').text()).toContain('Interns barred')
    wrapper.unmount()
  })
})
