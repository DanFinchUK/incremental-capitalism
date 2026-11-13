import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { combineModifiers } from '../src/engine/modifiers'
import { officeModifierSources } from '../src/engine/office'
import { gateThreshold } from '../src/engine/bosses'
import { MARKET_EVENTS } from '../src/data/events'
import { HEIR_TRAITS } from '../src/data/heirs'
import { ADVISORS } from '../src/data/advisors'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000
const inst = (advisorId: string, servedGenerations = 0, campaignMs = 0, uid = advisorId) => ({ uid, advisorId, servedGenerations, campaignMs })

function fresh() {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  return store
}

describe('review fixes', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('PA seniority never pushes a "lower is better" multiplier to zero or below', () => {
    for (const id of ['lobbyist', 'spin-doctor', 'personal-shopper']) {
      const pa = inst(id, 40)
      const m = combineModifiers(officeModifierSources([pa], pa.uid))
      expect(m.twistStrength).toBeGreaterThan(0)
      expect(m.eventIntervalMult).toBeGreaterThan(0)
      expect(m.purchaseCostMult).toBeGreaterThan(0)
    }
  })

  it('nothing scales boss targets', () => {
    for (const src of [...HEIR_TRAITS.map((t) => t.mods), ...ADVISORS.map((a) => a.mods)]) {
      expect('bossTargetMult' in src).toBe(false)
    }
    const store = fresh()
    store.heir = { name: 'Hugo Test', traitId: 'old-etonian' }
    expect(store.bossTarget(3)).toBeCloseTo(gateThreshold(3) * 1.5)
  })

  it('a fight keeps the time limit it started with', () => {
    const store = fresh()
    store.addDebugMoney(gateThreshold(1) * 2, T0)
    store.startBossAttempt()
    expect(store.nextBoss!.remainingSec).toBe(180)
    store.heir = { name: 'Clemmie Test', traitId: 'gap-year' }
    expect(store.nextBoss!.remainingSec).toBe(180)
  })

  it('items keep their buy button while automation is paused by a boss or frozen', () => {
    const store = fresh()
    store.tick(T0)
    store.money = 10_000_000
    expect(store.isAutomated('jobs', '1')).toBe(true)
    store.spawnSpecificEvent('shadyDeal', T0)
    store.claimMarketEvent(T0, () => 0.9) // loses: automation frozen
    expect(store.isAutomated('jobs', '1')).toBe(false)
  })

  it('the game waits while the heir draft is open, and the trust fund multiplier hits the whole inheritance', () => {
    const store = fresh()
    store.toggleAutoBuyPaused() // ensure cash isn't spent before we look
    store.toggleAutoBuyPaused()
    store.addDebugMoney(1e9, T0)
    store.gatesBeaten = 1
    store.retire(T0)
    const fund = store.money
    const clock = store.activeGenerationMs
    store.tick(T0 + 1000)
    store.tick(T0 + 2000)
    expect(store.activeGenerationMs).toBe(clock)
    expect(store.money).toBe(fund)
    expect(store.startBossAttempt()).toBe(false)
    expect(store.retire(T0 + 3000)).toBe(false)
    store.heirChoices = [{ name: 'Tarquin Test', traitId: 'nepo-baby' }]
    store.pickHeir(0)
    expect(store.money).toBeCloseTo(fund * 3)
  })

  it('ignoring a scandal is not free', () => {
    for (const e of MARKET_EVENTS) {
      if (e.effect.type === 'scandal') expect(e.effect.ignored.length).toBeGreaterThan(0)
    }
    const store = fresh()
    store.money = 1_000_000
    store.spawnSpecificEvent('nonDomQuestioned', T0)
    store.tick(T0 + 13_000)
    expect(store.activeEvent).toBeNull()
    expect(store.money).toBeLessThan(1_000_000)
  })

  it('scandal penalties clear with a new generation and a stronger one is kept', () => {
    const store = fresh()
    store.spawnSpecificEvent('leakedWhatsApps', T0)
    store.claimMarketEvent(T0, () => 0.9, 1)
    expect(store.incomePenalty?.mult).toBe(0.5)
    store.addDebugMoney(1e9, T0)
    store.gatesBeaten = 1
    store.retire(T0)
    expect(store.incomePenalty).toBeNull()
  })

  it('shows the Legacy multiplier after traits and titles', () => {
    const store = fresh()
    store.legacyPoints = 20
    expect(store.legacyMultiplier).toBeCloseTo(2)
    store.heir = { name: 'Red Test', traitId: 'reformed-socialist' }
    expect(store.legacyMultiplier).toBeCloseTo(1.5)
  })

  it('duplicate campaigners reach the cap sooner but share it', () => {
    const m = combineModifiers(officeModifierSources([inst('flour-campaigner', 0, 600 * 60_000, 'a'), inst('flour-campaigner', 0, 600 * 60_000, 'b')], null))
    expect(m.sectorCostMult.food).toBeCloseTo(0.5)
    expect(m.sectorBusinessMult.food).toBeCloseTo(2.5)
    const early = combineModifiers(officeModifierSources([inst('flour-campaigner', 0, 10 * 60_000, 'a'), inst('flour-campaigner', 0, 10 * 60_000, 'b')], null))
    expect(early.sectorCostMult.food).toBeCloseTo(0.8)
  })

  it('the Champagne flood pours opportunities, not scandals', () => {
    const store = fresh()
    store.gatesBeaten = 4
    store.addDebugMoney(gateThreshold(5) * 1.01, T0)
    store.startBossAttempt()
    let t = T0
    for (let i = 0; i < 40; i++) {
      store.tick((t += 7000))
      if (store.activeEvent) {
        expect(store.activeEvent.def.effect.type).not.toBe('scandal')
        store.activeEvent = null
      }
      if (!store.bossAttempt) break
    }
  })
})
