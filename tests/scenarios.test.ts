import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { SCENARIOS } from '../src/data/scenarios'
import { HALL_KEY, bestDynasty, parseHall } from '../src/engine/hall'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('scenarios', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function store() {
    const s = useGameStore()
    s.hydrateFromStorage(T0)
    s.closeIntro(T0)
    return s
  }

  it('every scenario has a story and a plain rule, with no em dashes', () => {
    for (const s of SCENARIOS) {
      expect(s.blurb.length, s.id).toBeGreaterThan(30)
      expect(s.rules.length, s.id).toBeGreaterThan(10)
      expect(s.blurb + s.rules).not.toContain('—')
    }
  })

  it('stay closed until a family has made Duke', () => {
    const s = store()
    s.beginNewFamily('hands-on', 'classic', T0)
    expect(s.scenario).toBe('standard')
  })

  it('Hands-On: no Interns, no buyers, no allowance, and no perks for them', () => {
    const s = store()
    s.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 1, roll: [], scenario: 'standard' }]
    s.beginNewFamily('hands-on', 'classic', T0)
    s.closeCensus(T0)
    expect(s.scenario).toBe('hands-on')
    s.perks.autoClicker = 3
    s.headhunterOffer = ['estate-manager']
    s.hireAdvisor(0)
    expect(s.autoClickers).toBe(0)
    expect(s.hasBuyers).toBe(false)
    s.toggleNoTap()
    expect(s.noTap).toBe(false)
    s.legacyPoints = 10
    expect(s.buyPerk('autoClicker')).toBe(false)
    expect(s.buyPerk('signingAuthority')).toBe(false)
    expect(s.buyPerk('hustleCap')).toBe(true)
  })

  it('Absent Landlord: no tapping, for the whole dynasty, reload included', () => {
    const s = store()
    s.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 1, roll: [], scenario: 'standard' }]
    s.beginNewFamily('absent-landlord', 'classic', T0)
    s.closeCensus(T0)
    expect(s.noTap).toBe(true)
    s.toggleNoTap()
    expect(s.noTap).toBe(true)
    s.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = store()
    expect(again.scenario).toBe('absent-landlord')
    expect(again.noTap).toBe(true)
  })

  it('Austerity: the headhunter never calls', () => {
    const s = store()
    s.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 1, roll: [], scenario: 'standard' }]
    s.beginNewFamily('austerity', 'classic', T0)
    s.closeCensus(T0)
    s.rollOffer()
    expect(s.headhunterOffer).toHaveLength(0)
    s.legacyPoints = 10
    expect(s.buyPerk('officeSeats')).toBe(false)
  })

  it('a new dynasty after a scenario keeps the player\'s own tapping choice, and the Hall keeps a best for each', () => {
    const s = store()
    s.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 9_000, roll: [], scenario: 'standard' }]
    s.beginNewFamily('absent-landlord', 'classic', T0)
    s.closeCensus(T0)
    s.dynastyComplete = true
    s.dynastyMs = 20_000
    s.foundNewDynasty(T0 + 1, 'standard')
    expect(s.noTap).toBe(false)
    const hall = parseHall(localStorage.getItem(HALL_KEY))
    expect(hall[0].scenario).toBe('absent-landlord')
    expect(bestDynasty(hall, 'absent-landlord')?.activeMs).toBe(20_000)
    expect(bestDynasty(hall, 'standard')?.activeMs).toBe(9_000)
  })
})

describe('choosing a scenario on screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('the finale sends the player to the menu to choose a scenario, and the new family plays the one chosen', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const s = useGameStore()
    s.closeIntro(T0)
    s.dynastyComplete = true
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="new-dynasty"]').trigger('click')
    expect(wrapper.find('[data-testid="dukedom-modal"]').exists()).toBe(false)
    const menu = wrapper.find('[data-testid="main-menu"]')
    expect(menu.find('[data-testid="menu-confirm-abandon"]').exists()).toBe(true)
    const picker = menu.find('[data-testid="scenario-picker"]')
    for (const sc of SCENARIOS) expect(picker.text()).toContain(sc.name)
    await picker.find('[data-testid="scenario-austerity"] input').setValue(true)
    const confirm = menu.find('[data-testid="menu-confirm-new-dynasty"]')
    expect(confirm.text()).toBe('Found the new dynasty')
    await confirm.trigger('click')
    expect(s.scenario).toBe('austerity')
    expect(s.dynastyComplete).toBe(false)
    expect(s.hall).toHaveLength(1)
    // The new family is written into the register, under its terms
    const census = wrapper.find('[data-testid="census"]')
    expect(census.text()).toContain('Austerity')
    expect(census.find('[data-testid="census-earlier"]').text()).toContain('Duke')
    wrapper.unmount()
  })

  it('the menu offers scenarios only once a family has made Duke', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const s = useGameStore()
    s.closeIntro(T0)
    s.openMenu()
    await wrapper.vm.$nextTick()
    // No family yet: nothing to abandon, and with no scenarios, Begin goes straight to the register
    expect(wrapper.find('[data-testid="menu-new-dynasty"]').exists()).toBe(false)
    await wrapper.find('[data-testid="menu-continue"]').trigger('click')
    expect(wrapper.find('[data-testid="scenario-picker"]').exists()).toBe(false)
    expect(s.census).not.toBeNull()
    // Once a family has made Duke, beginning asks for a scenario first
    s.census = null
    s.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 1, roll: [], scenario: 'standard' }]
    s.openMenu()
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="menu-continue"]').trigger('click')
    expect(wrapper.find('[data-testid="scenario-picker"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('a family yet to start chooses its scenario before going into the register', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const s = useGameStore()
    s.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 1, roll: [], scenario: 'standard' }]
    s.openMenu()
    await wrapper.vm.$nextTick()
    // "A new family" leads to the scenarios, not straight to the register
    expect(wrapper.find('[data-testid="menu-new-dynasty"]').exists()).toBe(false)
    await wrapper.find('[data-testid="menu-continue"]').trigger('click')
    expect(s.census).toBeNull()
    await wrapper.find('[data-testid="scenario-austerity"]').trigger('click')
    await wrapper.find('[data-testid="menu-confirm-new-dynasty"]').trigger('click')
    expect(s.scenario).toBe('austerity')
    expect(s.menuOpen).toBe(true)
    expect(s.census).not.toBeNull()
    wrapper.unmount()
  })
})
