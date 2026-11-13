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

  it('prestige generations keep previously seen items available within the gate ceiling, while a new bloodline resets discovery', () => {
    const store = fresh()
    store.addDebugMoney(gateThresholdForTest(), T0)
    store.buyItem('jobs', JOBS[0].id, 1)
    store.buyItem('jobs', JOBS[1].id, 1)
    store.gatesBeaten = 2
    // Buy an item that sits above Gate 1's ceiling so it is seen, then retire
    const gate2Job = JOBS.find((j) => j.baseCost > store.costCeiling) ?? JOBS[12]
    store.seenItems.jobs[gate2Job.id] = true
    store.retire(T0 + 100)
    store.pickHeir(0)
    // Seen items under Gate 1's ceiling are immediately ready without rebuying earlier tiers
    expect(revealed(store.visibleJobs)).toContain(JOBS[0].id)
    expect(revealed(store.visibleJobs)).toContain(JOBS[1].id)
    expect(revealed(store.visibleJobs)).toContain(JOBS[2].id)
    // Items above Gate 1's ceiling remain gated behind the boss
    expect(revealed(store.visibleJobs)).not.toContain(gate2Job.id)

    // Starting a brand-new bloodline starts discovery afresh
    store.startNewBloodline(T0 + 200)
    expect(revealed(store.visibleJobs)).toEqual([JOBS[0].id])
  })
})

function gateThresholdForTest(): number {
  return 1e11
}
