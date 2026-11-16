import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HEIR_TRAITS, INHERITED_TRAITS, rollHeirChoices } from '../src/data/heirs'
import { combineModifiers } from '../src/engine/modifiers'
import { gateThreshold } from '../src/engine/bosses'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

function retiredStore() {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  store.addDebugMoney(1e9, T0)
  store.gatesBeaten = 1
  store.retire(T0)
  return store
}

describe('heir traits data', () => {
  it('offers trade-offs at every rarity', () => {
    for (const rarity of ['common', 'rare', 'legendary'] as const) {
      expect(HEIR_TRAITS.some((t) => t.rarity === rarity)).toBe(true)
    }
    expect(HEIR_TRAITS.length).toBeGreaterThanOrEqual(12)
    for (const t of HEIR_TRAITS) expect(t.description.length).toBeGreaterThan(20)
  })

  it('rolls three different traits and heirs who share the family name', () => {
    const choices = rollHeirChoices(seq([0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4]), 'Fitzwilliam-Hobbs', [])
    expect(choices).toHaveLength(3)
    expect(new Set(choices.map((c) => c.traitId)).size).toBe(3)
    for (const c of choices) expect(c.name).toContain('Fitzwilliam-Hobbs')
  })
})

describe('inherited traits', () => {
  it('each heir passes down a different trait', () => {
    const choices = rollHeirChoices(seq([0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4]), 'Fitzwilliam-Hobbs', [])
    for (const c of choices) expect(INHERITED_TRAITS.some((t) => t.id === c.inheritId)).toBe(true)
    expect(new Set(choices.map((c) => c.inheritId)).size).toBe(choices.length)
  })

  it('stay mild: nine copies of any one never cut income or raise costs much', () => {
    for (const t of INHERITED_TRAITS) {
      const m = combineModifiers(Array.from({ length: 9 }, () => t.mods))
      expect(m.legacyScale).toBe(1)
      expect(m.clickMult).toBeGreaterThan(0.35)
      expect(m.businessMult).toBeGreaterThan(0.6)
      expect(m.purchaseCostMult).toBeLessThanOrEqual(1)
      expect(m.incomeDrain).toBeLessThan(0.1)
      expect(m.internsDisabled).toBeFalsy()
    }
  })
})

describe('heirs in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('starts with a founder who has a name and no trait', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    expect(store.familySurname.length).toBeGreaterThan(3)
    expect(store.heir.name).toContain(store.familySurname)
    expect(store.heir.traitId).toBeNull()
    expect(store.generation).toBe(1)
  })

  it('drafts three heirs on retirement and takes the one you pick', () => {
    const store = retiredStore()
    expect(store.heirChoices).toHaveLength(3)
    const pick = store.heirChoices[1]
    store.pickHeir(1)
    expect(store.heir).toEqual(pick)
    expect(store.heirChoices).toHaveLength(0)
    expect(store.generation).toBe(2)
  })

  it('applies a trait to the economy: Black Sheep doubles businesses and halves clicks', () => {
    const store = retiredStore()
    store.heirChoices = [{ name: 'Rupert Test', traitId: 'black-sheep' }]
    // No Interns, whose clicks would count as passive income
    store.perks.autoClicker = 0
    store.gatesBeaten = 9
    store.businessesOwned = { '1': 10 }
    store.jobsPurchased = { '1': 10 }
    // Business income is passive income less the allowance
    const biz = store.moneyPerSecond - store.allowancePerSecond
    const click = store.baseMoneyPerClick
    store.pickHeir(0)
    expect(store.moneyPerSecond - store.allowancePerSecond).toBeCloseTo(biz * 2)
    expect(store.baseMoneyPerClick).toBeCloseTo(click * 0.5)
  })

  it('Nepo Baby triples the trust fund and benches the Interns', () => {
    const store = retiredStore()
    store.perks.autoClicker = 3
    const fund = store.money
    store.heirChoices = [{ name: 'Tarquin Test', traitId: 'nepo-baby' }]
    store.pickHeir(0)
    expect(store.money).toBeCloseTo(fund * 3)
    expect(store.autoClickers).toBe(0)
  })

  it('Gap Year Philanthropist gets longer boss fights; Tax Exile faces weaker twists', () => {
    const store = retiredStore()
    store.heirChoices = [{ name: 'Clemmie Test', traitId: 'gap-year' }]
    store.pickHeir(0)
    store.addDebugMoney(gateThreshold(1) * 2)
    store.startBossAttempt()
    expect(store.nextBoss!.remainingSec).toBe(270)
    store.abandonBossAttempt()
    store.heir = { name: 'Monty Test', traitId: 'tax-exile' }
    store.startBossAttempt()
    expect(store.twist.clickPayMult).toBeCloseTo(0.75) // Walkout's 0.5 at half strength
  })

  it('Old Etonian softens boss twists instead of moving targets', () => {
    const store = retiredStore()
    store.heir = { name: 'Hugo Test', traitId: 'old-etonian' }
    expect(store.modifiers.twistStrength).toBeCloseTo(0.6)
    expect(store.bossTarget(3)).toBeCloseTo(gateThreshold(3) * 0.5)
  })

  it('keeps the family, heir and pending choices through a reload', () => {
    const store = retiredStore()
    const choices = [...store.heirChoices]
    const surname = store.familySurname
    store.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 20)
    expect(again.familySurname).toBe(surname)
    expect(again.heirChoices).toEqual(choices)
    expect(again.generation).toBe(1)
  })

  it("an heir's own trait leaves with them; what they pass down stays until elevation", () => {
    const store = retiredStore()
    // Achievements add a little of their own; measure against that
    const base = { click: store.modifiers.clickMult, biz: store.modifiers.businessMult }
    store.heirChoices = [{ name: 'Red Test', traitId: 'reformed-socialist', inheritId: 'old-money' }]
    store.pickHeir(0)
    expect(store.modifiers.clickMult / base.click).toBeCloseTo(5)
    expect(store.modifiers.businessMult / base.biz).toBeCloseTo(0.5 * 1.1)

    store.gatesBeaten = 2
    expect(store.retire(T0 + 1000)).toBe(true)
    store.heirChoices = [{ name: 'Blue Test', traitId: 'tax-exile', inheritId: 'old-money' }]
    store.pickHeir(0)
    // Reformed Socialist is gone; both Old Moneys stack
    expect(store.modifiers.clickMult / base.click).toBeCloseTo(1)
    expect(store.modifiers.businessMult / base.biz).toBeCloseTo(1.21)
    expect(store.familyTree.at(-1)?.inheritId).toBe('old-money')
  })
})

