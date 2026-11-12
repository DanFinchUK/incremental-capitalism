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
    const cardTitles = wrapper.findAll('.scn-CardTitle').map((el) => el.text())
    expect(cardTitles).toContain('Gig delivery rider (0)')
    expect(cardTitles).toContain('Etsy store (0)')
    expect(cardTitles).toContain('???')
    expect(cardTitles.some((t) => t.includes('Artisanal sourdough bakery'))).toBe(false)
    expect(cardTitles.some((t) => t.includes('Multi-national conglomerate'))).toBe(false)
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

  it('shows stack share, buy delta, and compact auto-buy rows', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    store.legacyPoints = 1
    store.businessesOwned = { '1': 10, '20': 2 }
    store.lifetimePurchases.businesses = { '1': 50, '20': 2 }
    store.seenItems.jobs = { '1': true, '19': true, '2': true, '3': true, '4': true, '5': true }
    store.seenItems.businesses = { '1': true, '20': true }
    await wrapper.vm.$nextTick()

    // Stack total + % share + buy delta on revealed non-auto-bought Phone case & repair kiosk
    const pageText = wrapper.text()
    expect(pageText).toContain('total (')
    expect(pageText).toContain('(+£')

    // Compact auto-buy collapses active auto-bought Etsy store into a compact row, click expands
    const compactBtn = wrapper.find('[data-testid="toggle-compact-autobuy"]')
    expect(compactBtn.exists()).toBe(true)
    await compactBtn.trigger('click')
    expect(store.compactAutoBuy).toBe(true)
    expect(wrapper.find('[data-item-key="businesses-1"]').classes()).toContain('scn-Card-compact')

    await wrapper.find('[data-item-key="businesses-1"]').trigger('click')
    expect(wrapper.find('[data-item-key="businesses-1"]').classes()).not.toContain('scn-Card-compact')
    wrapper.unmount()
  })
})
