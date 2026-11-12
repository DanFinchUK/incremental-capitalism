import { describe, expect, it } from 'vitest'
import { BUSINESSES, JOBS } from '../src/data/items'
import {
  FIRST_LEGACY_LIFETIME,
  autoBuyThreshold,
  bulkBuyQuote,
  computeClickIncome,
  computeLegacyGain,
  computeOfflineCatchUp,
  computePassivePerSecond,
  milestoneMultiplier,
  milestoneProgress,
  selectAutoBuyTarget,
  seriesCost,
  socialClassInfo,
  trustFundStartingCash
} from '../src/engine/economy'

describe('economy engine', () => {
  it('computes milestone multipliers and deregulation scaling', () => {
    expect(milestoneMultiplier(0, 0)).toBe(1)
    expect(milestoneMultiplier(9, 0)).toBe(1)
    expect(milestoneMultiplier(10, 0)).toBe(2)
    expect(milestoneMultiplier(25, 0)).toBe(4)
    expect(milestoneMultiplier(200, 0)).toBe(32)
    expect(milestoneMultiplier(25, 4)).toBe(9)

    const prog = milestoneProgress(17)
    expect(prog.reachedCount).toBe(1)
    expect(prog.prevMilestone).toBe(10)
    expect(prog.nextMilestone).toBe(25)
    expect(prog.progress).toBeCloseTo((17 - 10) / (25 - 10), 5)
  })

  it('tapers business auto-buy thresholds floored to nearest 5 and respects nepotism', () => {
    expect(autoBuyThreshold('businesses', 1.2, 0)).toBe(40)
    expect(autoBuyThreshold('businesses', 1.25, 0)).toBe(30)
    expect(autoBuyThreshold('businesses', 1.3, 0)).toBe(25)
    expect(autoBuyThreshold('businesses', 1.4, 0)).toBe(20)
    expect(autoBuyThreshold('businesses', 1.5, 0)).toBe(15)
    expect(autoBuyThreshold('businesses', 1.65, 0)).toBe(10)
    expect(autoBuyThreshold('businesses', 2.05, 0)).toBe(10)

    expect(autoBuyThreshold('businesses', 1.2, 2)).toBe(30)
    expect(autoBuyThreshold('businesses', 2.05, 3)).toBe(5)
    expect(autoBuyThreshold('jobs', 1.1, 0)).toBe(10)
    expect(autoBuyThreshold('jobs', 1.1, 2)).toBe(5)
  })

  it('calculates exact geometric bulk-buy quotes for 1, 10, next, and max', () => {
    const one = bulkBuyQuote(20_000, 1.2, 0, 1, 1, 50_000)
    expect(one).toEqual({ count: 1, cost: 20_000, canAfford: true })

    const next = bulkBuyQuote(20_000, 1.2, 7, 1, 'next', 1_000_000)
    expect(next.count).toBe(3)
    expect(next.cost).toBeCloseTo(seriesCost(20_000, 1.2, 7, 3, 1), 5)

    const budget = seriesCost(20_000, 1.2, 0, 6, 1) + 50
    const maxAffordable = bulkBuyQuote(20_000, 1.2, 0, 1, 'max', budget)
    expect(maxAffordable.count).toBe(6)
    expect(maxAffordable.canAfford).toBe(true)
    expect(maxAffordable.cost).toBeLessThanOrEqual(budget)

    const broke = bulkBuyQuote(20_000, 1.2, 0, 1, 'max', 500)
    expect(broke).toEqual({ count: 1, cost: 20_000, canAfford: false })
  })

  it('applies social class income perks, mates-rates discounts, and bracket progress', () => {
    const start = socialClassInfo(0)
    expect(start.current.level).toBe(0)
    expect(start.incomeMultiplier).toBe(1)
    expect(start.costDiscount).toBe(1)
    expect(start.bracketProgress).toBe(0)

    const mid = socialClassInfo(2500)
    expect(mid.current.level).toBe(0)
    expect(mid.bracketProgress).toBeCloseTo(2500 / 4999, 3)

    const elite = socialClassInfo(9e12)
    expect(elite.current.level).toBe(6)
    expect(elite.next).toBeNull()
    expect(elite.incomeMultiplier).toBeCloseTo(1.9, 5)
    expect(elite.costDiscount).toBeCloseTo(0.88, 5)
    expect(elite.bracketProgress).toBe(1)
  })

  it('combines job-to-business 1% synergies, milestones, legacy, and hustle multipliers', () => {
    const base = {
      jobsPurchased: { '1': 10 }, // Hairdresser x10 -> 2x milestone + +10% to Etsy store ('1')
      businessesOwned: { '1': 1 }, // Etsy store x1 -> £3,000/s * 1.10 synergy = £3,300/s
      legacyPoints: 4, // 2.0x legacy
      classLevel: 0,
      deregulationRank: 0,
      autoClickers: 0,
      businessBuffMultiplier: 1,
      clickBuffMultiplier: 1,
      hustleMultiplier: 2
    }
    // Base click 30 + (10 * 30 * 2 milestone) = 630; * 2 legacy = 1260; * 2 hustle = 2520
    expect(computeClickIncome(base, false)).toBe(1260)
    expect(computeClickIncome(base, true)).toBe(2520)
    // Etsy £3,000 * 1.10 synergy * 2 legacy = £6,600/s
    expect(computePassivePerSecond(base)).toBeCloseTo(6600, 5)
  })

  it('gates business auto-buy on 1 Legacy and picks milestone jumps when optimal', () => {
    const noLegacy = selectAutoBuyTarget({
      jobsPurchased: {},
      businessesOwned: { '1': 9 },
      lifetimePurchases: { jobs: {}, businesses: { '1': 50 } },
      autoBuyDisabled: { jobs: {}, businesses: {} },
      legacyPoints: 0,
      classLevel: 0,
      deregulationRank: 0,
      nepotismRank: 0,
      autoClickers: 0,
      businessBuffMultiplier: 1,
      clickBuffMultiplier: 1,
      hustleMultiplier: 1
    })
    expect(noLegacy).toBeNull()

    const withLegacy = selectAutoBuyTarget({
      jobsPurchased: {},
      businessesOwned: { '1': 9, '2': 0 },
      lifetimePurchases: { jobs: {}, businesses: { '1': 50, '2': 50 } },
      autoBuyDisabled: { jobs: {}, businesses: {} },
      legacyPoints: 1,
      classLevel: 0,
      deregulationRank: 0,
      nepotismRank: 0,
      autoClickers: 0,
      businessBuffMultiplier: 1,
      clickBuffMultiplier: 1,
      hustleMultiplier: 1
    })
    // Buying 10th Etsy doubles all 10 units (+11 * 3000 = +33,000/s for ~103k), beating Freelance #1 (+9,000/s for 100k)
    expect(withLegacy?.kind).toBe('businesses')
    expect(withLegacy?.id).toBe('1')
  })

  it('computes lifetime legacy curve, trust fund cash, and offline catch-up', () => {
    expect(computeLegacyGain(FIRST_LEGACY_LIFETIME * 0.99, 0)).toBe(0)
    expect(computeLegacyGain(FIRST_LEGACY_LIFETIME, 0)).toBe(1)
    expect(computeLegacyGain(FIRST_LEGACY_LIFETIME * 9, 1)).toBe(2)
    expect(trustFundStartingCash(0)).toBe(0)
    expect(trustFundStartingCash(2)).toBe(125_000)

    expect(computeOfflineCatchUp(30_000, 1000, 0)).toBeNull()
    const catchUp = computeOfflineCatchUp(2 * 3600 * 1000, 1000, 2)
    expect(catchUp).toEqual({
      secondsCredited: 7200,
      efficiency: 0.7,
      moneyEarned: 7200 * 1000 * 0.7
    })
  })

  it('reaches first Legacy around 90 minutes in an active 4-CPS zero-legacy run with zero dead businesses', () => {
    const jobsOwned: Record<string, number> = {}
    const bizOwned: Record<string, number> = {}
    let spent = 0
    let money = 0
    let lifetime = 0
    let t = 0
    let firstLegacySec: number | null = null

    const snap = () => {
      const cls = socialClassInfo(money + spent)
      return {
        cls,
        input: {
          jobsPurchased: jobsOwned,
          businessesOwned: bizOwned,
          legacyPoints: 0,
          classLevel: cls.current.level,
          deregulationRank: 0,
          autoClickers: 0,
          businessBuffMultiplier: 1,
          clickBuffMultiplier: 1,
          hustleMultiplier: 1.5
        }
      }
    }

    const totalRate = () => {
      const { input } = snap()
      return computePassivePerSecond(input) + 4 * computeClickIncome(input, true)
    }

    while (t < 110 * 60) {
      let bought = true
      while (bought) {
        bought = false
        const { cls } = snap()
        const baseR = totalRate()
        let bestKind: 'jobs' | 'businesses' = 'jobs'
        let bestId = '1'
        let bestCost = Infinity
        let bestScore = -1

        for (const j of JOBS) {
          const n = jobsOwned[j.id] ?? 0
          const c = seriesCost(j.baseCost, j.scaleFactor, n, 1, cls.costDiscount)
          jobsOwned[j.id] = n + 1
          const delta = totalRate() - baseR
          jobsOwned[j.id] = n
          const score = delta / c
          if (score > bestScore) {
            bestScore = score
            bestKind = 'jobs'
            bestId = j.id
            bestCost = c
          }
        }
        for (const b of BUSINESSES) {
          const n = bizOwned[b.id] ?? 0
          const c = seriesCost(b.baseCost, b.scaleFactor, n, 1, cls.costDiscount)
          bizOwned[b.id] = n + 1
          const delta = totalRate() - baseR
          bizOwned[b.id] = n
          const score = delta / c
          if (score > bestScore) {
            bestScore = score
            bestKind = 'businesses'
            bestId = b.id
            bestCost = c
          }
        }

        if (money >= bestCost) {
          money -= bestCost
          spent += bestCost
          if (bestKind === 'jobs') {
            jobsOwned[bestId] = (jobsOwned[bestId] ?? 0) + 1
          } else {
            bizOwned[bestId] = (bizOwned[bestId] ?? 0) + 1
          }
          bought = true
        } else {
          const r = totalRate()
          const dt = Math.min(110 * 60 - t, Math.max(0.2, (bestCost - money) / r))
          if (firstLegacySec === null && lifetime + r * dt >= FIRST_LEGACY_LIFETIME) {
            firstLegacySec = t + (FIRST_LEGACY_LIFETIME - lifetime) / r
          }
          money += r * dt
          lifetime += r * dt
          t += dt
        }
      }
      if (firstLegacySec !== null && t >= 95 * 60) {
        break
      }
    }

    expect(firstLegacySec).not.toBeNull()
    const firstLegacyMinutes = (firstLegacySec ?? 0) / 60
    expect(firstLegacyMinutes).toBeGreaterThanOrEqual(85)
    expect(firstLegacyMinutes).toBeLessThanOrEqual(95)
    expect(bizOwned['11']).toBeGreaterThanOrEqual(1)
    expect(bizOwned['16']).toBeGreaterThanOrEqual(1)
  })
})
