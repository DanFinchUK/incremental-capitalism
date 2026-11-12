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

  it('collapses and expands the City Trading Desk', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    expect(wrapper.findAll('.scn-DeskMonitor')).toHaveLength(2)

    await wrapper.find('[data-testid="toggle-trading-desk"]').trigger('click')
    expect(wrapper.findAll('.scn-DeskMonitor')).toHaveLength(0)

    await wrapper.find('[data-testid="toggle-trading-desk"]').trigger('click')
    expect(wrapper.findAll('.scn-DeskMonitor')).toHaveLength(2)
    wrapper.unmount()
  })

  it('replaces broken ? retire help icon with a next-Legacy progress bar inside Lifetime earnings', () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    expect(wrapper.find('.scn-Help').exists()).toBe(false)
    expect(wrapper.text()).toContain('Next Legacy (+1) at £3.00T')
    expect(wrapper.find('[data-testid="legacy-progress-bar"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
