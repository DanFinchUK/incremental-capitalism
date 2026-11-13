import { SOCIAL_CLASSES } from '../data/classes'
import { BOSSES, type BossDef, type BossTwist } from '../data/bosses'

export interface TwistEffects {
  clickPayMult: number
  incomeTaxRate: number
  purchaseCostMult: number
  automationPaused: boolean
  clicksPolish: boolean
  flood: { intervalSec: number; corkedChance: number } | null
}

export const NO_TWIST: Readonly<TwistEffects> = Object.freeze({
  clickPayMult: 1,
  incomeTaxRate: 0,
  purchaseCostMult: 1,
  automationPaused: false,
  clicksPolish: false,
  flood: null
})

export function combineTwists(twists: ReadonlyArray<BossTwist>): TwistEffects {
  const effects: TwistEffects = { ...NO_TWIST }
  for (const twist of twists) {
    switch (twist.kind) {
      case 'clickPay':
        effects.clickPayMult *= twist.mult
        break
      case 'incomeTax':
        // Stacked rents compound; a single rent keeps its exact rate
        effects.incomeTaxRate =
          effects.incomeTaxRate === 0 ? twist.rate : 1 - (1 - effects.incomeTaxRate) * (1 - twist.rate)
        break
      case 'purchaseCost':
        effects.purchaseCostMult *= twist.mult
        break
      case 'eventFlood':
        effects.flood = { intervalSec: twist.intervalSec, corkedChance: twist.corkedChance }
        break
      case 'clicksPolish':
        effects.clicksPolish = true
        break
      case 'automationPaused':
        effects.automationPaused = true
        break
    }
  }
  return effects
}

export function gateThreshold(gate: number): number {
  return gate >= 1 && gate < SOCIAL_CLASSES.length ? SOCIAL_CLASSES[gate].threshold : Infinity
}

export function itemCostCeiling(gatesBeaten: number): number {
  return gateThreshold(gatesBeaten + 1)
}

export function bossForGate(gate: number): BossDef | null {
  return BOSSES.find((b) => b.gate === gate) ?? null
}

export interface BossTracker {
  gate: number
  startedActiveMs: number
  clickEarningsAtFullHustle: number
  earnedAfterTax: number
  polish: number
  purchases: number
}

export function newTracker(gate: number, activeMs: number): BossTracker {
  return { gate, startedActiveMs: activeMs, clickEarningsAtFullHustle: 0, earnedAfterTax: 0, polish: 0, purchases: 0 }
}

export interface BossSnapshot {
  netWorth: number
  allRevealedOwned: boolean
}

export interface BossEvaluation {
  progress: number
  won: boolean
  lost: boolean
}

function ratio(value: number, target: number): number {
  return target <= 0 ? 1 : Math.min(1, Math.max(0, value / target))
}

export function evaluateBoss(def: BossDef, t: BossTracker, s: BossSnapshot, activeMs: number): BossEvaluation {
  const c = def.condition
  let progress: number
  let won: boolean
  let bust = false
  switch (c.kind) {
    case 'clickEarningsAtFullHustle':
      progress = ratio(t.clickEarningsAtFullHustle, c.target)
      won = t.clickEarningsAtFullHustle >= c.target
      break
    case 'earnedAfterTax':
      progress = ratio(t.earnedAfterTax, c.target)
      won = t.earnedAfterTax >= c.target
      break
    case 'netWorth':
      progress = ratio(s.netWorth, c.target)
      won = s.netWorth >= c.target
      break
    case 'netWorthWithinPar':
      bust = t.purchases > c.par
      progress = ratio(s.netWorth, c.target)
      won = !bust && s.netWorth >= c.target
      break
    case 'polish':
      progress = ratio(t.polish, c.target)
      won = t.polish >= c.target
      break
    case 'ownAllRevealed':
      won = s.allRevealedOwned && s.netWorth >= c.netWorth
      progress = won ? 1 : Math.min(ratio(s.netWorth, c.netWorth), 0.99)
      break
  }
  const timedOut = activeMs - t.startedActiveMs >= def.timeLimitSec * 1000
  return { progress, won, lost: !won && (bust || timedOut) }
}

export function legacyForDepth(depth: number): number {
  return depth <= 0 ? 0 : (bossForGate(depth)?.legacyReward ?? 0)
}
