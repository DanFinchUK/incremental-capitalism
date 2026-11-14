import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ItemCard from '../src/components/ItemCard.vue'
import { JOBS_BY_ID } from '../src/data/items'
import { useGameStore } from '../src/stores/game'
import { hireEstateManager } from './helpers'

describe('item card without automation', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function card() {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.closeIntro(1000)
    store.jobsPurchased['1'] = 3
    const wrapper = mount(ItemCard, {
      props: { kind: 'jobs', row: { mode: 'revealed', item: JOBS_BY_ID['1'] } as never },
      global: { plugins: [pinia] }
    })
    return { store, wrapper }
  }

  it('shows income and says nothing about automation until someone brings it', () => {
    const { wrapper } = card()
    expect(wrapper.text()).toContain('Income:')
    expect(wrapper.text()).not.toMatch(/automat/i)
  })

  it('describes the automation line once an Estate Manager is hired', async () => {
    const { store, wrapper } = card()
    hireEstateManager(store)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Income:')
    expect(wrapper.text()).toContain('under 1% of your cash')
  })

  it('keeps the buy button and its income preview on an automated item', async () => {
    const { store, wrapper } = card()
    hireEstateManager(store)
    store.money = JOBS_BY_ID['1'].baseCost * 1e6 // far under the line: automated
    store.tick(2000)
    await wrapper.vm.$nextTick()
    expect(store.isAutomationShown('jobs', '1')).toBe(true)
    expect(wrapper.text()).toContain('restocks under 1% of your cash')
    const buy = wrapper.find('.scn-Actions button.scn-Action')
    expect(buy.exists()).toBe(true)
    expect(wrapper.text()).toMatch(/\(\+£[\d.,]+[A-Za-z]*\/click/)
  })
})
