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

  it('quotes the boss a locked card is waiting on', () => {
    useGameStore().hydrateFromStorage(1000)
    const wrapper = mount(ItemCard, {
      props: { kind: 'jobs', row: { mode: 'gated', bossTitle: 'Polishing the Family Silver' } as never },
      global: { plugins: [pinia] }
    })
    expect(wrapper.text()).toContain('Beat "Polishing the Family Silver" to unlock')
  })

  it('shows income and says nothing about automation until someone brings it', () => {
    const { wrapper } = card()
    expect(wrapper.text()).toContain('Income:')
    expect(wrapper.text()).not.toMatch(/automat/i)
  })

  it('sums the automation line into one status pill once anything brings it', () => {
    const { store } = card()
    expect(store.automationPill).toBe('')
    hireEstateManager(store)
    expect(store.automationPill).toBe('Auto under 1% of cash')
    store.perks.nepotism = 2
    expect(store.automationPill).toMatch(/^Auto under [\d.]+% of cash$/)
    expect(store.automationPill).not.toBe('Auto under 1% of cash')
    store.toggleAutoBuyPaused()
    expect(store.automationPill).toBe('Auto paused')
  })

  it('shows job income at the base rate, ignoring Hustle', async () => {
    const { store, wrapper } = card()
    const before = wrapper.find('.scn-IncomeLine').text()
    store.hustleBonus = 1.5
    await wrapper.vm.$nextTick()
    expect(store.moneyPerClick).toBeGreaterThan(store.jobBaseMoneyPerClick)
    expect(wrapper.find('.scn-IncomeLine').text()).toBe(before)
  })

  it('keeps the buy button on an automated item', async () => {
    const { store, wrapper } = card()
    hireEstateManager(store)
    store.money = JOBS_BY_ID['1'].baseCost * 1e6 // far under the line: automated
    store.tick(2000)
    await wrapper.vm.$nextTick()
    expect(store.isAutomated('jobs', '1')).toBe(true)
    // Automated cards look like any other: no shading and no status line
    expect(wrapper.find('[data-item-key="jobs-1"]').classes()).not.toContain('scn-Card-automated')
    expect(wrapper.text()).not.toContain('restocking')
    const buy = wrapper.find('.scn-Actions button.scn-Action')
    expect(buy.exists()).toBe(true)
    // The per-click gain is on the Income line, so the cost line doesn't repeat it
    expect(wrapper.find('.scn-CostLine').text()).not.toContain('/click')
  })

  it('collapses whenever Automate is ticked, whatever the price', async () => {
    const { store, wrapper } = card()
    hireEstateManager(store)
    store.compactAutoBuy = true
    store.money = 0 // nothing is under the line
    await wrapper.vm.$nextTick()
    expect(store.isAutomated('jobs', '1')).toBe(false)
    expect(wrapper.classes()).toContain('scn-Card-compact')
    expect(wrapper.find('.scn-Action-compact').exists()).toBe(true)

    store.money = JOBS_BY_ID['1'].baseCost * 1e6
    store.tick(2000)
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).toContain('scn-Card-compact')

    // Unticking Automate unfolds it
    store.toggleAutoBuy('jobs', '1')
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).not.toContain('scn-Card-compact')
  })
})
