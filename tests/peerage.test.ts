import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { peerageRank, titlePaChairs, titlesFor, titleSource } from '../src/engine/peerage'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('peerage rules', () => {
  it('converts Legacy into titles: one for every 9, a whole bloodline\'s worth', () => {
    expect(titlesFor(8)).toBe(0)
    expect(titlesFor(9)).toBe(1)
    expect(titlesFor(36)).toBe(4)
  })

  it('names ranks from Baron to Duke', () => {
    expect(peerageRank(0)).toBe('Commoner')
    expect(peerageRank(1)).toBe('Baron')
    expect(peerageRank(3)).toBe('Earl')
    expect(peerageRank(9)).toBe('Duke')
  })

  it('titles pay 50% more income and make Legacy 15% stronger each, and bring a PA chair', () => {
    expect(titleSource(2)).toMatchObject({ clickMult: 2, businessMult: 2 })
    expect(titleSource(1).legacyScale).toBeCloseTo(1.15)
    expect(titleSource(3).legacyScale).toBeCloseTo(1.45)
    expect(titleSource(5)).not.toHaveProperty('buyerItemTypes')
    expect(titlePaChairs(0)).toBe(1)
    expect(titlePaChairs(3)).toBe(4)
  })
})

describe('elevation in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function lordReady() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.bestSplits = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    // 27 banked plus the 9 this generation would bank: 4 titles
    store.legacyPoints = 27
    store.legacySpent = 10
    store.perks.hustleCap = 3
    store.gatesBeaten = 9
    store.addDebugMoney(1e21, T0)
    store.headhunterOffer = ['lobbyist', 'sommelier', 'accountant']
    store.hireAdvisor(0)
    store.promoteToPA(0)
    store.achievements = ['side-hustle']
    return store
  }

  it('cannot elevate before the Royal Garden Party has ever fallen', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.legacyPoints = 50
    expect(store.canElevate).toBe(false)
    expect(store.elevateToLords(T0)).toBe(false)
  })

  it('trades Legacy, perks and the office for titles, keeping the family history', () => {
    const store = lordReady()
    expect(store.canElevate).toBe(true)
    expect(store.titlesOnElevation).toBe(4)
    expect(store.elevateToLords(T0)).toBe(true)
    expect(store.titles).toBe(4)
    // Each title starts the new line with 2 Legacy, which doesn't count towards the next title
    expect(store.legacyPoints).toBe(8)
    expect(store.titlesOnElevation).toBe(0)
    expect(store.legacySpent).toBe(0)
    expect(store.perks.hustleCap).toBe(0)
    // The PA hands over to their child, one tier down: the rare Lobbyist's
    // child arrives as a Parliamentary Researcher
    expect(store.paChairs[0]?.advisorId).toBe('parliamentary-researcher')
    expect(store.paChairs[0]?.servedGenerations).toBe(0)
    expect(store.paChairs).toHaveLength(5) // a PA chair per title, and the first
    expect(store.gatesBeaten).toBe(0)
    expect(store.achievements).toEqual(['side-hustle'])
    expect(store.familyTree.length).toBe(1)
    expect(store.heirChoices).toHaveLength(4) // two or more titles: four heirs to choose from
    expect(store.officeSeats).toHaveLength(3)
  })

  it('once every gate is beaten, the gate card points to the Lords when elevation is open', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(T0)
    store.gatesBeaten = 9
    store.bestSplits = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    store.legacyPoints = 0
    await wrapper.vm.$nextTick()
    // Not enough Legacy for a title yet: retire it is
    store.legacyPoints = 0
    store.familyTree = [{ generation: 1, name: 'Old Test', traitId: null, inheritId: null, deepestGate: 9, legacyEarned: 9, activeMs: 1, advisors: [], splits: [] }]
    await wrapper.vm.$nextTick()
    expect(store.canElevate).toBe(false)
    expect(wrapper.find('[data-testid="top-of-pyramid"]').text()).toContain('Retire to pass it all on')
    expect(wrapper.find('[data-testid="boss-elevate"]').exists()).toBe(false)
    store.legacyPoints = 9
    await wrapper.vm.$nextTick()
    expect(store.canElevate).toBe(true)
    expect(wrapper.find('[data-testid="top-of-pyramid"]').text()).not.toContain('Retire')
    await wrapper.find('[data-testid="boss-elevate"]').trigger('click')
    expect(document.body.querySelector('[data-testid="elevate-modal"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('starts the new line with no trust fund, so no gate opens before it can be fought', () => {
    const store = lordReady()
    store.addDebugMoney(1e60, T0)
    store.elevateToLords(T0)
    store.pickHeir(0)
    expect(store.money).toBe(0)
    expect(store.netWorth).toBe(0)
    expect(store.nextBoss?.status).toBe('locked')
  })

  it('titles multiply income and survive a reload', () => {
    const store = lordReady()
    store.elevateToLords(T0)
    store.pickHeir(0)
    store.heir = { name: 'Test', traitId: null }
    store.gatesBeaten = 9
    store.businessesOwned = { '1': 5 }
    // Income alone, without the Legacy the titles start the line with
    store.legacyPoints = 0
    const withTitles = store.moneyPerSecond
    store.titles = 0
    expect(withTitles / store.moneyPerSecond).toBeCloseTo(3) // 1 + 0.5 x 4
    store.titles = 4
    store.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 20)
    expect(again.titles).toBe(4)
  })

  it('offers elevation from the top bar once eligible', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    expect(wrapper.find('[data-testid="elevate"]').exists()).toBe(false)
    store.bestSplits = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    store.legacyPoints = 18
    await wrapper.vm.$nextTick()
    const btn = wrapper.find('[data-testid="elevate"]')
    expect(btn.text()).toContain('2')
    await btn.trigger('click')
    expect(wrapper.find('[data-testid="elevate-modal"]').exists()).toBe(true)
    await wrapper.find('[data-testid="confirm-elevate"]').trigger('click')
    expect(store.titles).toBe(2)
    wrapper.unmount()
  })
})