describe('saves from before traits were split', () => {
  it("ancestors' old traits stop stacking; the current head keeps theirs", async () => {
    const { readGenerationRecord, bloodlineTraitSources } = await import('../src/engine/family')
    const old = readGenerationRecord({ generation: 1, name: 'Old Test', traitId: 'reformed-socialist', deepestGate: 3, legacyEarned: 3, activeMs: 1, advisors: [], splits: [] })
    expect(old?.inheritId).toBeNull()
    const m = combineModifiers(bloodlineTraitSources([old!], { name: 'Now Test', traitId: 'black-sheep' }))
    expect(m.legacyScale).toBe(1)
    expect(m.businessMult).toBeCloseTo(2)
  })
})

describe('the heir picker', () => {
  it("shows each heir's combined effect: Reformed Socialist with Silver Tongue", async () => {
    const { describeHeirEffect } = await import('../src/engine/family')
    const labels = describeHeirEffect({ name: 'Red Test', traitId: 'reformed-socialist', inheritId: 'silver-tongue' }).map((p) => p.label)
    expect(labels).toContain('Clicks x5.75')
    expect(labels).toContain('Businesses x0.5')
  })
})

describe('abdication', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function withHeir() {
    const store = retiredStore()
    store.heirChoices = [{ name: 'Red Test', traitId: 'reformed-socialist', inheritId: 'old-money' }]
    store.pickHeir(0)
    store.businessesOwned = { '1': 5 }
    store.gatesBeaten = 1
    return store
  }

  it('the founder has nobody to abdicate to', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    expect(store.canAbdicate).toBe(false)
    expect(store.offerAbdication()).toBe(false)
  })

  it("siblings never share the outgoing head's first name", () => {
    for (let i = 0; i < 30; i++) {
      localStorage.clear()
      setActivePinia(createPinia())
      const store = withHeir()
      store.heir = { ...store.heir, name: `Ottoline ${store.familySurname}` }
      store.offerAbdication()
      for (const s of store.siblingChoices) expect(s.name.split(' ')[0]).not.toBe('Ottoline')
    }
  })

  it('offers two common siblings, and backing out changes nothing', () => {
    const store = withHeir()
    expect(store.offerAbdication()).toBe(true)
    expect(store.siblingChoices).toHaveLength(2)
    for (const s of store.siblingChoices) expect(HEIR_TRAITS.find((t) => t.id === s.traitId)?.rarity).toBe('common')
    store.cancelAbdication()
    expect(store.siblingChoices).toHaveLength(0)
    expect(store.heir.traitId).toBe('reformed-socialist')
    expect(store.canAbdicate).toBe(true)
  })

  it('swaps both traits mid-generation, keeps the estate, and only once a generation', () => {
    const store = withHeir()
    const generation = store.generation
    const legacy = store.legacyPoints
    const owned = { ...store.businessesOwned }
    store.offerAbdication()
    const sibling = store.siblingChoices[0]
    store.pickSibling(0)
    expect(store.heir).toEqual(sibling)
    expect(store.modifiers.clickMult).not.toBeCloseTo(5)
    expect(store.generation).toBe(generation)
    expect(store.legacyPoints).toBe(legacy)
    expect(store.gatesBeaten).toBe(1)
    expect(store.businessesOwned).toEqual(owned)
    expect(store.canAbdicate).toBe(false)
    expect(store.offerAbdication()).toBe(false)
  })

  it('the abdication screen speaks of as many siblings as it shows', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { global: { plugins: [pinia] } })
    const store = withHeir()
    store.offerAbdication()
    await wrapper.vm.$nextTick()
    const modal = wrapper.find('[data-testid="abdication"]')
    expect(modal.findAll('[data-testid="sibling-option"]')).toHaveLength(2)
    expect(modal.text()).toContain('Two younger siblings')
    expect(modal.text()).not.toContain('only ever one')
    wrapper.unmount()
  })

  it('a new generation can abdicate again, and the limit survives a reload', () => {
    const store = withHeir()
    store.offerAbdication()
    store.pickSibling(0)
    store.flushSave(T0 + 10)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 10)
    expect(again.abdicated).toBe(true)
    expect(again.canAbdicate).toBe(false)
    again.gatesBeaten = 2
    expect(again.retire(T0 + 20)).toBe(true)
    again.pickHeir(0)
    expect(again.canAbdicate).toBe(true)
  })
})
