import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'
import { JOBS } from '../src/data/items'
import { UI_PARTS, partDue, readUiParts, type UiRevealState } from '../src/engine/uiParts'
import { createInitialSceneState, parseSavedState, serializeState } from '../src/engine/migration'
import { PROFILE_KEY, parseProfile } from '../src/engine/profile'

const T0 = 1_000_000

const START: UiRevealState = {
  generation: 1,
  legacyPoints: 0,
  gatesBeaten: 0,
  minRetireGate: 1,
  officeFilled: false,
  awardsHeld: 0,
  seenJobs: 1,
  seenBusinesses: 1,
  anyOwned: false,
  moneyPerSecond: 0
}

describe('parts of the screen a new player has no use for yet', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('none is due at the very start, and each comes with its use', () => {
    for (const p of UI_PARTS) expect(partDue(p, START)).toBe(false)
    expect(partDue('bulk', { ...START, anyOwned: true })).toBe(true)
    expect(partDue('tradingDesk', { ...START, moneyPerSecond: 1 })).toBe(true)
    expect(partDue('awards', { ...START, seenJobs: 5 })).toBe(true)
    expect(partDue('retire', { ...START, gatesBeaten: 1 })).toBe(true)
    expect(partDue('office', { ...START, gatesBeaten: 1 })).toBe(true)
    expect(partDue('network', { ...START, legacyPoints: 1 })).toBe(true)
    for (const p of UI_PARTS) expect(partDue(p, { ...START, generation: 2 })).toBe(p === 'awards' ? false : true)
  })

  it('saves and profiles from before keep everything on screen; a new game starts bare', () => {
    expect(createInitialSceneState().uiShown).toEqual([])
    const old = JSON.parse(serializeState(createInitialSceneState()))
    delete old.scene.uiShown
    expect(parseSavedState(JSON.stringify(old)).uiShown).toEqual([...UI_PARTS])
    expect(parseProfile(JSON.stringify({ playedMs: 1, achievements: [], settings: { muted: false } })).settings?.uiShown).toEqual([...UI_PARTS])
    expect(parseProfile(null).settings).toBeNull()
    expect(readUiParts(['office', 'nonsense', 'bulk'])).toEqual(['office', 'bulk'])
  })

  it('a fresh game hides them; buying something brings the bulk picker, and it stays', async () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    const store = useGameStore()
    store.closeIntro(T0)
    store.tick(T0)
    await wrapper.vm.$nextTick()
    for (const id of ['toggle-legacy-shop', 'open-family-tree', 'awards-pill', 'family-office', 'hero-legacy', 'toggle-trading-desk']) {
      expect(wrapper.find(`[data-testid="${id}"]`).exists(), id).toBe(false)
    }
    expect(wrapper.find('.scn-BulkGroup').exists()).toBe(false)
    expect(wrapper.find('[data-testid="hero-money"]').exists()).toBe(true)

    store.addDebugMoney(JOBS[0].baseCost * 2, T0)
    store.buyItem('jobs', JOBS[0].id)
    store.tick(T0 + 100)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.scn-BulkGroup').exists()).toBe(true)
    expect(store.uiShown).toContain('bulk')

    // Sold off, the picker still stays
    store.jobsPurchased = {}
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.scn-BulkGroup').exists()).toBe(true)
    wrapper.unmount()
  })

  it('what has been shown carries into a new bloodline and the profile', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.gatesBeaten = 1
    store.tick(T0)
    store.tick(T0 + 100)
    expect(store.uiShown).toEqual(expect.arrayContaining(['retire', 'office']))
    store.startNewBloodline(T0 + 200)
    expect(store.gatesBeaten).toBe(0)
    expect(store.shows('retire')).toBe(true)
    expect(store.shows('office')).toBe(true)
    store.flushSave(T0 + 300)
    expect(parseProfile(localStorage.getItem(PROFILE_KEY)).settings?.uiShown).toEqual(expect.arrayContaining(['retire', 'office']))
  })
})
