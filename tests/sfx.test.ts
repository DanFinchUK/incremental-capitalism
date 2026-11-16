import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SFX_KINDS, playSfx } from '../src/engine/audio'
import { gateThreshold } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('sound', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('has a distinct cue for each kind of moment, and none throws without audio', () => {
    expect(SFX_KINDS.length).toBeGreaterThanOrEqual(20)
    for (const k of SFX_KINDS) expect(() => playSfx(k, false, { intensity: 1, count: 5 })).not.toThrow()
  })

  it('the game raises cues as things happen: a boss fight, a hire, a pass, a perk', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.sfxQueue.splice(0)
    store.addDebugMoney(gateThreshold(1) * 1.1, T0)
    store.tick(T0)
    store.startBossAttempt()
    store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
    store.hireAdvisor(0)
    store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
    store.skipAdvisorOffer()
    store.legacyPoints = 2
    store.buyPerk('hustleCap')
    const kinds = store.sfxQueue.map((c) => c.kind)
    expect(kinds).toEqual(expect.arrayContaining(['bossStart', 'hire', 'pass', 'perk']))
  })

  it('never lets undelivered cues pile up', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    for (let i = 0; i < 30; i++) {
      store.headhunterOffer = ['accountant']
      store.skipAdvisorOffer()
    }
    expect(store.sfxQueue.length).toBeLessThanOrEqual(8)
  })
})
