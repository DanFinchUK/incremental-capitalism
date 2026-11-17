import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import type { GenerationRecord } from '../src/engine/family'
import { HALL_KEY, addToHall, bestDynasty, parseHall, rollLines } from '../src/engine/hall'
import { STORAGE_KEY, parseSavedState } from '../src/engine/migration'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

const person = (generation: number, over: Partial<GenerationRecord> = {}): GenerationRecord => ({
  generation,
  name: `Person ${generation}`,
  traitId: null,
  inheritId: null,
  deepestGate: 9,
  legacyEarned: 0,
  activeMs: 60_000,
  advisors: [],
  splits: [],
  ...over
})

describe('the roll', () => {
  it('heads each line with whoever took the family up to its rank', () => {
    const roll = [person(1), person(2, { elevated: true }), person(3), person(4, { elevated: true }), person(5, { elevated: true })]
    const lines = rollLines(roll)
    expect(lines.map((l) => l.rank)).toEqual(['The commoners', 'The Barons', 'The Viscounts', 'The Earls'])
    expect(lines[1].people.map((p) => p.record.generation)).toEqual([2, 3])
    expect(lines[1].people[0].became).toBe(1)
    expect(lines[1].people[1].became).toBeNull()
    expect(lines[0].activeMs).toBe(60_000)
  })

  it('uses recorded titles where they exist, and keeps ranks past Duke with the Duke', () => {
    const roll = [
      person(1, { titles: 0 }),
      person(2, { titles: 0, elevated: true, becameTitles: 2 }),
      person(3, { titles: 2, elevated: true, becameTitles: 5 }),
      person(4, { titles: 5, elevated: true, becameTitles: 6 })
    ]
    const lines = rollLines(roll)
    expect(lines.map((l) => l.rank)).toEqual(['The commoners', 'The Viscounts', 'The Duke'])
    expect(lines[2].people).toHaveLength(2)
  })
})

describe('the Hall of Dynasties', () => {
  it('keeps the newest first, finds the best, and shrugs off a damaged store', () => {
    const a = { surname: 'A', finishedAt: 1, activeMs: 5000, roll: [person(1)], scenario: 'standard' as const }
    const b = { surname: 'B', finishedAt: 2, activeMs: 3000, roll: [], scenario: 'hands-on' as const }
    const hall = addToHall(addToHall([], a), b)
    expect(hall.map((d) => d.surname)).toEqual(['B', 'A'])
    expect(bestDynasty(hall)?.surname).toBe('B')
    expect(parseHall(JSON.stringify(hall))).toEqual(hall)
    expect(parseHall('not json')).toEqual([])
    expect(parseHall(JSON.stringify([{ surname: 3 }]))).toEqual([])
  })
})

describe('the dukedom in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // A Marquess's family with gate 9 beaten and a PA, one elevation from Duke
  function marquess() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.titles = 4
    store.achievements = ['side-hustle']
    store.noTap = true
    store.familyTree = [{ ...person(1), elevated: true }]
    store.bestSplits = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    store.gatesBeaten = 9
    store.legacyPoints = 30
    store.headhunterOffer = ['estate-manager']
    store.hireAdvisor(0)
    store.paChairs[0]!.servedGenerations = 3
    store.addDebugMoney(1e30, T0)
    return store
  }

  it('reaching Duke ends the dynasty, recording ranks and PAs, and stops the clock', () => {
    const store = marquess()
    let t = T0
    for (let i = 0; i < 5; i++) store.tick((t += 1000))
    const before = store.dynastyMs
    expect(before).toBeGreaterThan(0)
    expect(store.canElevate).toBe(true)
    expect(store.elevateToLords(t)).toBe(true)
    expect(store.dynastyComplete).toBe(true)
    expect(store.heirChoices).toHaveLength(0)
    const last = store.familyTree[store.familyTree.length - 1]
    expect(last).toMatchObject({ elevated: true, titles: 4 })
    expect(last.becameTitles).toBeGreaterThanOrEqual(5)
    expect(last.pas).toEqual(['Proxy with Power of Attorney, MBE'])
    // The game stops: no income, no time
    const money = store.money
    for (let i = 0; i < 5; i++) store.tick((t += 1000))
    expect(store.money).toBe(money)
    expect(store.dynastyMs).toBe(before)
  })

  it('a new dynasty is filed in the Hall and starts from nothing, keeping achievements and settings', () => {
    const store = marquess()
    store.elevateToLords(T0 + 10)
    const surname = store.familySurname
    expect(store.foundNewDynasty(T0 + 20)).toBe(true)
    expect(store.dynastyComplete).toBe(false)
    expect(store.familySurname).not.toBe(surname)
    expect(store).toMatchObject({ titles: 0, generation: 1, gatesBeaten: 0, legacyPoints: 0, dynastyMs: 0, noTap: true })
    expect(store.familyTree).toEqual([])
    expect(store.paChairs.every((p) => p === null)).toBe(true)
    expect(store.achievements).toEqual(['side-hustle'])
    expect(store.hall).toHaveLength(1)
    expect(store.hall[0]).toMatchObject({ surname })
    expect(parseHall(localStorage.getItem(HALL_KEY))[0].surname).toBe(surname)
    // Only once: the new family hasn't finished anything
    expect(store.foundNewDynasty(T0 + 30)).toBe(false)
  })

  it('an older save already past Duke opens on the finale, with its time made up from the tree', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 8, scene: { titles: 6, familyTree: [person(1), person(2)], activeGenerationMs: 5000 } })
    )
    const loaded = parseSavedState(localStorage.getItem(STORAGE_KEY))
    expect(loaded.dynastyComplete).toBe(true)
    expect(loaded.dynastyMs).toBe(125_000)
  })
})

