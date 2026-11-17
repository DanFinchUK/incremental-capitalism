import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { BossDef } from '../../data/bosses'
import {
  NO_TWIST,
  bossForGate,
  combineTwists,
  evaluateBoss,
  gateThreshold,
  newTracker,
  type BossEvaluation,
  type BossTracker,
  type TwistEffects
} from '../../engine/bosses'

export type BossStatus = 'locked' | 'available' | 'active' | 'cooldown'

// How a boss attempt finished, for the play log
export interface AttemptEnded {
  gate: number
  result: 'won' | 'lost' | 'abandoned'
  ms: number
  progress: number
}

export interface BossView {
  def: BossDef
  status: BossStatus
  progress: number
  remainingSec: number
  cooldownSec: number
  bestKillMs: number | null
}

// What the boss module needs from the game store. Getters keep the module
// independent of the order the store declares things in.
export interface BossModuleDeps {
  gatesBeaten: Ref<number>
  netWorth: () => number
  activeMs: () => number
  allRevealedOwned: () => boolean
  handleClassPromotion: (prevClass: number) => boolean
  announce: (msg: string) => void
  // purchases: strokes taken, for the Golf achievement; outgrown: waved
  // through without a fight
  onBossWon: (gate: number, killMs: number, purchases: number, outgrown: boolean) => void
  onBossLost: (gate: number) => void
  bestKillFor: (gate: number) => number | null
  // Called whenever an attempt ends, however it ends
  onAttemptEnded: (ended: AttemptEnded) => void
  // Heir traits and advisors: longer fights (fixed at the start) and softer twists
  bossTimeMult: () => number
  // A gate the family has never beaten: net worth bosses count only the gain
  countsGain: (gate: number) => boolean
  twistStrength: () => number
}

// Abandoning in the first seconds is treated as a misclick and is free.
const FREE_ABANDON_MS = 10_000
// A boss the family has outgrown falls within this long of being looked at
export const OUTGROWN_MS = 1000
// Bosses won by earning during the fight can't be won in a second, so they
// count as outgrown when the look's pace would win within this long
export const OUTGROWN_PACE_MS = 5000
const EARNED_DURING_FIGHT = new Set(['clickEarningsAtFullHustle', 'earnedAfterTax', 'polish'])

export interface BossModule {
  bossAttempt: Ref<BossTracker | null>
  // The attempt, unless it's only a quiet look: a look happens out of sight,
  // with no twist, no clock on screen and nothing to back out of
  fight: ComputedRef<BossTracker | null>
  bossCooldownUntilMs: Ref<number>
  twist: ComputedRef<TwistEffects>
  nextBoss: ComputedRef<BossView | null>
  canBackOut: ComputedRef<boolean>
  backOutSec: ComputedRef<number>
  startBossAttempt: () => boolean
  // Look at the next boss quietly: it falls if outgrown, or nothing happened
  probeBoss: () => boolean
  abandonBossAttempt: () => void
  evaluateAttempt: () => void
}

