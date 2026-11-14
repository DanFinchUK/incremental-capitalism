import { describe, expect, it } from 'vitest'
import { GATE_NET_WORTH, SOCIAL_CLASSES } from '../src/data/classes'
import { BUSINESSES_BY_ID, JOBS_BY_ID } from '../src/data/items'
import {
  BASE_CLICK_VALUE,
  LEGACY_INCOME_PER_POINT,
  bulkBuyQuote,
  heirInheritance,
  computeClickIncome,
  legacyMultiplier,
  computeOfflineCatchUp,
  computePassivePerSecond,
  itemMilestones,
  milestoneMultiplier,
  milestoneProgress,
  quoteIncomeDelta,
  seriesCost,
  classInfoForLevel,
  maxHustleMultiplier
} from '../src/engine/economy'

describe('economy engine', () => {
  it('tapers 7 milestone pips across 4 scaleFactor bands and scales deregulation', () => {
    expect(itemMilestones(1.2)).toEqual([10, 25, 50, 100, 200, 500, 1000])
    expect(itemMilestones(1.42)).toEqual([10, 20, 40, 75, 125, 300, 600])
    expect(itemMilestones(1.65)).toEqual([5, 10, 25, 50, 75, 200, 400])
    expect(itemMilestones(1.98)).toEqual([3, 5, 10, 20, 35, 100, 200])

    expect(milestoneMultiplier(0, 1.2, 0)).toBe(1)
    expect(milestoneMultiplier(9, 1.2, 0)).toBe(1)
    expect(milestoneMultiplier(10, 1.2, 0)).toBe(2)
    expect(milestoneMultiplier(200, 1.2, 0)).toBe(32)
    expect(milestoneMultiplier(1000, 1.2, 0)).toBe(128)
    expect(milestoneMultiplier(3, 1.98, 0)).toBe(2)
    expect(milestoneMultiplier(5, 1.98, 4)).toBe(9)

    const prog = milestoneProgress(17, 1.2)
    expect(prog.reachedCount).toBe(1)
    expect(prog.prevMilestone).toBe(10)
    expect(prog.nextMilestone).toBe(25)
    expect(prog.progress).toBeCloseTo((17 - 10) / (25 - 10), 5)

    const eliteProg = milestoneProgress(3, 1.98)
    expect(eliteProg.reachedCount).toBe(1)
    expect(eliteProg.nextMilestone).toBe(5)
  })

  it('calculates exact geometric bulk-buy quotes including per-item tapered next milestones', () => {
    const one = bulkBuyQuote(20_000, 1.2, 0, 1, 1, 50_000)
    expect(one).toEqual({ count: 1, cost: 20_000, canAfford: true })

    const nextGentle = bulkBuyQuote(20_000, 1.2, 7, 1, 'next', 1_000_000)
    expect(nextGentle.count).toBe(3)
    expect(nextGentle.cost).toBeCloseTo(seriesCost(20_000, 1.2, 7, 3, 1), 5)

    // Elite tier (sf 1.98) has first milestone at 3
    const nextElite = bulkBuyQuote(2_600_000_000_000, 1.98, 1, 1, 'next', 1e16)
    expect(nextElite.count).toBe(2)

    // Buy-to-let (sf 1.50, milestones [10,20,...]) at 10 owned targets the 20 milestone
    expect(bulkBuyQuote(115_000_000, 1.5, 10, 1, 'next', 1e15).count).toBe(10)

    const budget = seriesCost(20_000, 1.2, 0, 6, 1) + 50
    const maxAffordable = bulkBuyQuote(20_000, 1.2, 0, 1, 'max', budget)
    expect(maxAffordable.count).toBe(6)
    expect(maxAffordable.canAfford).toBe(true)
    expect(maxAffordable.cost).toBeLessThanOrEqual(budget)

    const broke = bulkBuyQuote(20_000, 1.2, 0, 1, 'max', 500)
    expect(broke).toEqual({ count: 1, cost: 20_000, canAfford: false })
  })

  it('applies social class income perks, mates-rates discounts, and bracket progress', () => {
    const start = classInfoForLevel(0, 0)
    expect(start.current.level).toBe(0)
    expect(start.incomeMultiplier).toBe(1)
    expect(start.costDiscount).toBe(1)
    expect(start.bracketProgress).toBe(0)

    const mid = classInfoForLevel(0, 2500)
    expect(mid.current.level).toBe(0)
    expect(mid.bracketProgress).toBeCloseTo(2500 / SOCIAL_CLASSES[1].threshold, 6)

    const elite = classInfoForLevel(6, 9e12)
    expect(elite.current.level).toBe(6)
    expect(elite.next?.label).toBe('Davos Regular')
    expect(elite.incomeMultiplier).toBeCloseTo(1.9, 5)
    expect(elite.costDiscount).toBeCloseTo(0.88, 5)

    const reptilian = classInfoForLevel(9, 5e18)
    expect(reptilian.current.level).toBe(9)
    expect(reptilian.next).toBeNull()
    expect(reptilian.incomeMultiplier).toBeCloseTo(2.35, 5)
    expect(reptilian.costDiscount).toBeCloseTo(0.82, 5)
    expect(reptilian.bracketProgress).toBe(1)
  })

  it('combines job-to-business 1% synergies, milestones, quoteIncomeDelta, legacy, and intern hustle benefit', () => {
    const base = {
      jobsPurchased: { '5': 10 }, // Teaching assistant x10 -> 2x milestone + +10% to Etsy store ('1')
      businessesOwned: { '1': 9 }, // Etsy store x9, each +10% from the Teaching assistants
      legacyPoints: 2,
      classLevel: 0,
      deregulationRank: 0,
      autoClickers: 0,
      businessBuffMultiplier: 1,
      clickBuffMultiplier: 1,
      hustleMultiplier: 2
    }
    // Base click + (10 Teaching assistants * 2 milestone), * legacy, then * 2 hustle
    const legacy = legacyMultiplier(2)
    const ta = JOBS_BY_ID['5'].moneyPerClick
    const etsy = BUSINESSES_BY_ID['1'].moneyPerSecond
    const click = (BASE_CLICK_VALUE + 10 * ta * 2) * legacy
    expect(computeClickIncome(base, false)).toBeCloseTo(click, 5)
    expect(computeClickIncome(base, true)).toBeCloseTo(click * 2, 5)
    // 9 Etsy stores * 1.10 synergy * legacy
    const passive = 9 * etsy * 1.1 * legacy
    expect(computePassivePerSecond(base)).toBeCloseTo(passive, 5)

    // With 2 Unpaid Interns: idle (hustle 1) adds 2 clicks a second; hustling (hustle 2) doubles them
    expect(computePassivePerSecond({ ...base, autoClickers: 2, hustleMultiplier: 1 })).toBeCloseTo(passive + 2 * click, 5)
    expect(computePassivePerSecond({ ...base, autoClickers: 2, hustleMultiplier: 2 })).toBeCloseTo(passive + 2 * click * 2, 5)

    // Buying the 10th Etsy store crosses milestone 10, doubling all ten units
    const deltaBiz = quoteIncomeDelta('businesses', '1', 1, base)
    expect(deltaBiz.deltaPerSec).toBeCloseTo(10 * etsy * 2 * 1.1 * legacy - passive, 5)

    // Buying 1 more Teaching assistant boosts both click income AND Etsy passive synergy!
    const deltaJob = quoteIncomeDelta('jobs', '5', 1, base)
    expect(deltaJob.deltaPerClick).toBeGreaterThan(0)
    expect(deltaJob.deltaPerSec).toBeGreaterThan(0)
  })

  it('pays the heir 5% of the estate, capped one gate short of the deepest gate beaten', () => {
    // A small estate passes on 5%
    expect(heirInheritance(1000, 3)).toBe(50)
    // A deep estate passes on the threshold of the gate before the deepest
    expect(heirInheritance(1e60, 3) / GATE_NET_WORTH[2]).toBeCloseTo(1, 9)
    expect(heirInheritance(1e60, 9) / GATE_NET_WORTH[8]).toBeCloseTo(1, 9)
    // Retiring after gate 1 still caps at gate 1, and a bigger share scales the cap
    expect(heirInheritance(1e60, 1) / GATE_NET_WORTH[1]).toBeCloseTo(1, 9)
    expect(heirInheritance(1e60, 3, 0.05) / GATE_NET_WORTH[2]).toBeCloseTo(2, 9)
  })

  it('multiplies income by 4.5 per Legacy point, +1x/rank Hustle cap, and offline catch-up', () => {
    expect(legacyMultiplier(0)).toBe(1)
    expect(legacyMultiplier(1)).toBeCloseTo(LEGACY_INCOME_PER_POINT)
    expect(legacyMultiplier(3)).toBeCloseTo(Math.pow(LEGACY_INCOME_PER_POINT, 3))
    // A point is a gate past the family's best: about as much stronger as the next gate is harder
    expect(LEGACY_INCOME_PER_POINT).toBeGreaterThanOrEqual(3.5)
    expect(LEGACY_INCOME_PER_POINT).toBeLessThanOrEqual(5.5)
    // A scale applies to the points: half the points' worth
    expect(legacyMultiplier(4, 0.5)).toBeCloseTo(legacyMultiplier(2))
    expect(maxHustleMultiplier(0)).toBe(3)
    expect(maxHustleMultiplier(1)).toBe(4)
    expect(maxHustleMultiplier(5)).toBe(8)

    expect(computeOfflineCatchUp(30_000, 1000, 0)).toBeNull()
    const catchUp = computeOfflineCatchUp(2 * 3600 * 1000, 1000, 2)
    expect(catchUp).toEqual({
      secondsCredited: 7200,
      efficiency: 0.7,
      moneyEarned: 7200 * 1000 * 0.7
    })
  })
})
