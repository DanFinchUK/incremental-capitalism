import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BUSINESSES, JOBS } from '../src/data/items'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

const revealed = (rows: ReadonlyArray<{ mode: string; item?: { id: string } }>) =>
  rows.filter((r) => r.mode === 'revealed').map((r) => r.item!.id)

describe('items reveal one at a time, by buying the one before', () => {
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

  it('a new game shows only the first job and first business, with a teaser after each', () => {
    const store = fresh()
    store.tick(T0 + 1000)
    expect(revealed(store.visibleJobs)).toEqual([JOBS[0].id])
    expect(revealed(store.visibleBusinesses)).toEqual([BUSINESSES[0].id])
    expect(store.visibleJobs[1].mode).toBe('teaser')
  })

  it('cash alone reveals nothing more', () => {
    const store = fresh()
    store.addDebugMoney(1e7, T0)
    store.tick(T0 + 1000)
    expect(revealed(store.visibleJobs)).toEqual([JOBS[0].id])
    expect(revealed(store.visibleBusinesses)).toEqual([BUSINESSES[0].id])
  })

  it('buying one of an item reveals the next in the same list only', () => {
    const store = fresh()
    store.addDebugMoney(1e7, T0)
    store.buyItem('jobs', JOBS[0].id, 1)
    expect(revealed(store.visibleJobs)).toEqual([JOBS[0].id, JOBS[1].id])
    expect(revealed(store.visibleBusinesses)).toEqual([BUSINESSES[0].id])
    store.buyItem('businesses', BUSINESSES[0].id, 1)
    expect(revealed(store.visibleBusinesses)).toEqual([BUSINESSES[0].id, BUSINESSES[1].id])
  })

  it('a new generation starts the climb again', () => {
    const store = fresh()
    store.addDebugMoney(1e7, T0)
    store.buyItem('jobs', JOBS[0].id, 1)
    store.buyItem('jobs', JOBS[1].id, 1)
    store.gatesBeaten = 1
    store.retire(T0 + 100)
    store.pickHeir(0)
    expect(revealed(store.visibleJobs)).toEqual([JOBS[0].id])
  })
})
