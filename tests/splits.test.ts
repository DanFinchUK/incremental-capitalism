import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { emptySplits, mergeBests, splitDelta, withSplit } from '../src/engine/splits'
import { gateThreshold, legacyForDepth } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const nulls = (n: number) => Array(n).fill(null)

describe('split helpers', () => {
  it('builds, records and merges splits per gate', () => {
    expect(emptySplits()).toEqual(nulls(10))
    expect(withSplit(emptySplits(), 2, 9000)).toEqual([null, null, 9000, ...nulls(7)])
    expect(mergeBests([null, 5000, 9000, ...nulls(7)], [null, 4000, 9500, ...nulls(7)])).toEqual([null, 4000, 9000, ...nulls(7)])
    expect(mergeBests(emptySplits(), [null, 4000, ...nulls(8)])).toEqual([null, 4000, ...nulls(8)])
    expect(splitDelta(4000, 5000)).toBe(-1000)
    expect(splitDelta(4000, null)).toBeNull()
    expect(splitDelta(null, 5000)).toBeNull()
  })
})

const T0 = 1_000_000

// Beat the next gate by forcing a win: unlock, start, then meet its condition.
function beatNextGate(store: ReturnType<typeof useGameStore>, t: number): number {
  const gate = store.gatesBeaten + 1
  store.addDebugMoney(gateThreshold(gate) * 10, t)
  store.startBossAttempt()
  const attempt = store.bossAttempt!
  attempt.clickEarningsAtFullHustle = 1e300
  attempt.earnedAfterTax = 1e300
  attempt.polish = 1e300
  store.tick(t + 1000)
  return t + 1000
}

describe('Legacy by depth and retirement', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('cannot retire before beating a gate', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.addDebugMoney(1e15, T0)
    expect(store.legacyOnRetire).toBe(0)
    expect(store.retire(T0)).toBe(false)
    expect(store.legacyPoints).toBe(0)
  })

  it('pays Legacy for the deepest gate and starts a fresh generation', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.tick(T0)
    let t = T0
    for (let i = 0; i < 3; i++) t = beatNextGate(store, t)
    expect(store.gatesBeaten).toBe(3)
    expect(store.legacyOnRetire).toBe(legacyForDepth(3))
    expect(store.splits[1]).not.toBeNull()
    expect(store.splits[3]).toBe(store.activeGenerationMs)
    const best = [...store.bestSplits]
    expect(best[3]).toBe(store.splits[3])

    expect(store.retire(t)).toBe(true)
    expect(store.legacyPoints).toBe(legacyForDepth(3))
    expect(store.gatesBeaten).toBe(0)
    expect(store.activeGenerationMs).toBe(0)
    expect(store.splits).toEqual(nulls(10))
    expect(store.lastKillMs).toEqual(nulls(10))
    expect(store.bestSplits).toEqual(best)
    expect(store.money).toBeGreaterThan(0) // the heir's trust fund
    expect(store.classStatus.current.level).toBe(0)
  })

  it('records kill time per boss and keeps the best', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.tick(T0)
    store.addDebugMoney(gateThreshold(1) * 10, T0)
    store.startBossAttempt()
    let t = T0
    for (let i = 0; i < 4; i++) store.tick((t += 1000))
    store.bossAttempt!.clickEarningsAtFullHustle = 1e300
    store.tick((t += 1000))
    expect(store.lastKillMs[1]).toBe(5000)
    expect(store.bestKillMs[1]).toBe(5000)
    expect(store.nextBoss!.def.gate).toBe(2)
    store.retire(t)

    store.tick((t += 1000))
    store.addDebugMoney(gateThreshold(1) * 10, t)
    store.startBossAttempt()
    store.bossAttempt!.clickEarningsAtFullHustle = 1e300
    store.tick((t += 1000))
    expect(store.lastKillMs[1]).toBe(1000)
    expect(store.bestKillMs[1]).toBe(1000)
  })

  it('persists splits, bests and kill times', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.tick(T0)
    beatNextGate(store, T0)
    store.flushSave(T0 + 2000)
    const saved = { splits: [...store.splits], bestKillMs: [...store.bestKillMs] }
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 2000)
    expect(again.splits).toEqual(saved.splits)
    expect(again.bestKillMs).toEqual(saved.bestKillMs)
    expect(again.nextBoss!.bestKillMs).toBeNull() // gate 2 never killed
  })
})
