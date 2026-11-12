import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

describe('App UI integration', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders fog-of-war with starter items and ??? teasers while hiding late tiers', () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const text = wrapper.text()
    expect(text).toContain('Hairdresser')
    expect(text).toContain('Etsy store')
    expect(text).toContain('???')
    expect(text).not.toContain('Multi-national conglomerate')
    wrapper.unmount()
  })

  it('pays out on Get Paid click, shows Hustle Streak, and spawns floating payout', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    const btn = wrapper.find('.scn-PrimaryAction')
    await btn.trigger('click')
    expect(store.money).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('1.1x Hustle')
    expect(wrapper.findAll('.scn-Float').length).toBe(1)
    wrapper.unmount()
  })

  it('switches bulk-buy modes and opens the 6-perk Old Boys Network drawer', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    const x10Btn = wrapper.findAll('.scn-BulkBtn').find((b) => b.text() === 'x10')
    expect(x10Btn).toBeDefined()
    await x10Btn!.trigger('click')
    expect(store.bulkBuyMode).toBe(10)
    expect(wrapper.text()).toContain('Get hired x10')

    const networkBtn = wrapper.find('[data-testid="toggle-legacy-shop"]')
    await networkBtn.trigger('click')
    expect(wrapper.find('.scn-Drawer').exists()).toBe(true)
    expect(wrapper.findAll('.scn-PerkCard')).toHaveLength(6)
    wrapper.unmount()
  })

  it('renders clickable Market Opportunities and WelcomeModal when offline catch-up exists', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    store.spawnSpecificEvent('shadyDeal', Date.now())
    await wrapper.vm.$nextTick()
    const toast = wrapper.find('.scn-MarketEvent')
    expect(toast.exists()).toBe(true)
    expect(toast.text()).toContain('50/50 Risk')
    await toast.trigger('click')
    expect(store.activeEvent).toBeNull()

    store.offlineReport = { secondsCredited: 3600, efficiency: 0.5, moneyEarned: 500_000 }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.scn-Modal').exists()).toBe(true)
    await wrapper.find('[data-testid="dismiss-offline"]').trigger('click')
    expect(store.offlineReport).toBeNull()
    wrapper.unmount()
  })
})
