import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ADVISORS } from '../src/data/advisors'
import { gateThreshold } from '../src/engine/bosses'
import { ALLOWANCE_TAPS_PER_SEC, computeOfflineCatchUp } from '../src/engine/economy'
import { combineModifiers, type Modifiers } from '../src/engine/modifiers'
import { rollAdvisorOffer } from '../src/engine/office'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'
import { formatCurrency } from '../src/utils/format'

const T0 = 1_000_000

function fresh(noTap = true) {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  if (noTap) store.toggleNoTap()
  return store
}

describe('playing without tapping', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('a tapper gets no allowance; the setting turns it on, any time, and off again', () => {
    const store = fresh(false)
    expect(store.noTap).toBe(false)
    expect(store.allowancePerSecond).toBe(0)
    expect(store.manualClick(T0 + 10)).toBeGreaterThan(0)
    store.toggleNoTap()
    expect(store.allowancePerSecond).toBeGreaterThan(0)
    store.toggleNoTap()
    expect(store.allowancePerSecond).toBe(0)
  })

  it('without tapping there is no Get paid: taps earn nothing', () => {
    const store = fresh()
    expect(store.manualClick(T0 + 10)).toBe(0)
    expect(store.money).toBe(0)
  })

  it('Hustle holds steady without tapping, and Grindset Coaching raises it', () => {
    const store = fresh()
    expect(store.hustleMultiplier).toBe(1)
    const before = store.allowancePerSecond
    store.perks.hustleCap = 2
    expect(store.hustleMultiplier).toBe(2)
    expect(store.allowancePerSecond).toBeCloseTo(before * 2)
  })

  it('Jobs show what they add to the allowance a second, and the text talks about the allowance', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = fresh()
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    store.jobsPurchased = { '1': 10 }
    await wrapper.vm.$nextTick()
    const card = wrapper.find('[data-item-key="jobs-1"]').text()
    expect(card).not.toContain('/click')
    // The rider's stack is the whole allowance, bar the £1 everyone gets
    expect(card).toContain(`${formatCurrency(store.allowancePerSecond - store.allowanceTapRate)} total`)
    expect(card).toContain("/s each")
    expect(store.wording('Clicks pay double.')).toBe('Your allowance pays double.')
    store.toggleNoTap()
    expect(store.wording('Clicks pay double.')).toBe('Clicks pay double.')
    wrapper.unmount()
  })

  it('the setting survives a reload', () => {
    const store = fresh()
    store.flushSave(T0 + 5)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 5)
    expect(again.noTap).toBe(true)
  })

  it('the headhunter only brings allowance advisors to a family that plays without tapping', () => {
    const offers = (noTap: boolean) => {
      const ids = new Set<string>()
      for (let i = 0; i < 400; i++) for (const id of rollAdvisorOffer(Math.random, noTap)) ids.add(id)
      return [...ids].map((id) => ADVISORS.find((a) => a.id === id)!.family)
    }
    expect(offers(false)).not.toContain('allowance')
    expect(offers(true)).toContain('allowance')
  })

  it('the founder earns Universal Credit with no taps at all', () => {
    const store = fresh()
    expect(store.allowanceLabel).toBe('Universal Credit')
    expect(store.allowancePerSecond).toBeCloseTo(ALLOWANCE_TAPS_PER_SEC * store.moneyPerClick)
    for (let s = 1; s <= 60; s++) {
      store.tick(T0 + s * 1000)
      // A Market Wire scandal left to run would dock income: keep the wire
      // clear so this measures the allowance alone
      store.activeEvent = null
    }
    expect(store.money).toBeGreaterThan(0)
    expect(store.money).toBeCloseTo(store.allowancePerSecond * 60, 0)
  })

  it('heirs get an allowance from Granny instead', () => {
    const store = fresh()
    store.heir = { name: 'Test Heir', traitId: 'black-sheep', inheritId: 'old-money' }
    expect(store.allowanceLabel).toBe('Allowance from Granny')
  })

  it('the allowance counts towards the Walkout at gate 1 without Hustle', () => {
    const store = fresh()
    store.addDebugMoney(gateThreshold(1) * 1.1, T0)
    store.tick(T0)
    expect(store.startBossAttempt()).toBe(true)
    store.tick(T0 + 1000)
    expect(store.hustleMultiplier).toBe(1)
    expect(store.bossAttempt!.clickEarningsAtFullHustle).toBeGreaterThan(0)
  })

  it('the allowance polishes silver at gate 6', () => {
    const store = fresh()
    store.gatesBeaten = 5
    store.addDebugMoney(gateThreshold(6) * 1.1, T0)
    store.tick(T0)
    expect(store.startBossAttempt()).toBe(true)
    store.tick(T0 + 1000)
    expect(store.bossAttempt!.polish).toBeGreaterThan(0)
  })

  it('allowance advisors add taps, and offline advisors raise the away rate', () => {
    const m = combineModifiers([{ allowanceTapsAdd: 5 }, { offlineEfficiencyAdd: 0.25 }])
    expect(m.allowanceTapsAdd).toBe(5)
    expect(computeOfflineCatchUp(120_000, 10, 0, m.offlineEfficiencyAdd)?.efficiency).toBeCloseTo(0.75)
    expect(computeOfflineCatchUp(120_000, 10, 5, 0.5)?.efficiency).toBe(1)
  })
})

describe('advisor tiers', () => {
  // How much better than neutral an advisor's main effect is: bigger is better
  const strength = (m: Modifiers): number =>
    Math.abs(Math.log(m.clickMult)) +
    Math.abs(Math.log(m.businessMult)) +
    Math.abs(Math.log(m.purchaseCostMult)) +
    Math.abs(Math.log(m.eventIntervalMult)) +
    Math.abs(Math.log(m.bossTimeMult)) +
    Math.abs(Math.log(m.twistStrength)) +
    Math.abs(Math.log(m.scandalSeverity)) +
    Math.abs(Math.log(m.windfallMult)) +
    Object.values(m.sectorBusinessMult).reduce((a, v) => a + Math.abs(Math.log(v ?? 1)), 0) +
    m.automationShareBonus * 10 +
    m.trustFundShareAdd * 10 +
    m.milestoneStepBonus +
    m.allowanceTapsAdd / 10 +
    m.offlineEfficiencyAdd

  it('within each family the buff grows from common to rare to legendary', () => {
    const families = new Set(ADVISORS.map((a) => a.family))
    for (const f of families) {
      const tier = (r: string) => ADVISORS.find((a) => a.family === f && a.rarity === r)!
      const [c, r, l] = ['common', 'rare', 'legendary'].map(tier)
      const score = (a: (typeof ADVISORS)[number]) =>
        a.roleBonus ? a.roleBonus.incomePerAdvisor : a.campaign ? Infinity : strength(combineModifiers([a.mods]))
      expect(score(r), `${f}: rare beats common`).toBeGreaterThan(score(c))
      expect(score(l), `${f}: legendary beats rare`).toBeGreaterThan(score(r))
    }
  })
})
