import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { legacyForDepth } from '../src/engine/bosses'
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
      legacyEarned: legacyForDepth(2),
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

  it('opens from the header and lists the generations', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.familyTree = [
      { generation: 1, name: 'Hugo Ashcombe-Blythe', traitId: null, deepestGate: 3, legacyEarned: 7, activeMs: 1_800_000, advisors: ['Sommelier'], splits: [] }
    ]
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="open-family-tree"]').trigger('click')
    const modal = wrapper.find('[data-testid="family-tree"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('Hugo Ashcombe-Blythe')
    expect(modal.text()).toContain('Garden Office Planning Permission')
    expect(modal.text()).toContain(store.heir.name) // the current head, still writing their chapter
    wrapper.unmount()
  })
})
