import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../src/stores/game'
import { hireEstateManager } from './helpers'

const T0 = 1_000_000

function fresh() {
  const store = useGameStore()
  store.hydrateFromStorage(T0)
  store.closeIntro(T0)
  store.businessesOwned['1'] = 2
  store.money = 10_000
  return store
}

describe('freezes when the family has no automation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('a lost shady deal halves income instead of freezing automation nobody has', () => {
    const store = fresh()
    store.spawnSpecificEvent('shadyDeal', T0)
    expect(store.claimMarketEvent(T0 + 100, () => 0.9)).toBe('shadyFreeze')
    expect(store.money).toBe(10_000)
    expect(store.incomePenalty).toMatchObject({ mult: 0.5 })
  })

  it('a scandal freeze halves income without automation', () => {
    const store = fresh()
    store.spawnSpecificEvent('nonDomQuestioned', T0)
    store.claimMarketEvent(T0 + 100, () => 0.9, 0) // move it all offshore: windfall and a freeze
    expect(store.incomePenalty).toMatchObject({ mult: 0.5 })
  })

  it('with automation hired, a freeze pauses automation and leaves income alone', () => {
    const store = fresh()
    hireEstateManager(store)
    store.spawnSpecificEvent('shadyDeal', T0)
    store.claimMarketEvent(T0 + 100, () => 0.9)
    expect(store.isAutoBuyFrozen).toBe(true)
    expect(store.incomePenalty).toBeNull()
  })
})
