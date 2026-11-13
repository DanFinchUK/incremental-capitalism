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
    expect(wrapper.find('[data-testid="legacy-modal"]').exists()).toBe(true)
    expect(wrapper.findAll('.scn-PerkCard')).toHaveLength(6)
    wrapper.unmount()
  })

  it('shows the new-player intro on a fresh game, steps through it, and reopens from How to play', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.hydrateFromStorage(Date.now())
    await wrapper.vm.$nextTick()

    const intro = () => wrapper.find('[data-testid="intro-modal"]')
    expect(intro().exists()).toBe(true)
    expect(intro().text()).toContain('Welcome to Incremental Capitalism')

    // Market Opportunities hold off while the intro is open
    const t0 = Date.now()
    store.tick(t0)
    store.tick(t0 + 3_600_000)
    expect(store.activeEvent).toBeNull()

    for (let i = 0; i < 3; i++) {
      await wrapper.find('[data-testid="intro-next"]').trigger('click')
    }
    expect(intro().text()).toContain('Retire and let your heir take over')
    expect(wrapper.find('[data-testid="intro-skip"]').exists()).toBe(false)
    await wrapper.find('[data-testid="intro-next"]').trigger('click')
    expect(intro().exists()).toBe(false)
    expect(store.introSeen).toBe(true)
    expect(JSON.parse(localStorage.getItem('state')!).scene.introSeen).toBe(true)

    await wrapper.find('[data-testid="open-intro"]').trigger('click')
    expect(intro().text()).toContain('Welcome to Incremental Capitalism')
    await wrapper.find('[data-testid="intro-skip"]').trigger('click')
    expect(intro().exists()).toBe(false)
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

    store.closeIntro()
    store.offlineReport = { secondsCredited: 3600, efficiency: 0.5, moneyEarned: 500_000 }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.scn-Modal').exists()).toBe(true)
    await wrapper.find('[data-testid="dismiss-offline"]').trigger('click')
    expect(store.offlineReport).toBeNull()
    wrapper.unmount()
  })

  it('shows stack share, buy delta, and compact rows for automated items', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    store.gatesBeaten = 9
    store.legacyPoints = 1
    store.businessesOwned = { '1': 10, '20': 10 }
    // Etsy's next unit (~£124k) is under 1% of £15M cash, so it is automated;
    // the Phone kiosk's (~£516k) is not, so it keeps its buy button and delta
    store.money = 15_000_000
    store.seenItems.jobs = { '1': true, '19': true, '2': true, '3': true, '4': true, '5': true }
    store.seenItems.businesses = { '1': true, '20': true }
    await wrapper.vm.$nextTick()

    // Stack total + % share + buy delta on the revealed items
    const pageText = wrapper.text()
    expect(pageText).toContain('total (')
    expect(pageText).toContain('(+£')

    // Compact mode collapses the automated Etsy store into a compact row, click expands
    const compactBtn = wrapper.find('[data-testid="toggle-compact-autobuy"]')
    expect(compactBtn.exists()).toBe(true)
    await compactBtn.trigger('click')
    expect(store.compactAutoBuy).toBe(true)
    expect(wrapper.find('[data-item-key="businesses-1"]').classes()).toContain('scn-Card-compact')

    await wrapper.find('[data-item-key="businesses-1"]').trigger('click')
    expect(wrapper.find('[data-item-key="businesses-1"]').classes()).not.toContain('scn-Card-compact')

    // Pausing automation brings back the manual buy button on automated cards
    const pauseBtn = wrapper.find('[data-testid="toggle-autobuy-pause"]')
    expect(pauseBtn.exists()).toBe(true)
    expect(pauseBtn.text()).toContain('Automation: On')
    await pauseBtn.trigger('click')
    expect(pauseBtn.text()).toContain('Automation: Paused')
    expect(wrapper.find('[data-item-key="businesses-1"]').text()).toContain('Get Businessed')
    wrapper.unmount()
  })

  it('opens Golden Parachute retire modal with Before -> After stats and opens Old Boys Network on confirm', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    store.addDebugMoney(600_000_000_000, 1000)
    store.gatesBeaten = 1 // beating gate 1 pays +1 Legacy
    await wrapper.vm.$nextTick()

    const retireTrigger = wrapper.findAll('button').find((b) => b.text().includes('Retire for +1'))
    expect(retireTrigger).toBeDefined()
    await retireTrigger!.trigger('click')

    const modal = wrapper.find('[data-testid="retire-modal"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('x1 → x1.05')
    expect(modal.find('[data-testid="heir-inheritance"]').text()).toContain('£30,000,000,000')
    expect(modal.text()).toContain('Free Unpaid Intern')

    await wrapper.find('[data-testid="confirm-retire-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="retire-modal"]').exists()).toBe(false)
    expect(store.legacyPoints).toBe(1)
    expect(store.legacyDrawerOpen).toBe(true)
    wrapper.unmount()
  })

  it('gates Reset modal destructive action behind confirmation checkbox before wiping state', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    store.legacyPoints = 5
    store.money = 123_456
    await wrapper.vm.$nextTick()

    const resetTrigger = wrapper.findAll('button').find((b) => b.text() === 'Reset game')
    expect(resetTrigger).toBeDefined()
    await resetTrigger!.trigger('click')

    const modal = wrapper.find('[data-testid="reset-modal"]')
    expect(modal.exists()).toBe(true)
    const confirmBtn = wrapper.find('[data-testid="confirm-reset-btn"]')
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(true)

    await confirmBtn.trigger('click')
    expect(store.legacyPoints).toBe(5)

    const checkbox = wrapper.find('[data-testid="confirm-reset-checkbox"]')
    await checkbox.setValue(true)
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(false)

    await confirmBtn.trigger('click')
    expect(wrapper.find('[data-testid="reset-modal"]').exists()).toBe(false)
    expect(store.legacyPoints).toBe(0)
    expect(store.money).toBe(0)
    wrapper.unmount()
  })

  it('opens the 7-tier Class Pyramid modal with fog-of-war ??? above the next target class', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    expect(store.highestClassReached).toBe(0)

    await wrapper.find('[data-testid="open-class-pyramid"]').trigger('click')
    const modal = wrapper.find('[data-testid="class-modal"]')
    expect(modal.exists()).toBe(true)

    const text = modal.text()
    // Reached (0: Precarious proletariat) + Next (1: Emergent service worker) visible; higher veiled as ???
    expect(text).toContain('Precarious proletariat')
    expect(text).toContain('Emergent service worker')
    expect(text).toContain('???')
    expect(text).not.toContain('Established middle class')
    expect(text).not.toContain('Hereditary peerage')
    wrapper.unmount()
  })
})
