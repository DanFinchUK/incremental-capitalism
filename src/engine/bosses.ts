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
  // Every purchase in the fight (strokes, for the Golf boss), and those the
  // player made themselves: only theirs commit them, ending the free back-out
  purchases: number
  ownPurchases?: number
  // Net worth when the fight began, and whether this fight counts only what
  // is gained from there (a gate the family has never beaten)
  startNetWorth: number
  countsGain: boolean
  // Time-limit multiplier from heir traits and advisors, fixed at the start
  timeMult: number
  // A quiet look at a boss the family may have outgrown: won at once, it's
  // waved through; otherwise it's called off as if it never started
  probe?: boolean
}

export function newTracker(gate: number, activeMs: number, timeMult = 1, startNetWorth = 0, countsGain = false): BossTracker {
  return {
    gate,
    startedActiveMs: activeMs,
    clickEarningsAtFullHustle: 0,
    earnedAfterTax: 0,
    polish: 0,
    purchases: 0,
    startNetWorth,
    countsGain,
    timeMult
  }
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

// Boss targets are fixed (spec: they never scale with the player's power);
// only the time limit can stretch, and it is fixed when the fight starts.
// countsGain: a gate the family has never beaten, where net worth bosses
// want what is gained during the fight rather than the total
export function conditionTarget(def: BossDef, countsGain = false): number {
  const c = def.condition
  switch (c.kind) {
    case 'netWorth':
    case 'netWorthWithinPar':
      return countsGain ? c.gain : c.target
    case 'ownAllRevealed':
      return countsGain ? c.gain : c.netWorth
    default:
      return c.target
  }
}

export function conditionTextFor(def: BossDef, countsGain: boolean): string {
  return countsGain && def.frontierConditionText ? def.frontierConditionText : def.conditionText
}

export function evaluateBoss(
  def: BossDef,
  t: BossTracker,
  s: BossSnapshot,
  activeMs: number
): BossEvaluation {
  const c = def.condition
  const target = conditionTarget(def, t.countsGain)
  let progress: number
  let won: boolean
  let bust = false
  // Net worth that counts: all of it, or only what this fight has added
  const worth = t.countsGain ? s.netWorth - t.startNetWorth : s.netWorth
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
      progress = ratio(worth, target)
      won = worth >= target
      break
    case 'netWorthWithinPar':
      bust = t.purchases > c.par
      progress = ratio(worth, target)
      won = !bust && worth >= target
      break
    case 'polish':
      progress = ratio(t.polish, target)
      won = t.polish >= target
      break
    case 'ownAllRevealed':
      won = s.allRevealedOwned && worth >= target
      progress = won ? 1 : Math.min(ratio(worth, target), 0.99)
      break
  }
  const timedOut = activeMs - t.startedActiveMs >= def.timeLimitSec * t.timeMult * 1000
  return { progress, won, lost: !won && (bust || timedOut) }
}

// Legacy paid on retiring: one point for each gate past the deepest gate the
// bloodline had already beaten. Repeating the family's best pays nothing.
export function legacyForRetiring(depth: number, bloodlineBest: number): number {
  return Math.max(0, Math.floor(depth) - Math.max(0, Math.floor(bloodlineBest)))
}
