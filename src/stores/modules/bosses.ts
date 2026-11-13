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
  onBossWon: (gate: number, killMs: number) => void
  bestKillFor: (gate: number) => number | null
}

export interface BossModule {
  bossAttempt: Ref<BossTracker | null>
  bossCooldownUntilMs: Ref<number>
  twist: ComputedRef<TwistEffects>
  nextBoss: ComputedRef<BossView | null>
  startBossAttempt: () => boolean
  abandonBossAttempt: () => void
  evaluateAttempt: () => void
}

export function createBossModule(deps: BossModuleDeps): BossModule {
  // Neither is persisted: a reload abandons an attempt with no cooldown.
  const bossAttempt = ref<BossTracker | null>(null)
  const bossCooldownUntilMs = ref<number>(0)

  const attemptDef = computed(() => (bossAttempt.value ? bossForGate(bossAttempt.value.gate) : null))
  const twist = computed<TwistEffects>(() => (attemptDef.value ? combineTwists(attemptDef.value.twists) : NO_TWIST))

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
    const tracker = bossAttempt.value
    if (tracker && tracker.gate === gate) {
      const elapsedMs = activeMs - tracker.startedActiveMs
      return {
        ...base,
        status: 'active',
        progress: currentEvaluation(def, tracker).progress,
        remainingSec: Math.max(0, Math.ceil((def.timeLimitSec * 1000 - elapsedMs) / 1000))
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

  function startBossAttempt(): boolean {
    if (nextBoss.value?.status !== 'available') {
      return false
    }
    const def = nextBoss.value.def
    bossAttempt.value = newTracker(def.gate, deps.activeMs())
    deps.announce(`${def.title}: ${def.twistText}`)
    return true
  }

  function abandonBossAttempt(): void {
    bossAttempt.value = null
  }

  function evaluateAttempt(): void {
    const tracker = bossAttempt.value
    const def = attemptDef.value
    if (!tracker || !def) {
      return
    }
    const result = currentEvaluation(def, tracker)
    if (result.won) {
      const prevClass = deps.gatesBeaten.value
      const killMs = deps.activeMs() - tracker.startedActiveMs
      bossAttempt.value = null
      deps.gatesBeaten.value = def.gate
      if (!deps.handleClassPromotion(prevClass)) {
        deps.announce(`${def.title} beaten!`)
      }
      deps.onBossWon(def.gate, killMs)
    } else if (result.lost) {
      bossAttempt.value = null
      bossCooldownUntilMs.value = deps.activeMs() + def.cooldownSec * 1000
      deps.announce(`${def.title} got the better of you this time. Regroup and try again.`)
    }
  }

  return { bossAttempt, bossCooldownUntilMs, twist, nextBoss, startBossAttempt, abandonBossAttempt, evaluateAttempt }
}
