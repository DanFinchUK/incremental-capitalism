import { describe, expect, it } from 'vitest'
import { SOCIAL_CLASSES } from '../src/data/classes'
import { BOSSES, type BossDef } from '../src/data/bosses'
import {
  NO_TWIST,
  bossForGate,
  combineTwists,
  evaluateBoss,
  gateThreshold,
  itemCostCeiling,
  legacyForDepth,
  newTracker
} from '../src/engine/bosses'

function boss(condition: BossDef['condition'], timeLimitSec = 100): BossDef {
  return {
    gate: 1,
    id: 'test',
    title: 'Test',
    blurb: '',
    victoryText: '',
    disgraceText: '',
    twistText: '',
    conditionText: '',
    twists: [],
    condition,
    timeLimitSec,
    cooldownSec: 10,
    legacyReward: 1
  }
}

describe('boss data', () => {
  it('defines nine bosses in gate order with the spec names', () => {
    expect(BOSSES.map((b) => b.gate)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(BOSSES.map((b) => b.title)).toEqual([
      'Zero-Hours Walkout',
      "Landlord's Inspection",
      'Garden Office Planning Permission',
      'Charity Golf Match',
      'Champagne Tasting',
      'Polishing the Family Silver',
      'Valuing the Art Collection',
      'Select Committee Grilling',
      'Royal Garden Party'
    ])
    for (const b of BOSSES) {
      expect(b.blurb.length).toBeGreaterThan(10)
      expect(b.disgraceText.length).toBeGreaterThan(20)
      expect(b.twistText.length).toBeGreaterThan(5)
      expect(b.conditionText.length).toBeGreaterThan(5)
    }
  })

  it('pays more for one gate deeper than for repeating a depth twice', () => {
    expect(legacyForDepth(0)).toBe(0)
    for (let g = 1; g < 9; g++) {
      expect(legacyForDepth(g + 1)).toBeGreaterThan(2 * legacyForDepth(g))
    }
  })

  it('looks bosses up by gate', () => {
    expect(bossForGate(1)?.title).toBe('Zero-Hours Walkout')
    expect(bossForGate(0)).toBeNull()
    expect(bossForGate(10)).toBeNull()
  })
})

describe('twists', () => {
  it('combines twists from several sources', () => {
    const e = combineTwists([
      { kind: 'clickPay', mult: 0.75 },
      { kind: 'incomeTax', rate: 0.15 },
      { kind: 'purchaseCost', mult: 1.25 }
    ])
    expect(e).toMatchObject({ clickPayMult: 0.75, incomeTaxRate: 0.15, purchaseCostMult: 1.25, automationPaused: false, clicksPolish: false, flood: null })
    expect(combineTwists([])).toEqual(NO_TWIST)
    expect(combineTwists([{ kind: 'automationPaused' }, { kind: 'clicksPolish' }])).toMatchObject({ automationPaused: true, clicksPolish: true })
    expect(combineTwists([{ kind: 'eventFlood', intervalSec: 6, corkedChance: 0.3 }]).flood).toEqual({ intervalSec: 6, corkedChance: 0.3 })
  })
})

describe('gates', () => {
  it('uses class thresholds and gates the item ceiling by the next class', () => {
    expect(gateThreshold(1)).toBe(SOCIAL_CLASSES[1].threshold)
    expect(gateThreshold(10)).toBe(Infinity)
    expect(itemCostCeiling(0)).toBe(SOCIAL_CLASSES[1].threshold)
    expect(itemCostCeiling(3)).toBe(SOCIAL_CLASSES[4].threshold)
    expect(itemCostCeiling(9)).toBe(Infinity)
  })
})

describe('evaluateBoss', () => {
  const start = 1000

  it('netWorth: progress is net worth over target, won at target', () => {
    const def = boss({ kind: 'netWorth', target: 1000 })
    const t = newTracker(1, start)
    expect(evaluateBoss(def, t, { netWorth: 500, allRevealedOwned: false }, start + 1)).toEqual({ progress: 0.5, won: false, lost: false })
    expect(evaluateBoss(def, t, { netWorth: 1000, allRevealedOwned: false }, start + 1)).toEqual({ progress: 1, won: true, lost: false })
  })

  it('tracked values drive their condition kinds', () => {
    const t = { ...newTracker(1, start), clickEarningsAtFullHustle: 30, earnedAfterTax: 60, polish: 90 }
    const snap = { netWorth: 0, allRevealedOwned: false }
    expect(evaluateBoss(boss({ kind: 'clickEarningsAtFullHustle', target: 100 }), t, snap, start).progress).toBeCloseTo(0.3)
    expect(evaluateBoss(boss({ kind: 'earnedAfterTax', target: 100 }), t, snap, start).progress).toBeCloseTo(0.6)
    expect(evaluateBoss(boss({ kind: 'polish', target: 90 }), t, snap, start).won).toBe(true)
  })

  it('netWorthWithinPar: lost once purchases exceed par, even when rich', () => {
    const def = boss({ kind: 'netWorthWithinPar', target: 1000, par: 3 })
    const t = { ...newTracker(1, start), purchases: 3 }
    expect(evaluateBoss(def, t, { netWorth: 1000, allRevealedOwned: false }, start).won).toBe(true)
    const over = { ...t, purchases: 4 }
    expect(evaluateBoss(def, over, { netWorth: 1e9, allRevealedOwned: false }, start)).toMatchObject({ won: false, lost: true })
  })

  it('ownAllRevealed: needs every revealed item and the net worth', () => {
    const def = boss({ kind: 'ownAllRevealed', netWorth: 1000 })
    const t = newTracker(1, start)
    const notAll = evaluateBoss(def, t, { netWorth: 5000, allRevealedOwned: false }, start)
    expect(notAll.won).toBe(false)
    expect(notAll.progress).toBeLessThan(1)
    expect(evaluateBoss(def, t, { netWorth: 999, allRevealedOwned: true }, start).won).toBe(false)
    expect(evaluateBoss(def, t, { netWorth: 1000, allRevealedOwned: true }, start).won).toBe(true)
  })

  it('is lost when the time limit runs out without a win', () => {
    const def = boss({ kind: 'netWorth', target: 1000 }, 100)
    const t = newTracker(1, start)
    expect(evaluateBoss(def, t, { netWorth: 0, allRevealedOwned: false }, start + 99_999).lost).toBe(false)
    expect(evaluateBoss(def, t, { netWorth: 0, allRevealedOwned: false }, start + 100_000).lost).toBe(true)
    // A win on the last moment still counts
    expect(evaluateBoss(def, t, { netWorth: 1000, allRevealedOwned: false }, start + 100_000)).toMatchObject({ won: true, lost: false })
  })
})
