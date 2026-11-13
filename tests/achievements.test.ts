import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { ACHIEVEMENTS, ACHIEVEMENT_INCOME_BONUS } from '../src/data/achievements'
import { gateThreshold } from '../src/engine/bosses'
import { JOBS } from '../src/data/items'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

function fresh() {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  store.toggleAutoBuyPaused()
  return store
}

function forceWin(store: ReturnType<typeof useGameStore>, t: number) {
  store.addDebugMoney(gateThreshold(store.gatesBeaten + 1) * 10, t)
  store.startBossAttempt()
  const a = store.bossAttempt!
  a.clickEarningsAtFullHustle = 1e300
  a.earnedAfterTax = 1e300
  a.polish = 1e300
  store.tick(t + 1000)
}

describe('achievements', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('has 17 achievements, 3 of them hidden, worth 2% each', () => {
    expect(ACHIEVEMENTS).toHaveLength(17)
    expect(ACHIEVEMENTS.filter((a) => a.hidden)).toHaveLength(3)
    expect(ACHIEVEMENT_INCOME_BONUS).toBe(0.02)
  })

  it('unlocks from game state: first Job, net worth, every Job at once', () => {
    const store = fresh()
    store.money = 100
    store.buyItem('jobs', '1', 1)
    store.tick(T0 + 1000)
    expect(store.achievements).toContain('side-hustle')
    store.gatesBeaten = 9
    store.addDebugMoney(2e9, T0 + 1000)
    for (const j of JOBS) store.jobsPurchased[j.id] = 1
    store.tick(T0 + 2000)
    expect(store.achievements).toEqual(expect.arrayContaining(['comfortably-off', 'billionaire', 'portfolio-career']))
  })

  it('pays 2% more income per achievement', () => {
    const store = fresh()
    store.gatesBeaten = 9
    store.businessesOwned = { '1': 5 }
    const base = store.moneyPerSecond
    store.achievements = ['side-hustle', 'billionaire']
    expect(store.moneyPerSecond).toBeCloseTo(base * 1.04)
  })

  it('unlocks from boss wins: the Walkout, a quick kill, and Golf under par', () => {
    const store = fresh()
    store.tick(T0)
    forceWin(store, T0)
    expect(store.achievements).toEqual(expect.arrayContaining(['solidarity', 'no-sweat']))
    store.gatesBeaten = 3
    store.addDebugMoney(gateThreshold(4) * 10, T0 + 2000)
    store.startBossAttempt()
    for (let i = 0; i < 4; i++) store.buyItem('jobs', '1', 1)
    store.tick(T0 + 3000)
    expect(store.gatesBeaten).toBe(4)
    expect(store.achievements).toContain('under-par')
  })

  it('unlocks early retirement and lucky streaks', () => {
    const store = fresh()
    store.gatesBeaten = 2
    store.addDebugMoney(1e9, T0)
    store.retire(T0)
    expect(store.achievements).toContain('early-retirement')
    store.pickHeir(0)
    for (let i = 0; i < 3; i++) {
      store.spawnSpecificEvent('bankHolidayBailout', T0 + i)
      store.claimMarketEvent(T0 + i)
    }
    expect(store.achievements).toContain('lucky-streak')
  })

  it('remembers achievements through a reload', () => {
    const store = fresh()
    store.achievements = ['side-hustle']
    store.flushSave(T0)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0)
    expect(again.achievements).toEqual(['side-hustle'])
  })

  it('lists achievements with hidden ones as ??? until earned', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro()
    store.achievements = ['side-hustle']
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="open-achievements"]').trigger('click')
    const modal = wrapper.find('[data-testid="achievements"]')
    expect(modal.text()).toContain('Side Hustle')
    expect(modal.text()).toContain('???')
    expect(modal.text()).toContain('1 / 17')
    wrapper.unmount()
  })
})
