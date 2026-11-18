import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../src/utils/reloadPage', () => ({ reloadPage: vi.fn() }))

import { MAX_SAVES, SAVES_KEY, addSlot, readIndex, removeSlot, setActiveSlot, slotPrefix } from '../src/data/saveSlots'
import { PROFILE_KEY, parseProfile } from '../src/engine/profile'
import { STORAGE_KEY, createInitialSceneState, serializeState } from '../src/engine/migration'
import { HALL_KEY } from '../src/engine/hall'
import { useGameStore } from '../src/stores/game'
import { reloadPage } from '../src/utils/reloadPage'

describe('save slots', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(reloadPage).mockClear()
  })

  it('starts from the saves already there: the original, and the ladder trial if played', () => {
    expect(readIndex().slots.map((s) => s.id)).toEqual(['main'])
    localStorage.setItem('trial:state', '{}')
    localStorage.setItem('ladderTrial', '1')
    const index = readIndex()
    expect(index.slots.map((s) => [s.id, s.tuning])).toEqual([
      ['main', 'classic'],
      ['trial', 'trial']
    ])
    expect(index.active).toBe('trial')
    // Which keep their keys
    expect(slotPrefix('main')).toBe('')
    expect(slotPrefix('trial')).toBe('trial:')
  })

  it('holds five families at most, and never removes the one in play', () => {
    for (let i = 1; i < MAX_SAVES; i++) expect(addSlot('classic', i)).not.toBeNull()
    expect(addSlot('trial')).toBeNull()
    expect(removeSlot('main')).toBe(false)
    localStorage.setItem('slot-2:state', '{}')
    expect(removeSlot('slot-2')).toBe(true)
    expect(localStorage.getItem('slot-2:state')).toBeNull()
    expect(readIndex().slots).toHaveLength(MAX_SAVES - 1)
    expect(setActiveSlot('nope')).toBe(false)
  })
})

