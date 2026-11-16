import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SFX_KINDS, SHEPARD_STEPS, isBossMusicPlaying, playSfx, setBossMusicIntensity, shepardVoices, startBossMusic, stopBossMusic } from '../src/engine/audio'
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

  it('boss music starts, builds and stops without audio, and never throws', () => {
    expect(() => {
      startBossMusic(0)
      setBossMusicIntensity(0.9)
      stopBossMusic()
      stopBossMusic()
    }).not.toThrow()
    expect(isBossMusicPlaying()).toBe(false)
  })

  it('the tap climbs forever: every step rises, a full octave lands back where it began', () => {
    const level = (step: number) => shepardVoices(step).reduce((sum, v) => sum + v.weight, 0)
    const n = SHEPARD_STEPS
    for (let step = 0; step < n * 2; step++) {
      // Every tap is about equally loud (the unplayed ninth voice is at most 3%)
      expect(level(step)).toBeGreaterThan(0.97)
      expect(level(step)).toBeLessThanOrEqual(1 + 1e-9)
      // A full octave of steps gives exactly the same sound
      expect(shepardVoices(step + n)).toEqual(shepardVoices(step))
    }
    // At the wrap the top voice leaves and a new one enters at the bottom,
    // both close to silent, so the join can't be heard; nothing played is
    // above hearing
    const last = shepardVoices(n - 1)
    const first = shepardVoices(n)
    expect(last[last.length - 1].weight).toBeLessThan(0.03)
    for (let step = 0; step < n; step++) for (const v of shepardVoices(step)) expect(v.freq).toBeLessThan(20000)
    expect(first[0].weight).toBe(0)
    // Within an octave every voice rises from one tap to the next
    for (let step = 0; step < n - 1; step++) {
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

  it('rings once as the next boss becomes available, and not again on dipping back under', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.tick(T0)
    store.sfxQueue.splice(0)
    const gateOpens = () => store.sfxQueue.filter((c) => c.kind === 'gateOpen').length
    store.addDebugMoney(gateThreshold(1) * 1.1, T0)
    store.tick(T0 + 100)
    expect(store.nextBoss?.status).toBe('available')
    expect(gateOpens()).toBe(1)
    // Spend below the line and earn back over it: no second bell
    store.money = 0
    store.tick(T0 + 200)
    expect(store.nextBoss?.status).toBe('locked')
    store.addDebugMoney(gateThreshold(1) * 1.1, T0 + 300)
    store.tick(T0 + 300)
    expect(gateOpens()).toBe(1)
  })

  it('stays quiet when a save loads with the boss already available', () => {
    const first = useGameStore()
    first.hydrateFromStorage(T0)
    first.closeIntro(T0)
    first.addDebugMoney(gateThreshold(1) * 1.1, T0)
    first.tick(T0)
    first.flushSave(T0)
    setActivePinia(createPinia())
    const store = useGameStore()
    store.hydrateFromStorage(T0 + 1000)
    store.tick(T0 + 1000)
    store.tick(T0 + 1100)
    expect(store.nextBoss?.status).toBe('available')
    expect(store.sfxQueue.some((c) => c.kind === 'gateOpen')).toBe(false)
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
