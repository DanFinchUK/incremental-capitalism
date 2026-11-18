import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { gateThreshold } from '../src/engine/bosses'
import { readIndex, syncResident } from '../src/data/saveSlots'
import { PROFILE_KEY } from '../src/engine/profile'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

// An ordeal under way is seen through: once the moment to back out has
// passed, neither retiring nor leaving for another family gets out of it
describe('no way out of an ordeal', () => {
  beforeEach(() => {
    localStorage.clear()
    syncResident()
    setActivePinia(createPinia())
  })

  function midOrdeal() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.gatesBeaten = 1
    store.addDebugMoney(gateThreshold(2) * 1.1, T0)
    store.tick(T0 + 1000)
    store.startBossAttempt()
    return store
  }

  it('retiring waits until the ordeal is over', () => {
    const store = midOrdeal()
    expect(store.bossAttempt).not.toBeNull()
    expect(store.canRetire).toBe(false)
    expect(store.retire(T0 + 2000)).toBe(false)
    store.abandonBossAttempt()
    expect(store.canRetire).toBe(true)
  })

  it('an ordeal left for another family is still on when the family returns', () => {
    const store = midOrdeal()
    store.flushSave(T0 + 2000)
    const seat = readIndex().slots[0]
    // Ten minutes later, all of it spent playing another family
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY)!)
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, playedMs: (seat.playedAt ?? 0) + 600_000 }))
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 2000 + 600_000)
    expect(again.bossAttempt).not.toBeNull()
  })
})
