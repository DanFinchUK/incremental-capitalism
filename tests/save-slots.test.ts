import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../src/utils/reloadPage', () => ({ reloadPage: vi.fn() }))

import { MAX_SAVES, SAVES_KEY, claimSeat, readIndex, removeSlot, residentSlotId, slotPrefix, syncResident } from '../src/data/saveSlots'
import { PROFILE_KEY, parseProfile } from '../src/engine/profile'
import { createInitialSceneState, serializeState } from '../src/engine/migration'
import { HALL_KEY } from '../src/engine/hall'
import { useGameStore } from '../src/stores/game'
import { reloadPage } from '../src/utils/reloadPage'

const played = (extra: Record<string, unknown> = {}) => serializeState({ ...createInitialSceneState(), lifetimeEarned: 100, ...extra })

function fresh() {
  setActivePinia(createPinia())
  const store = useGameStore()
  store.hydrateFromStorage(1000)
  return store
}

describe('save slots', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(reloadPage).mockClear()
    syncResident()
  })

  it('takes no seat for a player who has never begun a family', () => {
    expect(readIndex()).toMatchObject({ active: null, slots: [] })
  })

  it('starts from the saves already there: the original, and the ladder trial if it was played', () => {
    localStorage.setItem('state', played())
    localStorage.setItem('trial:state', played())
    localStorage.setItem('ladderTrial', '1')
    const index = readIndex()
    expect(index.slots.map((s) => [s.id, s.tuning])).toEqual([
      ['main', 'classic'],
      ['trial', 'trial']
    ])
    expect(index.active).toBe('trial')
    expect(slotPrefix('main')).toBe('')
    expect(slotPrefix('trial')).toBe('trial:')
  })

  it('lets go of seats the first version of seats filled with families that never began', () => {
    const slot = (id: string) => ({ id, tuning: 'classic', createdAt: 1, lastPlayed: 1, summary: null })
    localStorage.setItem(SAVES_KEY, JSON.stringify({ active: 'slot-2', slots: [slot('main'), slot('slot-2'), slot('slot-3')] }))
    localStorage.setItem('state', serializeState(createInitialSceneState()))
    localStorage.setItem('slot-2:state', serializeState(createInitialSceneState()))
    localStorage.setItem('slot-3:state', played())
    const index = readIndex()
    expect(index.slots.map((s) => s.id)).toEqual(['slot-3'])
    expect(index.active).toBeNull()
    expect(localStorage.getItem('slot-2:state')).toBeNull()
  })

  it('holds five families at most, and freeing the one in residence leaves none', () => {
    for (let i = 0; i < MAX_SAVES; i++) expect(claimSeat('classic', i)).not.toBeNull()
    expect(claimSeat('trial')).toBeNull()
    const resident = residentSlotId()!
    expect(removeSlot(resident)).toBe(true)
    expect(residentSlotId()).toBeNull()
    expect(readIndex()).toMatchObject({ active: null })
    expect(readIndex().slots).toHaveLength(MAX_SAVES - 1)
  })
})

