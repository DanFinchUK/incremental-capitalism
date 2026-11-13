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

// strength scales how hard the numeric twists bite (1 = full, 0.75 = a
// quarter weaker); on/off twists are unaffected.
export function combineTwists(twists: ReadonlyArray<BossTwist>, strength = 1): TwistEffects {
  const effects: TwistEffects = { ...NO_TWIST }
  for (const twist of twists) {
    switch (twist.kind) {
      case 'clickPay':
        effects.clickPayMult *= 1 - (1 - twist.mult) * strength
        break
      case 'incomeTax': {
        const rate = twist.rate * strength
        // Stacked rents compound; a single rent keeps its exact rate
        effects.incomeTaxRate = effects.incomeTaxRate === 0 ? rate : 1 - (1 - effects.incomeTaxRate) * (1 - rate)
        break
      }
      case 'purchaseCost':
        effects.purchaseCostMult *= 1 + (twist.mult - 1) * strength
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

export interface BossScale {
  targetMult: number
  timeMult: number
}

export const NO_BOSS_SCALE: Readonly<BossScale> = Object.freeze({ targetMult: 1, timeMult: 1 })

// The condition's headline target (the net worth for ownAllRevealed).
export function conditionTarget(def: BossDef, scale: BossScale = NO_BOSS_SCALE): number {
  const c = def.condition
  return (c.kind === 'ownAllRevealed' ? c.netWorth : c.target) * scale.targetMult
}

export function evaluateBoss(
  def: BossDef,
  t: BossTracker,
  s: BossSnapshot,
  activeMs: number,
  scale: BossScale = NO_BOSS_SCALE
): BossEvaluation {
  const c = def.condition
  const target = conditionTarget(def, scale)
  let progress: number
  let won: boolean
  let bust = false
  switch (c.kind) {
    case 'clickEarningsAtFullHustle':
      progress = ratio(t.clickEarningsAtFullHustle, target)
      won = t.clickEarningsAtFullHustle >= target
      break
    case 'earnedAfterTax':
      progress = ratio(t.earnedAfterTax, target)
      won = t.earnedAfterTax >= target
      break
    case 'netWorth':
      progress = ratio(s.netWorth, target)
      won = s.netWorth >= target
      break
    case 'netWorthWithinPar':
      bust = t.purchases > c.par
      progress = ratio(s.netWorth, target)
      won = !bust && s.netWorth >= target
      break
    case 'polish':
      progress = ratio(t.polish, target)
      won = t.polish >= target
      break
    case 'ownAllRevealed':
      won = s.allRevealedOwned && s.netWorth >= target
      progress = won ? 1 : Math.min(ratio(s.netWorth, target), 0.99)
      break
  }
  const timedOut = activeMs - t.startedActiveMs >= def.timeLimitSec * scale.timeMult * 1000
  return { progress, won, lost: !won && (bust || timedOut) }
}

export function legacyForDepth(depth: number): number {
  return depth <= 0 ? 0 : (bossForGate(depth)?.legacyReward ?? 0)
}
