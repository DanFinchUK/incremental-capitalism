import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ClassModal from '../src/components/ClassModal.vue'
import { BOSSES } from '../src/data/bosses'
import { SOCIAL_CLASSES } from '../src/data/classes'
import { gateThreshold } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

// Wins gate 1 the way a player would: unlock it, start the fight, tap
function winGate1(store: ReturnType<typeof useGameStore>, t: number): number {
  store.addDebugMoney(gateThreshold(1) * 1.1, t)
  store.jobsPurchased['21'] = 3
  store.tick(t)
  store.startBossAttempt()
  for (let i = 0; i < 60; i++) store.manualClick(t + 10 + i * 20)
  store.tick(t + 1500)
  return t + 2000
}

describe('beating a boss', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function fresh() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    return store
  }

  it('every boss has a story beat for its victory', () => {
    for (const boss of BOSSES) expect(boss.victoryText.length, boss.id).toBeGreaterThan(40)
  })

  it('records the victory and opens the celebration the first time', () => {
    const store = fresh()
    winGate1(store, T0)
    expect(store.gatesBeaten).toBe(1)
    expect(store.lastVictory).toMatchObject({ gate: 1, firstTime: true })
    expect(store.classModalOpen).toBe(true)
  })

  it('leads the celebration with the win and the story, with the pyramid folded away', async () => {
    const store = fresh()
    winGate1(store, T0)
    const wrapper = mount(ClassModal, { global: { plugins: [pinia] } })
    const text = wrapper.text()
    const boss = BOSSES.find((b) => b.gate === 1)!
    expect(wrapper.find('h2').text()).toContain(boss.title)
    expect(text).toContain(boss.victoryText)
    expect(text.indexOf(boss.victoryText)).toBeLessThan(text.indexOf('Class pyramid'))
    expect(wrapper.find('[data-testid="victory-unlocks"]').text()).toMatch(/new (jobs|businesses)/i)
    const pyramid = wrapper.find('details[data-testid="class-pyramid"]')
    expect(pyramid.exists()).toBe(true)
    expect(pyramid.attributes('open')).toBeUndefined()
  })

  it('keeps the new class to one line: its name and perks, with the welcome pack left to the pyramid', () => {
    const store = fresh()
    winGate1(store, T0)
    const wrapper = mount(ClassModal, { global: { plugins: [pinia] } })
    const callout = wrapper.find('[data-testid="victory-class"]')
    expect(callout.text()).toContain(SOCIAL_CLASSES[1].label)
    expect(callout.text()).toContain(SOCIAL_CLASSES[1].perkSummary)
    expect(callout.text()).not.toContain(SOCIAL_CLASSES[1].initiationNote)
  })

  it('opening the pyramid from the class card shows it in full, with no victory', () => {
    const store = fresh()
    store.openClassPyramid()
    const wrapper = mount(ClassModal, { global: { plugins: [pinia] } })
    expect(wrapper.find('[data-testid="victory-unlocks"]').exists()).toBe(false)
    expect(wrapper.find('details[data-testid="class-pyramid"]').attributes('open')).toBeDefined()
  })

  it('a repeat win in a later generation gets a banner with the time, not the full screen', () => {
    const store = fresh()
    let t = winGate1(store, T0)
    store.hireAdvisor(0)
    store.closeClassModal()
    store.retire(t)
    store.pickHeir(0)
    t = winGate1(store, t + 1000)
    expect(store.classModalOpen).toBe(false)
    expect(store.lastVictory).toMatchObject({ gate: 1, firstTime: false })
    expect(store.bannerMessage).toMatch(/Zero-Hours Walkout beaten in/)
  })
})
