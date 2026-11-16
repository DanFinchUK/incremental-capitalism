import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { gateThreshold } from '../src/engine/bosses'
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

  it('a gate the family has never beaten is always fought', () => {
    const store = family(500, false)
    let t = T0
    for (let i = 0; i < 5; i++) store.tick((t += 100))
    expect(store.gatesBeaten).toBe(1)
    expect(store.bossAttempt).toBeNull()
  })
})
