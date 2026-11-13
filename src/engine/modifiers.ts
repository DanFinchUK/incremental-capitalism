// One bag of rule changes that heir traits, advisors and titles all feed.
// Multipliers combine by product, additive bonuses by sum, flags by "or".
import type { Sector } from '../data/items'

export interface Modifiers {
  clickMult: number
  businessMult: number
  sectorBusinessMult: Partial<Record<Sector, number>>
  sectorCostMult: Partial<Record<Sector, number>>
  purchaseCostMult: number
  // Share of every income credit taken by retainers, commissions and the like
  incomeDrain: number
  // Added to each ownership milestone's multiplier step
  milestoneStepBonus: number
  // Scales the income bonus from Legacy points
  legacyScale: number
  // Multiplies the heir's trust fund when they take over
  trustFundMult: number
  // Added to the share of the estate passed on at retirement
  trustFundShareAdd: number
  internsDisabled: boolean
  eventIntervalMult: number
  // Extra chance that a spawned opportunity is the shady deal
  shadyBonus: number
  bossTimeMult: number
  bossTargetMult: number
  // 1 is full strength; 0.75 is a quarter weaker
  twistStrength: number
  automationShareBonus: number
  windfallMult: number
}

export type ModifierSource = Partial<Modifiers>

export const NEUTRAL_MODIFIERS: Readonly<Modifiers> = Object.freeze({
  clickMult: 1,
  businessMult: 1,
  sectorBusinessMult: {},
  sectorCostMult: {},
  purchaseCostMult: 1,
  incomeDrain: 0,
  milestoneStepBonus: 0,
  legacyScale: 1,
  trustFundMult: 1,
  trustFundShareAdd: 0,
  internsDisabled: false,
  eventIntervalMult: 1,
  shadyBonus: 0,
  bossTimeMult: 1,
  bossTargetMult: 1,
  twistStrength: 1,
  automationShareBonus: 0,
  windfallMult: 1
})

const PRODUCT_KEYS = [
  'clickMult',
  'businessMult',
  'purchaseCostMult',
  'legacyScale',
  'trustFundMult',
  'eventIntervalMult',
  'bossTimeMult',
  'bossTargetMult',
  'twistStrength',
  'windfallMult'
] as const

const SUM_KEYS = ['incomeDrain', 'milestoneStepBonus', 'trustFundShareAdd', 'shadyBonus', 'automationShareBonus'] as const

export const MAX_INCOME_DRAIN = 0.9

function mergeSectorMults(
  into: Partial<Record<Sector, number>>,
  from: Partial<Record<Sector, number>> | undefined
): Partial<Record<Sector, number>> {
  const out = { ...into }
  for (const [sector, mult] of Object.entries(from ?? {}) as Array<[Sector, number]>) {
    out[sector] = (out[sector] ?? 1) * mult
  }
  return out
}

export function combineModifiers(sources: ReadonlyArray<ModifierSource>): Modifiers {
  const m: Modifiers = { ...NEUTRAL_MODIFIERS, sectorBusinessMult: {}, sectorCostMult: {} }
  for (const src of sources) {
    for (const key of PRODUCT_KEYS) {
      if (src[key] !== undefined) m[key] *= src[key]!
    }
    for (const key of SUM_KEYS) {
      if (src[key] !== undefined) m[key] += src[key]!
    }
    if (src.internsDisabled) m.internsDisabled = true
    m.sectorBusinessMult = mergeSectorMults(m.sectorBusinessMult, src.sectorBusinessMult)
    m.sectorCostMult = mergeSectorMults(m.sectorCostMult, src.sectorCostMult)
  }
  m.incomeDrain = Math.min(MAX_INCOME_DRAIN, Math.max(0, m.incomeDrain))
  return m
}
