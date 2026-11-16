import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SFX_KINDS, playSfx, shepardVoices } from '../src/engine/audio'
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

  it('the tap climbs forever: every step rises, a full octave lands back where it began', () => {
    const level = (step: number) => shepardVoices(step).reduce((sum, v) => sum + v.weight, 0)
    for (let step = 0; step < 24; step++) {
      // Every tap is equally loud
      expect(level(step)).toBeCloseTo(1, 6)
      // Twelve semitone steps (one octave) give exactly the same sound
      expect(shepardVoices(step + 12)).toEqual(shepardVoices(step))
    }
    // At the wrap the top voice leaves and a new one enters at the bottom,
    // both close to silent, so the join can't be heard
    const last = shepardVoices(11)
    const first = shepardVoices(12)
    expect(last[last.length - 1].weight).toBeLessThan(0.01)
    expect(first[0].weight).toBe(0)
    // Within an octave every voice rises from one tap to the next
    for (let step = 0; step < 11; step++) {
      const now = shepardVoices(step)
      const next = shepardVoices(step + 1)
      now.forEach((v, i) => expect(next[i].freq).toBeGreaterThan(v.freq))
    }
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
