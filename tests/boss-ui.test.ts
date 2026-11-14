import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'
import { gateThreshold, legacyForRetiring } from '../src/engine/bosses'
import { BOSSES } from '../src/data/bosses'
import { formatClock } from '../src/utils/format'

const nulls = (n: number) => Array(n).fill(null)

describe('boss and splits UI', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('formats clock times and signed deltas', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-30_000, true)).toBe('-0:30')
    expect(formatClock(30_000, true)).toBe('+0:30')
  })

  it('shows the next boss, starts it, and shows progress and time left', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    await wrapper.vm.$nextTick()
    const card = () => wrapper.find('[data-testid="boss-card"]')
    expect(card().text()).toContain('Zero-Hours Walkout')
    expect(wrapper.find('[data-testid="boss-start"]').exists()).toBe(false)

    store.addDebugMoney(gateThreshold(1))
    await wrapper.vm.$nextTick()
    expect(card().text()).toContain(BOSSES[0].twistText)
    expect(card().text()).toContain(BOSSES[0].conditionText)
    await wrapper.find('[data-testid="boss-start"]').trigger('click')
    expect(store.bossAttempt).not.toBeNull()
    expect(card().find('[role="progressbar"]').exists()).toBe(true)
    expect(card().text()).toContain('left')
    await wrapper.find('[data-testid="boss-abandon"]').trigger('click')
    expect(store.bossAttempt).toBeNull()
    wrapper.unmount()
  })

  it('shows splits against best with ahead and behind deltas', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.splits = [null, 60_000, 200_000, ...nulls(7)]
    store.bestSplits = [null, 90_000, 150_000, ...nulls(7)]
    await wrapper.vm.$nextTick()
    const panel = wrapper.find('[data-testid="splits-panel"]')
    expect(panel.text()).toContain('1:00')
    expect(panel.find('.scn-SplitAhead').text()).toBe('-0:30')
    expect(panel.find('.scn-SplitBehind').text()).toBe('+0:50')
    wrapper.unmount()
  })

  it('retire button pays by depth and is disabled before the first gate', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    await wrapper.vm.$nextTick()
    const retire = () => wrapper.findAll('button').find((b) => b.text().includes('Retire for'))!
    expect(retire().attributes('disabled')).toBeDefined()
    store.gatesBeaten = 3
    await wrapper.vm.$nextTick()
    expect(retire().text()).toContain(`Retire for +${legacyForRetiring(3, 0)}`)
    expect(retire().attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('hints when a tasting is corked', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.spawnSpecificEvent('taxRebate')
    store.activeEvent!.corked = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.scn-MarketEvent').text()).toContain('smells a bit off')
    wrapper.unmount()
  })

  it('never shows the word steamroll', async () => {
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.bestKillMs = [null, 1000, ...nulls(8)]
    store.lastKillMs = [null, 1000, ...nulls(8)]
    await wrapper.vm.$nextTick()
    expect(wrapper.html().toLowerCase()).not.toContain('steamroll')
    wrapper.unmount()
  })
})

describe('heir draft UI', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows the succession choice after retiring and hands over on pick', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    expect(wrapper.text()).toContain(store.heir.name)
    store.addDebugMoney(1e9)
    store.gatesBeaten = 1
    store.retire()
    await wrapper.vm.$nextTick()
    const modal = wrapper.find('[data-testid="heir-draft"]')
    expect(modal.exists()).toBe(true)
    expect(modal.findAll('[data-testid="heir-option"]')).toHaveLength(3)
    const chosen = store.heirChoices[2]
    await modal.findAll('[data-testid="heir-option"]')[2].find('button').trigger('click')
    expect(wrapper.find('[data-testid="heir-draft"]').exists()).toBe(false)
    expect(store.heir).toEqual(chosen)
    expect(wrapper.text()).toContain(chosen.name)
    wrapper.unmount()
  })
})

describe('family office UI', () => {
  it('shows the headhunter, passes or hires into a seat, and preserves rarity styling and campaign timer on the PA chair', async () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.headhunterOffer = ['sommelier', 'planning-lobby', 'proxy']
    await wrapper.vm.$nextTick()
    const panel = () => wrapper.find('[data-testid="family-office"]')
    expect(panel().text()).toContain('Sommelier')
    expect(panel().text()).toContain('Proxy with Power of Attorney')
    expect(panel().find('[data-testid="skip-advisor"]').exists()).toBe(true)
    await panel().findAll('[data-testid="hire-advisor"]')[1].trigger('click')
    expect(store.officeSeats[0]?.advisorId).toBe('planning-lobby')
    store.officeSeats[0]!.campaignMs = 9 * 60_000
    await panel().find('[data-testid="promote-pa"]').trigger('click')
    expect(store.paChair?.advisorId).toBe('planning-lobby')
    const paChair = panel().find('[data-testid="pa-chair"]')
    expect(paChair.classes()).toContain('scn-AdvisorCard-legendary')
    expect(paChair.text()).toContain('Legendary')
    expect(paChair.text()).toContain('Campaigning for 9 min')
    wrapper.unmount()
  })

  it('shows the disgrace modal when a boss fails and starts a fresh bloodline on dismiss', async () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.gatesBeaten = 3
    store.addDebugMoney(gateThreshold(4) * 1.2, 1000)
    store.tick(1000)
    store.startBossAttempt()
    for (let i = 0; i < 16; i++) store.buyItem('jobs', '1', 1)
    store.tick(2000)
    await wrapper.vm.$nextTick()

    const modal = wrapper.find('[data-testid="disgrace-modal"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('Bruges')
    await modal.find('[data-testid="dismiss-disgrace"]').trigger('click')
    expect(wrapper.find('[data-testid="disgrace-modal"]').exists()).toBe(false)
    expect(store.generation).toBe(1)
    wrapper.unmount()
  })
})