describe('save slots in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(reloadPage).mockClear()
  })

  it('shares achievements and settings through the profile, and notes the family for the menu', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ achievements: ['side-hustle'], settings: { muted: true, decor: 'auto', bulkBuyMode: 10 } }))
    localStorage.setItem('state', played({ achievements: ['entrepreneur'], familySurname: 'Test', muted: false }))
    const store = fresh()
    expect([...store.achievements].sort()).toEqual(['entrepreneur', 'side-hustle'])
    expect(store.muted).toBe(true)
    expect(store.bulkBuyMode).toBe(10)
    store.toggleMute()
    store.flushSave(2000)
    const profile = parseProfile(localStorage.getItem(PROFILE_KEY))
    expect(profile.achievements.sort()).toEqual(['entrepreneur', 'side-hustle'])
    expect(profile.settings?.muted).toBe(false)
    expect(readIndex().slots[0].summary).toMatchObject({ surname: 'Test', generation: 1 })
  })

  it('a family takes a seat when written into the register, and abandoning it frees the seat', () => {
    const store = fresh()
    expect(store.hasFamily).toBe(false)
    store.flushSave(1500)
    expect(localStorage.getItem('state')).toBeNull()
    store.beginNewFamily('standard', 'classic', 2000)
    expect(store.census).not.toBeNull()
    expect(store.saveIndex.slots).toHaveLength(0)
    store.closeCensus(3000)
    expect(store.hasFamily).toBe(true)
    expect(store.saveIndex.slots.map((s) => s.id)).toEqual(['main'])
    const surname = store.familySurname

    store.abandonDynasty(4000)
    expect(store.hasFamily).toBe(false)
    expect(store.saveIndex.slots).toHaveLength(0)
    expect(localStorage.getItem('state')).toBeNull()
    // The next family's register strikes this one off
    store.beginNewFamily('standard', 'classic', 5000)
    expect(store.census).toEqual({ previous: surname, departure: 'abandoned' })
  })

  it('beginning a family with one in residence leaves it, the next family waiting across the reload', () => {
    localStorage.setItem('state', played())
    const store = fresh()
    expect(store.hasFamily).toBe(true)
    store.beginNewFamily('standard', 'trial', 2000)
    expect(reloadPage).toHaveBeenCalledTimes(1)
    expect(readIndex()).toMatchObject({ active: null, next: { tuning: 'trial', scenario: 'standard' } })
    // The family it left keeps its seat
    expect(readIndex().slots.map((s) => s.id)).toEqual(['main'])
  })

  it('plays and imports families in seats of their own, reloading into them', () => {
    localStorage.setItem('state', played())
    localStorage.setItem('slot-2:state', played({ familySurname: 'Second' }))
    localStorage.setItem(
      SAVES_KEY,
      JSON.stringify({
        version: 2,
        active: 'main',
        slots: [
          { id: 'main', tuning: 'classic', createdAt: 1, lastPlayed: 1, summary: null },
          { id: 'slot-2', tuning: 'trial', createdAt: 1, lastPlayed: 1, summary: null }
        ]
      })
    )
    const store = fresh()
    store.playSave('slot-2')
    expect(readIndex().active).toBe('slot-2')
    expect(reloadPage).toHaveBeenCalledTimes(1)

    const exported = JSON.stringify({ schemaVersion: 8, tuning: 'trial', scene: { ...createInitialSceneState(), familySurname: 'Imported', playLog: { sessions: [], minutes: [], events: [] } } })
    expect(store.importSave(exported, 3000)).toBe('ok')
    expect(readIndex().slots.at(-1)).toMatchObject({ id: 'slot-3', tuning: 'trial' })
    expect(JSON.parse(localStorage.getItem('slot-3:state')!).scene.playLog).toBeUndefined()
    expect(localStorage.getItem('slot-3:playLog')).not.toBeNull()
    expect(store.importSave('not a save')).toBe('invalid')
  })

  it('names a seat from its own save', () => {
    localStorage.setItem('state', played())
    localStorage.setItem('trial:state', played({ familySurname: 'Carrington-Rees', dynastyMs: 1_049_376 }))
    const store = fresh()
    expect(store.saveIndex.slots.map((s) => s.id)).toEqual(['main', 'trial'])
    expect(store.saveIndex.slots[1].summary).toMatchObject({ surname: 'Carrington-Rees', fresh: false })
  })

  it('never loses a save from before seats: an unlisted one gets its seat back, and an old file asks its tuning', () => {
    localStorage.setItem(SAVES_KEY, JSON.stringify({ version: 2, active: null, slots: [] }))
    localStorage.setItem('trial:state', played({ familySurname: 'Carrington-Rees', dynastyMs: 1_049_376 }))
    const store = fresh()
    expect(store.saveIndex.slots.map((s) => [s.id, s.tuning])).toEqual([['trial', 'trial']])
    expect(store.saveIndex.slots[0].summary?.surname).toBe('Carrington-Rees')

    const old = JSON.stringify({ schemaVersion: 8, scene: { ...createInitialSceneState(), familySurname: 'Old File', lifetimeEarned: 9 } })
    expect(store.importSave(old, 2000)).toBe('ladder')
    expect(store.importSave(old, 2000, 'trial')).toBe('ok')
    expect(readIndex().slots.at(-1)).toMatchObject({ tuning: 'trial' })
  })

  it('counts a family\'s time away without what was played in other families meanwhile', () => {
    // Left an hour ago (with businesses running); 40 minutes since then were spent in other families
    const hour = 3_600_000
    localStorage.setItem('state', serializeState({ ...createInitialSceneState(), lifetimeEarned: 100, businessesOwned: { '1': 10 }, introSeen: true, lastUpdate: 1000 }))
    localStorage.setItem(
      SAVES_KEY,
      JSON.stringify({ version: 2, active: 'main', slots: [{ id: 'main', tuning: 'classic', createdAt: 1, lastPlayed: 1, summary: null, playedAt: 5_000_000 }] })
    )
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ playedMs: 5_000_000 + 40 * 60_000, achievements: [] }))
    setActivePinia(createPinia())
    const store = useGameStore()
    store.hydrateFromStorage(1000 + hour)
    expect(store.offlineReport?.secondsCredited).toBeCloseTo(20 * 60, 0)
  })

  it('downloads any family, not only the one in residence, with its play log and tuning', () => {
    localStorage.setItem('state', played())
    localStorage.setItem('trial:state', played({ familySurname: 'Elsewhere', generation: 4 }))
    localStorage.setItem('trial:playLog', JSON.stringify({ sessions: [[1, 2]], minutes: [], events: [] }))
    const store = fresh()
    const saved = store.exportSlot('trial')!
    const parsed = JSON.parse(saved.json)
    expect(parsed.tuning).toBe('trial')
    expect(parsed.scene.familySurname).toBe('Elsewhere')
    expect(parsed.scene.playLog.sessions).toEqual([[1, 2]])
    expect(store.exportSlot('nope')).toBeNull()
  })

  it('folds the ladder trial\'s own Hall into the shared one', () => {
    const record = { surname: 'Trialled', finishedAt: 5, activeMs: 1, roll: [], scenario: 'standard' }
    localStorage.setItem('trial:hall', JSON.stringify([record]))
    const store = fresh()
    expect(store.hall.map((d) => d.surname)).toEqual(['Trialled'])
    expect(localStorage.getItem('trial:hall')).toBeNull()
    expect(JSON.parse(localStorage.getItem(HALL_KEY)!)).toHaveLength(1)
  })
})
