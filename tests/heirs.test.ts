import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HEIR_TRAITS, TRAITS_BY_ID, rollHeirChoices } from '../src/data/heirs'
import { gateThreshold } from '../src/engine/bosses'
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
    store.gatesBeaten = 9
    store.businessesOwned = { '1': 10 }
    store.jobsPurchased = { '1': 10 }
    const biz = store.moneyPerSecond
    const click = store.baseMoneyPerClick
    store.pickHeir(0)
    expect(store.moneyPerSecond).toBeCloseTo(biz * 2)
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

  it('Old Etonian lowers boss targets', () => {
    const store = retiredStore()
    store.heir = { name: 'Hugo Test', traitId: 'old-etonian' }
    expect(TRAITS_BY_ID['old-etonian'].mods.bossTargetMult).toBeLessThan(1)
    expect(store.bossTarget(3)).toBeCloseTo(gateThreshold(3) * 1.5 * TRAITS_BY_ID['old-etonian'].mods.bossTargetMult!)
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
})
