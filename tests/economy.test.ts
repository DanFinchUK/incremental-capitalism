import { describe, expect, it } from 'vitest'
import { BUSINESSES, JOBS } from '../src/data/items'
import {
  FIRST_LEGACY_LIFETIME,
  autoBuyThreshold,
  bulkBuyQuote,
  computeClickIncome,
  computeLegacyGain,
  legacyLifetimeThreshold,
  legacyMultiplier,
  computeOfflineCatchUp,
  computePassivePerSecond,
  itemMilestones,
  milestoneMultiplier,
  milestoneProgress,
  quoteIncomeDelta,
  selectAutoBuyTarget,
  seriesCost,
  socialClassInfo,
  maxHustleMultiplier
} from '../src/engine/economy'

describe('economy engine', () => {
  it('tapers 5 milestone pips across 4 scaleFactor bands and scales deregulation', () => {
    expect(itemMilestones(1.2)).toEqual([10, 25, 50, 100, 200])
    expect(itemMilestones(1.42)).toEqual([10, 20, 40, 75, 125])
    expect(itemMilestones(1.65)).toEqual([5, 10, 25, 50, 75])
    expect(itemMilestones(1.98)).toEqual([3, 5, 10, 20, 35])

    expect(milestoneMultiplier(0, 1.2, 0)).toBe(1)
    expect(milestoneMultiplier(9, 1.2, 0)).toBe(1)
    expect(milestoneMultiplier(10, 1.2, 0)).toBe(2)
    expect(milestoneMultiplier(200, 1.2, 0)).toBe(32)
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

  it('calculates exact geometric bulk-buy quotes including per-item tapered next milestones', () => {
    const one = bulkBuyQuote(20_000, 1.2, 0, 1, 1, 50_000)
    expect(one).toEqual({ count: 1, cost: 20_000, canAfford: true })

    const nextGentle = bulkBuyQuote(20_000, 1.2, 7, 1, 'next', 1_000_000)
    expect(nextGentle.count).toBe(3)
    expect(nextGentle.cost).toBeCloseTo(seriesCost(20_000, 1.2, 7, 3, 1), 5)

    // Elite tier (sf 1.98) has first milestone at 3
    const nextElite = bulkBuyQuote(2_600_000_000_000, 1.98, 1, 1, 'next', 1e16)
    expect(nextElite.count).toBe(2)

    // Buy-to-let (sf 1.50, milestones [10,20,...]) at 10 owned with 5 buys left to hit 15 auto-buy unlock targets x5
    const nextAutoUnlock = bulkBuyQuote(115_000_000, 1.5, 10, 1, 'next', 1e15, 5)
    expect(nextAutoUnlock.count).toBe(5)

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
    expect(elite.next?.label).toBe('Davos Regular')
    expect(elite.incomeMultiplier).toBeCloseTo(1.9, 5)
    expect(elite.costDiscount).toBeCloseTo(0.88, 5)

    const reptilian = socialClassInfo(5e18)
    expect(reptilian.current.level).toBe(9)
    expect(reptilian.next).toBeNull()
    expect(reptilian.incomeMultiplier).toBeCloseTo(2.35, 5)
    expect(reptilian.costDiscount).toBeCloseTo(0.82, 5)
    expect(reptilian.bracketProgress).toBe(1)
  })

  it('combines job-to-business 1% synergies, milestones, quoteIncomeDelta, compounding legacy, and intern hustle benefit', () => {
    const base = {
      jobsPurchased: { '5': 10 }, // Teaching assistant x10 -> 2x milestone + +10% to Etsy store ('1')
      businessesOwned: { '1': 9 }, // Etsy store x9 -> £2,600/s * 1.10 = £2,860/s each
      legacyPoints: 2, // 1.5^2 = 2.25x legacy
      classLevel: 0,
      deregulationRank: 0,
      autoClickers: 0,
      businessBuffMultiplier: 1,
      clickBuffMultiplier: 1,
      hustleMultiplier: 2
    }
    // Base click 30 + (10 * 1450 * 2 milestone) = 29,030; * 2.25 legacy = 65,317.5; * 2 hustle = 130,635
    expect(computeClickIncome(base, false)).toBeCloseTo(65_317.5, 5)
    expect(computeClickIncome(base, true)).toBeCloseTo(130_635, 5)
    // 9 * 2600 * 1.10 * 2.25 legacy = 57,915/s
    expect(computePassivePerSecond(base)).toBeCloseTo(57_915, 5)

    // With 2 Unpaid Interns: when idle (hustle=1) adds 2 * 65,317.5; when manually hustling (hustle=2) adds 2 * 130,635!
    expect(computePassivePerSecond({ ...base, autoClickers: 2, hustleMultiplier: 1 })).toBeCloseTo(
      57_915 + 2 * 65_317.5,
      5
    )
    expect(computePassivePerSecond({ ...base, autoClickers: 2, hustleMultiplier: 2 })).toBeCloseTo(
      57_915 + 2 * 130_635,
      5
    )

    // Buying 10th Etsy crosses milestone 10 (doubles all 10 units -> 10 * 2600 * 2 * 1.10 * 2.25 = 128,700 -> +70,785/s!)
    const deltaBiz = quoteIncomeDelta('businesses', '1', 1, base)
    expect(deltaBiz.deltaPerSec).toBeCloseTo(70_785, 5)

    // Buying 1 more Teaching assistant boosts both click income AND Etsy passive synergy!
    const deltaJob = quoteIncomeDelta('jobs', '5', 1, base)
    expect(deltaJob.deltaPerClick).toBeGreaterThan(0)
    expect(deltaJob.deltaPerSec).toBeGreaterThan(0)
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
      businessesOwned: { '1': 9, '20': 0 },
      lifetimePurchases: { jobs: {}, businesses: { '1': 50, '20': 50 } },
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
    expect(withLegacy?.kind).toBe('businesses')
    expect(withLegacy?.id).toBe('1')
  })

  it('uses a geometric Legacy curve (each point x2.7 lifetime, x1.5 income), +1x/rank Hustle cap, and offline catch-up', () => {
    expect(FIRST_LEGACY_LIFETIME).toBe(4.5e11)
    expect(computeLegacyGain(FIRST_LEGACY_LIFETIME * 0.99, 0)).toBe(0)
    expect(computeLegacyGain(FIRST_LEGACY_LIFETIME, 0)).toBe(1)
    // P=2 needs another 2.7 * £450B: £450B * 3.7 = £1.665T
    expect(computeLegacyGain(1.66e12, 1)).toBe(0)
    expect(computeLegacyGain(1.665e12, 1)).toBe(1)
    // P=3 needs another 2.7^2 * £450B: £450B * 10.99 = £4.9455T
    expect(computeLegacyGain(4.94e12, 1)).toBe(1)
    expect(legacyLifetimeThreshold(3)).toBeCloseTo(4.9455e12, -3)
    expect(computeLegacyGain(legacyLifetimeThreshold(3), 1)).toBe(2)
    // Float logs must not drop or add a point at exact thresholds
    for (const p of [5, 10, 30, 60]) {
      const at = legacyLifetimeThreshold(p)
      expect(computeLegacyGain(at, 0)).toBe(p)
      expect(computeLegacyGain(at * (1 - 1e-9), 0)).toBe(p - 1)
    }
    expect(legacyMultiplier(0)).toBe(1)
    expect(legacyMultiplier(1)).toBe(1.5)
    expect(legacyMultiplier(4)).toBeCloseTo(5.0625, 10)
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

  it('reaches £450B first Legacy around 70–85 minutes under realistic human-paced play', () => {
    const jobsOwned: Record<string, number> = {}
    const bizOwned: Record<string, number> = {}
    let spent = 0
    let money = 0
    let lifetime = 0
    let t = 0
    let firstLegacySec: number | null = null

    // Human-paced model: 4 CPS for opening 5m to launch businesses, then 0.3 CPS casual clicks
    const cpsAt = (sec: number) => (sec < 300 ? 4 : 0.3)

    const snap = (sec: number) => {
      const cls = socialClassInfo(money + spent)
      const cps = cpsAt(sec)
      return {
        cls,
        cps,
        input: {
          jobsPurchased: jobsOwned,
          businessesOwned: bizOwned,
          legacyPoints: 0,
          classLevel: cls.current.level,
          deregulationRank: 0,
          autoClickers: 0,
          businessBuffMultiplier: 1,
          clickBuffMultiplier: 1,
          hustleMultiplier: cps >= 3 ? 1.5 : 1
        }
      }
    }

    const totalRate = (sec: number) => {
      const { cps, input } = snap(sec)
      return computePassivePerSecond(input) + cps * computeClickIncome(input, true)
    }

    while (t < 110 * 60) {
      const { cls } = snap(t)
      const baseR = totalRate(t)
      let bestKind: 'jobs' | 'businesses' = 'jobs'
      let bestId = '1'
      let bestCost = Infinity
      let bestScore = -1

      for (const j of JOBS) {
        const n = jobsOwned[j.id] ?? 0
        const c = seriesCost(j.baseCost, j.scaleFactor, n, 1, cls.costDiscount)
        jobsOwned[j.id] = n + 1
        const score = (totalRate(t) - baseR) / c
        jobsOwned[j.id] = n
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
        const score = (totalRate(t) - baseR) / c
        bizOwned[b.id] = n
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
      } else {
        const r = totalRate(t)
        const dt = Math.min(110 * 60 - t, Math.max(0.5, (bestCost - money) / r))
        if (firstLegacySec === null && lifetime + r * dt >= FIRST_LEGACY_LIFETIME) {
          firstLegacySec = t + (FIRST_LEGACY_LIFETIME - lifetime) / r
        }
        money += r * dt
        lifetime += r * dt
        t += dt
      }
      if (firstLegacySec !== null && t >= 96 * 60) {
        break
      }
    }

    expect(firstLegacySec).not.toBeNull()
    const firstLegacyMinutes = (firstLegacySec ?? 0) / 60
    expect(firstLegacyMinutes).toBeGreaterThanOrEqual(70)
    expect(firstLegacyMinutes).toBeLessThanOrEqual(85)
  })
})
