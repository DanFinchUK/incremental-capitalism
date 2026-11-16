import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

describe('City Trading Desk & Legacy bracket progress UI', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders LON:FLOW and LON:CASH SVG charts without NaN coordinates and updates on clicks/purchases', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()

    expect(wrapper.text()).toContain('LON:FLOW')
    expect(wrapper.text()).toContain('LON:CASH')
    expect(wrapper.text()).toContain('PORTFOLIO REVENUE MIX')

    // Click Get Paid a few times and advance 250ms sample tick
    const payBtn = wrapper.find('.scn-PrimaryAction')
    await payBtn.trigger('click')
    await payBtn.trigger('click')
    store.tick(Date.now() + 300)
    await wrapper.vm.$nextTick()

    const paths = wrapper.findAll('.scn-Desk svg path')
    expect(paths.length).toBeGreaterThanOrEqual(2)
    for (const p of paths) {
      expect(p.attributes('d') ?? '').not.toContain('NaN')
    }
    expect(wrapper.text()).toContain('Manual Hustle')
    wrapper.unmount()
  })

  it('shows the automation line on the desk once anything brings it', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    expect(wrapper.find('[data-testid="desk-automation"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="desk-restock-line"]').exists()).toBe(false)
    store.perks.nepotism = 2
    store.money = 1_000_000
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="desk-automation"]').text()).toBe(`AUTO <${store.automationLinePct}%`)
    expect(wrapper.find('[data-testid="desk-restock-line"]').text()).toContain('Auto restocks under')
    store.toggleAutoBuyPaused()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="desk-automation"]').text()).toBe('AUTO PAUSED')
    expect(wrapper.find('[data-testid="desk-restock-line"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('names the next item automation will pick up, and the cash it needs', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.perks.nepotism = 2
    store.money = 0
    await wrapper.vm.$nextTick()
    const next = store.nextAutomation!
    expect(next.label).toBe('Gig delivery rider')
    expect(next.cash).toBeCloseTo(store.itemQuote('jobs', '1', 1).cost / store.automationLine)
    expect(wrapper.find('[data-testid="desk-next-auto"]').text()).toContain('Gig delivery rider')
    store.toggleAutoBuy('jobs', '1')
    expect(store.nextAutomation?.label).not.toBe('Gig delivery rider')
    wrapper.unmount()
  })

  it('draws the next automation threshold on the cash chart when it is within reach', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    if (store.tradingDeskCollapsed) store.toggleTradingDesk()
    store.perks.nepotism = 2
    store.autoBuyPaused = false
    store.money = 1500 // the gig rider joins automation at about £2,167
    const t0 = Date.now()
    for (let i = 1; i <= 8; i++) store.tick(t0 + i * 500)
    await wrapper.vm.$nextTick()
    expect(store.nextAutomation!.cash).toBeGreaterThan(store.money)
    expect(wrapper.find('[data-testid="desk-threshold-line"]').exists()).toBe(true)
    // Far out of reach: no line, only the words under the chart
    // (once the £1,500 candles have left the chart's 80 seconds)
    store.money = 10
    for (let i = 9; i <= 400; i++) {
      store.money = 10
      store.tick(t0 + i * 500)
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="desk-threshold-line"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('collapses and expands the City Trading Desk', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    expect(wrapper.findAll('.scn-DeskMonitor')).toHaveLength(2)

    await wrapper.find('[data-testid="toggle-trading-desk"]').trigger('click')
    expect(wrapper.findAll('.scn-DeskMonitor')).toHaveLength(0)

    await wrapper.find('[data-testid="toggle-trading-desk"]').trigger('click')
    expect(wrapper.findAll('.scn-DeskMonitor')).toHaveLength(2)
    wrapper.unmount()
  })

  it('says which gate opens retiring before it is allowed', () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    expect(wrapper.find('.scn-Help').exists()).toBe(false)
    expect(wrapper.find('[data-testid="hero-legacy"]').text()).toContain('Retire at Gate 1')
    expect(wrapper.find('[data-testid="hero-retire"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
