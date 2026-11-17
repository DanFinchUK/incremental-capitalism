import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../src/stores/game'
import { createInitialSceneState, parseSavedState, serializeState } from '../src/engine/migration'
import { applyRoom } from '../src/utils/applyRoom'
import { ROOMS } from '../src/data/rooms'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'

describe('decor', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('follows the current class by default', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    expect(store.decor).toBe('auto')
    expect(store.activeRoom.id).toBe('bedsit')

    store.gatesBeaten = 6
    store.highestClassReached = 6
    expect(store.activeRoom.id).toBe('lounge')
  })

  it('keeps a pinned room the family has reached, even after a fresh start', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.gatesBeaten = 6
    store.highestClassReached = 6
    expect(store.unlockedRooms.map((r) => r.id)).toEqual(['bedsit', 'saloon', 'counties', 'lounge'])

    store.setDecor('saloon')
    expect(store.activeRoom.id).toBe('saloon')

    // A new heir starts back at the bottom; the pinned room stays
    store.gatesBeaten = 0
    expect(store.activeRoom.id).toBe('saloon')

    store.setDecor('auto')
    expect(store.activeRoom.id).toBe('bedsit')
  })

  it('keeps every room reached, and the chosen one, into the next dynasty', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.dynastyMs = 60_000
    store.highestClassReached = 6
    store.setDecor('counties')
    store.abandonDynasty(2000)
    expect(store.highestClassReached).toBe(0)
    expect(store.unlockedRooms.map((r) => r.id)).toEqual(['bedsit', 'saloon', 'counties', 'lounge'])
    expect(store.activeRoom.id).toBe('counties')
    // and through a save
    expect(parseSavedState(serializeState({ ...createInitialSceneState(), roomsReached: 6 })).roomsReached).toBe(6)
  })

  it('opens every room once a family has made Duke', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.hall = [{ surname: 'Old', finishedAt: 1, activeMs: 1, roll: [], scenario: 'standard' }]
    expect(store.unlockedRooms).toHaveLength(ROOMS.length)
  })

  it('refuses a room the family has never reached', () => {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.highestClassReached = 3
    store.setDecor('state')
    expect(store.decor).toBe('auto')
    expect(store.activeRoom.id).toBe('bedsit')
  })

  it('saves the choice and ignores unknown rooms', () => {
    const back = parseSavedState(serializeState({ ...createInitialSceneState(), decor: 'chalet' }))
    expect(back.decor).toBe('chalet')

    const bad = JSON.parse(serializeState(createInitialSceneState()))
    bad.scene.decor = 'penthouse'
    expect(parseSavedState(JSON.stringify(bad)).decor).toBe('auto')

    delete bad.scene.decor
    expect(parseSavedState(JSON.stringify(bad)).decor).toBe('auto')
  })

  it('dresses the page in the room\'s colours for the chosen scheme', () => {
    const el = document.createElement('div')
    const lounge = ROOMS.find((r) => r.id === 'lounge')!
    applyRoom(el, lounge, 'dark')
    expect(el.style.getPropertyValue('--color-bg')).toBe(lounge.dark.bg)
    expect(el.style.getPropertyValue('--color-accent')).toBe(lounge.dark.accent)
    expect(el.dataset.room).toBe('lounge')
    expect(el.dataset.ornament).toBe('stitched')
    expect(el.dataset.font).toBe('serif')

    applyRoom(el, lounge, 'light')
    expect(el.style.getPropertyValue('--color-bg')).toBe(lounge.light.bg)
  })
})

describe('the room on retiring', () => {
  it('stays put while the next heir is chosen, and moves when the keys are handed over', async () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(1_000_000)
    store.gatesBeaten = 3
    store.highestClassReached = 3
    // A class change settles before the room moves
    await new Promise((r) => setTimeout(r, 700))
    const before = document.documentElement.dataset.room
    expect(before).toBe(store.activeRoom.id)
    expect(store.retire(1_000_500)).toBe(true)
    await wrapper.vm.$nextTick()
    expect(store.heirChoices.length).toBeGreaterThan(0)
    // Class has reset, but the family hasn't moved out yet
    expect(store.activeRoom.id).not.toBe(before)
    expect(document.documentElement.dataset.room).toBe(before)
    store.pickHeir(0)
    await wrapper.vm.$nextTick()
    expect(document.documentElement.dataset.room).toBe(store.activeRoom.id)
    wrapper.unmount()
  })
})