describe('save slots in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(reloadPage).mockClear()
    setActivePinia(createPinia())
  })

  it('shares achievements and settings through the profile, and notes the family for the menu', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ achievements: ['side-hustle'], settings: { muted: true, decor: 'auto', bulkBuyMode: 10 } }))
    localStorage.setItem(STORAGE_KEY, serializeState({ ...createInitialSceneState(), achievements: ['entrepreneur'], familySurname: 'Test', muted: false }))
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    // Earned in another family, and in this one
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

  it('starts, plays and imports families in places of their own, reloading into them', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    expect(store.newSave('trial', 2000)).toBe(true)
    expect(reloadPage).toHaveBeenCalledTimes(1)
    const index = readIndex()
    expect(index.slots.map((s) => [s.id, s.tuning])).toEqual([
      ['main', 'classic'],
      ['slot-2', 'trial']
    ])
    expect(index.active).toBe('slot-2')

    // A downloaded save keeps its tuning; its play log goes back in its own place
    const exported = JSON.stringify({ schemaVersion: 8, tuning: 'trial', scene: { ...createInitialSceneState(), familySurname: 'Imported', playLog: { sessions: [], minutes: [], events: [] } } })
    expect(store.importSave(exported, 3000)).toBe('ok')
    expect(readIndex().slots.at(-1)).toMatchObject({ id: 'slot-3', tuning: 'trial' })
    expect(JSON.parse(localStorage.getItem('slot-3:state')!).scene.playLog).toBeUndefined()
    expect(localStorage.getItem('slot-3:playLog')).not.toBeNull()
    expect(store.importSave('not a save')).toBe('invalid')

    // The family started in slot-2 never began, so it made way
    expect(readIndex().slots.map((s) => s.id)).toEqual(['main', 'slot-3'])
    // (This page still has 'main' in play, so playing it again does nothing)
    store.playSave('slot-3')
    expect(readIndex().active).toBe('slot-3')
    expect(reloadPage).toHaveBeenCalledTimes(3)
  })

  it('names a seat from its own save, and clears away families that never began', () => {
    const slots = [
      { id: 'main', tuning: 'classic', createdAt: 0, lastPlayed: 0, summary: null },
      // A run from before seats: no summary yet, a real family in its save
      { id: 'trial', tuning: 'trial', createdAt: 0, lastPlayed: 0, summary: null },
      // Started from the Families page and left at the register
      { id: 'slot-3', tuning: 'trial', createdAt: 5, lastPlayed: 0, summary: null },
      // Started there too, and played a little: it stays
      { id: 'slot-4', tuning: 'classic', createdAt: 6, lastPlayed: 0, summary: null }
    ]
    localStorage.setItem(SAVES_KEY, JSON.stringify({ active: 'main', slots }))
    localStorage.setItem('trial:state', serializeState({ ...createInitialSceneState(), familySurname: 'Carrington-Rees', dynastyMs: 1_049_376 }))
    localStorage.setItem('slot-3:state', serializeState(createInitialSceneState()))
    localStorage.setItem('slot-4:state', serializeState({ ...createInitialSceneState(), lifetimeEarned: 50 }))
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    expect(store.saveIndex.slots.map((s) => s.id)).toEqual(['main', 'trial', 'slot-4'])
    expect(store.saveIndex.slots[1].summary).toMatchObject({ surname: 'Carrington-Rees', fresh: false })
    expect(localStorage.getItem('slot-3:state')).toBeNull()
  })

  it('never loses a save from before seats: an unlisted one gets its seat back, and an old file asks its ladder', () => {
    // A ladder trial save that no seat lists
    localStorage.setItem(SAVES_KEY, JSON.stringify({ active: 'main', slots: [{ id: 'main', tuning: 'classic', createdAt: 0, lastPlayed: 0, summary: null }] }))
    localStorage.setItem('trial:state', serializeState({ ...createInitialSceneState(), familySurname: 'Carrington-Rees', dynastyMs: 1_049_376 }))
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    expect(store.saveIndex.slots.map((s) => [s.id, s.tuning])).toEqual([
      ['main', 'classic'],
      ['trial', 'trial']
    ])
    expect(store.saveIndex.slots[1].summary?.surname).toBe('Carrington-Rees')

    // A file downloaded before seats doesn't say its ladder
    const old = JSON.stringify({ schemaVersion: 8, scene: { ...createInitialSceneState(), familySurname: 'Old File', lifetimeEarned: 9 } })
    expect(store.importSave(old, 2000)).toBe('ladder')
    expect(store.importSave(old, 2000, 'trial')).toBe('ok')
    expect(readIndex().slots.at(-1)).toMatchObject({ tuning: 'trial' })
  })

  it('downloads any family, not only the one in play, with its play log and tuning', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    const slot = addSlot('trial', 2000)!
    localStorage.setItem(slotPrefix(slot.id) + 'state', serializeState({ ...createInitialSceneState(), familySurname: 'Elsewhere', generation: 4 }))
    localStorage.setItem(slotPrefix(slot.id) + 'playLog', JSON.stringify({ sessions: [[1, 2]], minutes: [], events: [] }))
    const saved = store.exportSlot(slot.id)!
    const parsed = JSON.parse(saved.json)
    expect(parsed.tuning).toBe('trial')
    expect(parsed.scene.familySurname).toBe('Elsewhere')
    expect(parsed.scene.playLog.sessions).toEqual([[1, 2]])
    // and back in, as a family of its own
    expect(store.importSave(saved.json, 3000)).toBe('ok')
    expect(readIndex().slots.at(-1)?.tuning).toBe('trial')
    expect(store.exportSlot('nope')).toBeNull()
  })

  it('folds the ladder trial\'s own Hall into the shared one', () => {
    const record = { surname: 'Trialled', finishedAt: 5, activeMs: 1, roll: [], scenario: 'standard' }
    localStorage.setItem('trial:hall', JSON.stringify([record]))
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    expect(store.hall.map((d) => d.surname)).toEqual(['Trialled'])
    expect(localStorage.getItem('trial:hall')).toBeNull()
    expect(JSON.parse(localStorage.getItem(HALL_KEY)!)).toHaveLength(1)
    expect(localStorage.getItem(SAVES_KEY)).not.toBeNull()
  })
})
