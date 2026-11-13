import { describe, expect, it } from 'vitest'
import { NEUTRAL_MODIFIERS, combineModifiers } from '../src/engine/modifiers'
import { combineTwists } from '../src/engine/bosses'
import { BUSINESSES, JOBS } from '../src/data/items'

describe('modifiers', () => {
  it('combines multipliers by product, additions by sum and flags by or', () => {
    expect(combineModifiers([])).toEqual(NEUTRAL_MODIFIERS)
    const m = combineModifiers([
      { clickMult: 2, incomeDrain: 0.02, automationShareBonus: 0.01, sectorBusinessMult: { food: 3 } },
      { clickMult: 1.5, incomeDrain: 0.03, internsDisabled: true, sectorBusinessMult: { food: 2, property: 4 } }
    ])
    expect(m.clickMult).toBeCloseTo(3)
    expect(m.incomeDrain).toBeCloseTo(0.05)
    expect(m.automationShareBonus).toBeCloseTo(0.01)
    expect(m.internsDisabled).toBe(true)
    expect(m.sectorBusinessMult).toEqual({ food: 6, property: 4 })
    expect(m.businessMult).toBe(1)
  })

  it('caps the income drain so nothing can take all your income', () => {
    expect(combineModifiers([{ incomeDrain: 0.6 }, { incomeDrain: 0.6 }]).incomeDrain).toBeLessThanOrEqual(0.9)
  })

  it('weakens boss twists by twist strength', () => {
    const half = combineTwists([{ kind: 'clickPay', mult: 0.5 }, { kind: 'incomeTax', rate: 0.3 }, { kind: 'purchaseCost', mult: 1.5 }], 0.5)
    expect(half.clickPayMult).toBeCloseTo(0.75)
    expect(half.incomeTaxRate).toBeCloseTo(0.15)
    expect(half.purchaseCostMult).toBeCloseTo(1.25)
  })

  it('tags every item with a sector', () => {
    for (const item of [...JOBS, ...BUSINESSES]) {
      expect(['food', 'property', 'finance', 'infrastructure', 'media', 'services']).toContain(item.sector)
    }
  })
})