describe('the finale on screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows everyone in the dynasty, and only offers a new one, after asking', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(T0)
    store.familyTree = [person(1), person(2, { elevated: true, pas: ['Head Butler, MBE'], advisors: ['Estate Manager', 'Sommelier'] }), person(3, { elevated: true })]
    store.dynastyComplete = true
    await wrapper.vm.$nextTick()
    const modal = wrapper.find('[data-testid="dukedom-modal"]')
    expect(modal.attributes('aria-modal')).toBe('true')
    expect(modal.findAll('[data-testid="roll-person"]')).toHaveLength(3)
    expect(modal.text()).toContain('Became Baron')
    expect(modal.text()).toContain('Head Butler, MBE')
    expect(modal.text()).toContain('Sommelier')
    expect(modal.text()).not.toContain('Not yet')
    await modal.find('[data-testid="new-dynasty"]').trigger('click')
    expect(store.hall).toHaveLength(0)
    await wrapper.find('[data-testid="menu-confirm-new-dynasty"]').trigger('click')
    expect(wrapper.find('[data-testid="dukedom-modal"]').exists()).toBe(false)
    expect(store.hall).toHaveLength(1)
    wrapper.unmount()
  })

  it('going back to the main menu from the finale files the dynasty, leaving nothing to continue', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(T0)
    store.familyTree = [person(1)]
    store.dynastyComplete = true
    const duke = store.familySurname
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="dukedom-main-menu"]').trigger('click')
    expect(wrapper.find('[data-testid="dukedom-modal"]').exists()).toBe(false)
    expect(store.hall.map((d) => d.surname)).toEqual([duke])
    expect(store.dynastyComplete).toBe(false)
    // Only a new family to begin, unnamed until it is written in
    const begin = wrapper.find('[data-testid="menu-continue"]')
    expect(begin.text()).toContain('A new family')
    expect(begin.text()).not.toContain('Continue')
    expect(store.census).toBeNull()
    // and the Duke's family is above it in the register when it is
    await begin.trigger('click')
    expect(store.census).toEqual({ previous: duke, departure: 'duke' })
    expect(wrapper.find('[data-testid="census-earlier"]').text()).toContain('Duke')
    wrapper.unmount()
  })
})

describe('the Hall on screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('opens from the family tree and lists each dynasty with its roll, best marked', async () => {
    localStorage.setItem(
      HALL_KEY,
      JSON.stringify([
        { surname: 'Quick', finishedAt: 2, activeMs: 3_600_000, roll: [person(1), person(2, { elevated: true })] },
        { surname: 'Slow', finishedAt: 1, activeMs: 9_000_000, roll: [person(1)] }
      ])
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    store.closeIntro(T0)
    store.familyTreeOpen = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="dynasty-time"]').text()).toContain('Dynasty time so far')
    await wrapper.find('[data-testid="open-hall"]').trigger('click')
    const hall = wrapper.find('[data-testid="hall-modal"]')
    expect(hall.attributes('aria-modal')).toBe('true')
    const entries = hall.findAll('[data-testid="hall-entry"]')
    expect(entries).toHaveLength(2)
    expect(entries[0].text()).toContain('The Quicks')
    expect(entries[0].text()).toContain('Best')
    expect(entries[1].text()).not.toContain('Best')
    expect(entries[0].findAll('[data-testid="roll-person"]')).toHaveLength(2)
    wrapper.unmount()
  })
})
