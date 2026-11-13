import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ADVISORS, ADVISORS_BY_ID } from '../src/data/advisors'
import { combineModifiers } from '../src/engine/modifiers'
import { officeModifierSources, rollAdvisorOffer, type AdvisorInstance } from '../src/engine/office'
import { gateThreshold } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000
const inst = (advisorId: string, servedGenerations = 0, campaignMs = 0): AdvisorInstance => ({
  uid: `${advisorId}-${servedGenerations}-${campaignMs}`,
  advisorId,
  servedGenerations,
  campaignMs
})

describe('advisor data', () => {
  it('has 20 advisors across all rarities, each with an effect and a cost line', () => {
    expect(ADVISORS).toHaveLength(20)
    for (const r of ['common', 'rare', 'legendary'] as const) expect(ADVISORS.some((a) => a.rarity === r)).toBe(true)
    for (const a of ADVISORS) {
      expect(a.effectText.length).toBeGreaterThan(10)
      expect(a.costText.length).toBeGreaterThan(5)
    }
  })

  it('rolls an offer of three different advisors', () => {
    let i = 0
    const rng = () => [0.1, 0.3, 0.65, 0.2, 0.95, 0.5, 0.05, 0.7][i++ % 8]
    const offer = rollAdvisorOffer(rng)
    expect(offer).toHaveLength(3)
    expect(new Set(offer).size).toBe(3)
    for (const id of offer) expect(ADVISORS_BY_ID[id]).toBeDefined()
  })
})

describe('office modifiers', () => {
  it('stacks duplicates: effects and upkeep both multiply up', () => {
    const m = combineModifiers(officeModifierSources([inst('property-guy'), inst('property-guy')], null))
    expect(m.sectorBusinessMult.property).toBeCloseTo(4)
    expect(m.incomeDrain).toBeCloseTo(0.02)
  })

  it('a long-serving PA is stronger and better paid', () => {
    const pa = inst('productivity-guru', 2)
    const m = combineModifiers(officeModifierSources([pa], pa.uid))
    // Seniority: +25% of the effect per generation; payrise: +20% upkeep per generation
    expect(m.clickMult).toBeCloseTo(1 + 0.5 * 1.5)
    expect(m.incomeDrain).toBeCloseTo(0.01 * 1.4)
    // Not the PA: no seniority even if they had served
    const plain = combineModifiers(officeModifierSources([pa], null))
    expect(plain.clickMult).toBeCloseTo(1.5)
  })

  it('Head of Finance pays out per Finance advisor', () => {
    const m = combineModifiers(officeModifierSources([inst('head-of-finance'), inst('accountant'), inst('stockbroker')], null))
    expect(m.businessMult).toBeCloseTo(1.3)
    expect(m.clickMult).toBeCloseTo(1.3)
  })

  it('campaigns build with minutes in office and stop at their cap', () => {
    const early = combineModifiers(officeModifierSources([inst('flour-campaigner', 0, 10 * 60_000)], null))
    expect(early.sectorCostMult.food).toBeCloseTo(0.9)
    expect(early.sectorBusinessMult.food).toBeCloseTo(1.3)
    const capped = combineModifiers(officeModifierSources([inst('flour-campaigner', 0, 600 * 60_000)], null))
    expect(capped.sectorCostMult.food).toBeCloseTo(0.5)
    expect(capped.sectorBusinessMult.food).toBeCloseTo(2.5)
  })
})

describe('the family office in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function winGate1() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.addDebugMoney(gateThreshold(1) * 10, T0)
    store.tick(T0)
    store.startBossAttempt()
    store.bossAttempt!.clickEarningsAtFullHustle = 1e300
    store.tick(T0 + 1000)
    return store
  }

  it('a boss win brings the headhunter with three candidates', () => {
    const store = winGate1()
    expect(store.gatesBeaten).toBe(1)
    expect(store.headhunterOffer).toHaveLength(3)
  })

  it('hiring pays the fee from cash, fills a seat and applies the effect', () => {
    const store = winGate1()
    store.headhunterOffer = ['sommelier', 'accountant', 'lobbyist']
    const cash = store.money
    expect(store.hireAdvisor(0)).toBe(true)
    expect(store.money).toBeCloseTo(cash * 0.95)
    expect(store.officeSeats.filter(Boolean)).toHaveLength(1)
    expect(store.modifiers.sectorBusinessMult.food).toBeCloseTo(2)
    expect(store.headhunterOffer).toHaveLength(0)
  })

  it('a full office needs a seat freed or a replacement named', () => {
    const store = winGate1()
    for (let i = 0; i < 3; i++) {
      store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
      expect(store.hireAdvisor(0)).toBe(true)
    }
    store.headhunterOffer = ['lobbyist', 'sommelier', 'accountant']
    expect(store.hireAdvisor(0)).toBe(false)
    expect(store.hireAdvisor(0, 1)).toBe(true)
    expect(store.officeSeats[1]?.advisorId).toBe('lobbyist')
    store.fireAdvisor(1)
    expect(store.officeSeats[1]).toBeNull()
  })

  it('the PA stays through retirement with a payrise; the rest leave', () => {
    const store = winGate1()
    store.headhunterOffer = ['productivity-guru', 'accountant', 'lobbyist']
    store.hireAdvisor(0)
    store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
    store.hireAdvisor(0)
    store.promoteToPA(0)
    expect(store.paChair?.advisorId).toBe('productivity-guru')
    store.retire(T0 + 2000)
    store.pickHeir(0)
    expect(store.officeSeats.every((s) => s === null)).toBe(true)
    expect(store.paChair?.servedGenerations).toBe(1)
  })

  it('the Family Office Extension perk adds seats', () => {
    const store = winGate1()
    expect(store.officeSeats).toHaveLength(3)
    store.perks.officeSeats = 2
    expect(store.officeSeats).toHaveLength(5)
  })

  it('remembers the office through a reload', () => {
    const store = winGate1()
    store.headhunterOffer = ['stockbroker', 'accountant', 'lobbyist']
    store.hireAdvisor(0)
    store.promoteToPA(0)
    store.flushSave(T0 + 3000)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 3000)
    expect(again.paChair?.advisorId).toBe('stockbroker')
  })
})
