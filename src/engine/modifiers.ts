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
  // Scales scandal cash losses, freezes and penalty lengths
  scandalSeverity: number
  // 1 is full strength; 0.75 is a quarter weaker
  twistStrength: number
  // Extra kinds of item each buyer handles a second (Landed Gentry and kin)
  buyerItemTypes: number
  windfallMult: number
  // What the Interns earn, on top of the click pay they tap at
  internMult: number
  // Extra Interns, brought by staff (the Work Experience Coordinator and kin)
  internsAdd: number
  // Added to the share of passive income paid while away
  offlineEfficiencyAdd: number
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
  scandalSeverity: 1,
  twistStrength: 1,
  buyerItemTypes: 0,
  windfallMult: 1,
  internMult: 1,
  internsAdd: 0,
  offlineEfficiencyAdd: 0
})

const PRODUCT_KEYS = [
  'clickMult',
  'businessMult',
  'purchaseCostMult',
  'legacyScale',
  'trustFundMult',
  'eventIntervalMult',
  'bossTimeMult',
  'scandalSeverity',
  'twistStrength',
  'windfallMult',
  'internMult'
] as const

const SUM_KEYS = [
  'incomeDrain',
  'milestoneStepBonus',
  'trustFundShareAdd',
  'shadyBonus',
  'buyerItemTypes',
  'internsAdd',
  'offlineEfficiencyAdd'
] as const

export const MAX_INCOME_DRAIN = 0.9
// No multiplier may fall below this, however much stacks up
export const MIN_PRODUCT = 0.05

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
  for (const key of PRODUCT_KEYS) {
    m[key] = Math.max(MIN_PRODUCT, m[key])
  }
  m.incomeDrain = Math.min(MAX_INCOME_DRAIN, Math.max(0, m.incomeDrain))
  return m
}

// Whether two bags hold the same values. The store hands back the bag it
// already had when nothing changed, so income isn't worked out again for
// a new object with the same numbers (an advisor's campaign rebuilds the
// office every second, long after its effect has stopped growing).
export function sameModifiers(a: Readonly<Modifiers>, b: Readonly<Modifiers>): boolean {
  for (const key of Object.keys(b) as Array<keyof Modifiers>) {
    const x = a[key]
    const y = b[key]
    if (Object.is(x, y)) continue
    if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return false
    const xs = x as Record<string, number>
    const ys = y as Record<string, number>
    const xk = Object.keys(xs)
    if (xk.length !== Object.keys(ys).length) return false
    for (const k of xk) if (!Object.is(xs[k], ys[k])) return false
  }
  return Object.keys(a).length === Object.keys(b).length
}
