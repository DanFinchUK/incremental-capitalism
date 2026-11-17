import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { bossForGate, conditionTarget, gateThreshold } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

// A family at gate 1 that has beaten gate 2 in an earlier generation
function family(businesses: number, beatenBefore = true) {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  store.gatesBeaten = 1
  store.highestClassReached = 9
  store.bestKillMs = store.bestKillMs.map((v, g) => (g === 2 && beatenBefore ? 40_000 : v))
  store.addDebugMoney(gateThreshold(2) * 1.1, T0)
  store.businessesOwned = { '20': businesses }
  // Generations of Legacy: income far beyond this gate
  if (businesses > 0) store.legacyPoints = 60
  store.tick(T0)
  return store
}

describe('outgrown bosses', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('a boss the family has outgrown falls by itself, with no shortlist', () => {
    const store = family(500)
    let t = T0
    for (let i = 0; i < 3; i++) store.tick((t += 100))
    expect(store.gatesBeaten).toBeGreaterThanOrEqual(2)
    expect(store.bannerMessage ?? '').toContain('waved you through')
    expect(store.headhunterOffer).toHaveLength(0)
    expect(store.disgraceReport).toBeNull()
  })

  it('a boss still worth fighting is left alone, with no loss and no record', () => {
    const store = family(0)
    let t = T0
    for (let i = 0; i < 20; i++) store.tick((t += 100))
    expect(store.gatesBeaten).toBe(1)
    expect(store.bossAttempt).toBeNull()
    expect(store.disgraceReport).toBeNull()
    expect(store.nextBoss?.status).toBe('available')
    // The player can take it on as usual
    expect(store.startBossAttempt()).toBe(true)
    expect(store.bossAttempt?.probe).toBeFalsy()
  })

  it('the quiet look happens out of sight: no fight on screen, no twist, nothing to back out of', () => {
    const store = family(0)
    store.tick(T0 + 100)
    // Mid-look: the family hasn't outgrown it, and the look hasn't been called off yet
    expect(store.bossAttempt?.probe).toBe(true)
    expect(store.nextBoss?.status).toBe('available')
    expect(store.canBackOut).toBe(false)
    expect(store.twist.incomeTaxRate).toBe(0)
    expect(store.twist.automationPaused).toBe(false)
  })

  it('a boss won by earning is waved through when the look shows it would fall within a few seconds', () => {
    // Gate 2: earn the target after rent. A second's earnings can't reach it,
    // but at this pace it would fall in under five seconds
    const target = conditionTarget(bossForGate(2)!, false)
    const quick = family(0)
    quick.tick(T0 + 100)
    expect(quick.bossAttempt?.probe).toBe(true)
    quick.addDebugMoney(target * 0.3, T0 + 500)
    quick.tick(T0 + 1200)
    expect(quick.gatesBeaten).toBe(2)
    expect(quick.bannerMessage ?? '').toContain('waved you through')
  })

  it('but left to the player when the pace would take longer', () => {
    const target = conditionTarget(bossForGate(2)!, false)
    const slow = family(0)
    slow.tick(T0 + 100)
    slow.addDebugMoney(target * 0.1, T0 + 500)
    slow.tick(T0 + 1200)
    expect(slow.gatesBeaten).toBe(1)
    expect(slow.bossAttempt).toBeNull()
    expect(slow.disgraceReport).toBeNull()
  })

  it('a gate the family has never beaten is always fought', () => {
    const store = family(500, false)
    let t = T0
    for (let i = 0; i < 5; i++) store.tick((t += 100))
    expect(store.gatesBeaten).toBe(1)
    expect(store.bossAttempt).toBeNull()
  })
})
