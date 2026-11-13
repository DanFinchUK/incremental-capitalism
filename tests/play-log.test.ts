import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  MAX_LOG_EVENTS,
  SESSION_GAP_MS,
  countTap,
  createPlayLog,
  logEvent,
  readPlayLog,
  touchSession
} from '../src/engine/playLog'
import { gateThreshold } from '../src/engine/bosses'
import { STORAGE_KEY } from '../src/engine/migration'
import { useGameStore } from '../src/stores/game'

describe('play log engine', () => {
  it('keeps only the newest events', () => {
    const log = createPlayLog()
    for (let i = 0; i < MAX_LOG_EVENTS + 5; i++) logEvent(log, { t: i, g: 1, a: i, e: 'buy' })
    expect(log.events).toHaveLength(MAX_LOG_EVENTS)
    expect(log.events[0].t).toBe(5)
  })

  it('buckets taps by generation and active minute, counting full-Hustle taps', () => {
    const log = createPlayLog()
    countTap(log, 1, 10_000, false)
    countTap(log, 1, 59_000, true)
    countTap(log, 1, 61_000, true)
    countTap(log, 2, 1_000, false)
    expect(log.minutes).toEqual([
      [1, 0, 2, 1, 0],
      [1, 1, 1, 1, 0],
      [2, 0, 1, 0, 0]
    ])
  })

  it('extends a session across short gaps and starts a new one after a long gap', () => {
    const log = createPlayLog()
    touchSession(log, 1000)
    touchSession(log, 2000)
    touchSession(log, 2000 + SESSION_GAP_MS + 1)
    expect(log.sessions).toEqual([
      [1000, 2000],
      [2000 + SESSION_GAP_MS + 1, 2000 + SESSION_GAP_MS + 1]
    ])
  })

  it('keeps one session when the clock steps back a little (a phone resyncing its time)', () => {
    const log = createPlayLog()
    touchSession(log, 10_000)
    touchSession(log, 12_333)
    touchSession(log, 10_000) // the clock stepped back 2.3s
    touchSession(log, 15_000)
    expect(log.sessions).toEqual([[10_000, 15_000]])
  })

  it('reads back what it wrote and survives junk', () => {
    const log = createPlayLog()
    touchSession(log, 5)
    countTap(log, 1, 0, true)
    logEvent(log, { t: 5, g: 1, a: 0, e: 'retire', gate: 2 })
    expect(readPlayLog(JSON.parse(JSON.stringify(log)))).toEqual(log)
    expect(readPlayLog('nonsense')).toEqual(createPlayLog())
    expect(readPlayLog({ sessions: [['x']], minutes: 3, events: [{ e: 7 }] })).toEqual(createPlayLog())
  })
})

describe('play log in the store', () => {
  const T0 = 1_000_000

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function fresh() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    return store
  }

  it('logs taps, manual buys and the session, and saves them', () => {
    const store = fresh()
    store.manualClick(T0 + 10)
    store.buyItem('jobs', '1')
    store.tick(T0 + 1000)
    expect(store.playLog.minutes[0][2]).toBe(1)
    expect(store.playLog.events.find((e) => e.e === 'buy')).toMatchObject({ kind: 'jobs', id: '1', n: 1 })
    expect(store.playLog.sessions).toHaveLength(1)
    // The game save stays small; the copied save carries the log
    store.flushSave(T0 + 1000)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).scene.playLog).toBeUndefined()
    const exported = JSON.parse(store.exportSave(T0 + 1000))
    expect(exported.scene.money).toBeTypeOf('number')
    expect(exported.scene.playLog.events.some((e: { e: string }) => e.e === 'buy')).toBe(true)
  })

  it('logs a gate opening, a boss attempt with samples, and how it ended', () => {
    const store = fresh()
    store.addDebugMoney(gateThreshold(1) * 1.1, T0)
    store.tick(T0 + 1000)
    expect(store.playLog.events.find((e) => e.e === 'gate-open')).toMatchObject({ gate: 1 })
    store.startBossAttempt()
    let t = T0 + 1000
    for (let i = 0; i < 12; i++) store.tick((t += 1000))
    store.abandonBossAttempt()
    const kinds = store.playLog.events.map((e) => e.e)
    expect(kinds).toContain('boss-start')
    expect(kinds.filter((k) => k === 'boss-sample').length).toBeGreaterThanOrEqual(2)
    store.spawnSpecificEvent('quantitativeEasing', t)
    store.claimMarketEvent(t + 100)
    expect(store.playLog.events.find((e) => e.e === 'event')).toMatchObject({ kind: 'quantitativeEasing', result: 'golden' })
    expect(store.playLog.events.find((e) => e.e === 'boss-end')).toMatchObject({ gate: 1, result: 'abandoned' })
  })

  it('keeps the log across retirement and reloads', () => {
    const store = fresh()
    store.manualClick(T0 + 10)
    store.gatesBeaten = 1
    store.retire(T0 + 100)
    expect(store.playLog.events.some((e) => e.e === 'retire')).toBe(true)
    store.flushAll(T0 + 200)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 300)
    expect(again.playLog.minutes[0][2]).toBe(1)
    expect(again.playLog.events.some((e) => e.e === 'retire')).toBe(true)
  })
})