export function createBossModule(deps: BossModuleDeps): BossModule {
  // Both are saved with the game (a quiet look isn't), so a reload carries on
  // with a fight and keeps the wait after backing out of one.
  const bossAttempt = ref<BossTracker | null>(null)
  const bossCooldownUntilMs = ref<number>(0)

  const fight = computed(() => (bossAttempt.value && !bossAttempt.value.probe ? bossAttempt.value : null))
  const attemptDef = computed(() => (bossAttempt.value ? bossForGate(bossAttempt.value.gate) : null))
  const twist = computed<TwistEffects>(() =>
    fight.value && attemptDef.value ? combineTwists(attemptDef.value.twists, deps.twistStrength()) : NO_TWIST
  )

  function currentEvaluation(def: BossDef, tracker: BossTracker): BossEvaluation {
    return evaluateBoss(
      def,
      tracker,
      { netWorth: deps.netWorth(), allRevealedOwned: deps.allRevealedOwned() },
      deps.activeMs()
    )
  }

  const nextBoss = computed<BossView | null>(() => {
    const gate = deps.gatesBeaten.value + 1
    const def = bossForGate(gate)
    if (!def) {
      return null
    }
    const activeMs = deps.activeMs()
    const base = { def, bestKillMs: deps.bestKillFor(gate), remainingSec: 0, cooldownSec: 0 }
    const tracker = fight.value
    if (tracker && tracker.gate === gate) {
      const elapsedMs = activeMs - tracker.startedActiveMs
      return {
        ...base,
        status: 'active',
        progress: currentEvaluation(def, tracker).progress,
        remainingSec: Math.max(0, Math.ceil((def.timeLimitSec * tracker.timeMult * 1000 - elapsedMs) / 1000))
      }
    }
    if (activeMs < bossCooldownUntilMs.value) {
      return {
        ...base,
        status: 'cooldown',
        progress: 0,
        cooldownSec: Math.ceil((bossCooldownUntilMs.value - activeMs) / 1000)
      }
    }
    const threshold = gateThreshold(gate)
    if (deps.netWorth() >= threshold) {
      return { ...base, status: 'available', progress: 0 }
    }
    return { ...base, status: 'locked', progress: Math.min(1, deps.netWorth() / threshold) }
  })

  const canBackOut = computed(() => {
    const tracker = fight.value
    if (!tracker || (tracker.ownPurchases ?? 0) > 0) return false
    return deps.activeMs() - tracker.startedActiveMs < FREE_ABANDON_MS
  })

  const backOutSec = computed(() => {
    const tracker = fight.value
    if (!tracker || (tracker.ownPurchases ?? 0) > 0) return 0
    return Math.max(0, Math.ceil((FREE_ABANDON_MS - (deps.activeMs() - tracker.startedActiveMs)) / 1000))
  })

  function startBossAttempt(): boolean {
    // Pressed during a quiet look: the look is dropped and a fight starts
    // afresh, with its own clock and the twist on from the first second
    if (bossAttempt.value?.probe) bossAttempt.value = null
    if (nextBoss.value?.status !== 'available') {
      return false
    }
    const def = nextBoss.value.def
    bossAttempt.value = newTracker(def.gate, deps.activeMs(), deps.bossTimeMult(), deps.netWorth(), deps.countsGain(def.gate))
    deps.announce(def.twistText ? `${def.title}: ${def.twistText}` : def.title)
    return true
  }

  function probeBoss(): boolean {
    if (nextBoss.value?.status !== 'available') return false
    const def = nextBoss.value.def
    bossAttempt.value = { ...newTracker(def.gate, deps.activeMs(), deps.bossTimeMult(), deps.netWorth(), deps.countsGain(def.gate)), probe: true }
    return true
  }

  function abandonBossAttempt(): void {
    const tracker = bossAttempt.value
    const def = attemptDef.value
    if (!tracker || !def) {
      return
    }
    const progress = currentEvaluation(def, tracker).progress
    bossAttempt.value = null
    deps.onAttemptEnded({ gate: def.gate, result: 'abandoned', ms: deps.activeMs() - tracker.startedActiveMs, progress })
  }

  function evaluateAttempt(): void {
    const tracker = bossAttempt.value
    const def = attemptDef.value
    if (!tracker || !def) {
      return
    }
    const result = currentEvaluation(def, tracker)
    const lookedMs = deps.activeMs() - tracker.startedActiveMs
    // A look at a boss won by earning: settled on pace once the look is up
    const outgrownOnPace =
      tracker.probe === true &&
      EARNED_DURING_FIGHT.has(def.condition.kind) &&
      lookedMs >= OUTGROWN_MS &&
      result.progress * (OUTGROWN_PACE_MS / lookedMs) >= 1
    // A look that didn't settle it: called off, no loss, no record
    if (tracker.probe && !result.won && !outgrownOnPace && (result.lost || lookedMs >= OUTGROWN_MS)) {
      bossAttempt.value = null
      return
    }
    if (result.won || outgrownOnPace) {
      const prevClass = deps.gatesBeaten.value
      const killMs = deps.activeMs() - tracker.startedActiveMs
      bossAttempt.value = null
      deps.gatesBeaten.value = def.gate
      if (!deps.handleClassPromotion(prevClass)) {
        deps.announce(`${def.title} beaten!`)
      }
      deps.onBossWon(def.gate, killMs, tracker.purchases, tracker.probe === true)
      deps.onAttemptEnded({ gate: def.gate, result: 'won', ms: killMs, progress: 1 })
    } else if (result.lost) {
      const elapsedMs = deps.activeMs() - tracker.startedActiveMs
      bossAttempt.value = null
      deps.onAttemptEnded({ gate: def.gate, result: 'lost', ms: elapsedMs, progress: result.progress })
      deps.onBossLost(def.gate)
    }
  }

  return { bossAttempt, fight, bossCooldownUntilMs, twist, nextBoss, canBackOut, backOutSec, startBossAttempt, probeBoss, abandonBossAttempt, evaluateAttempt }
}
