import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ClassModal from '../src/components/ClassModal.vue'
import HeadhunterOffer from '../src/components/HeadhunterOffer.vue'
import { ADVISORS_BY_ID } from '../src/data/advisors'
import MobileDock from '../src/components/MobileDock.vue'
import { parseSavedState, serializeState, STORAGE_KEY } from '../src/engine/migration'
import { gateThreshold } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'
import { VICTORY_LOCK_MS } from '../src/components/victoryLock'

const T0 = 1_000_000

function winGate(store: ReturnType<typeof useGameStore>, gate: number, t: number): number {
  store.addDebugMoney(gateThreshold(gate) * 2, t)
  store.jobsPurchased['21'] = 50
  store.tick(t)
  store.startBossAttempt()
  for (let i = 0; i < 200; i++) store.manualClick(t + 10 + i * 20)
  store.tick(t + 4500)
  store.closeClassModal()
  return t + 5000
}

describe('headhunter offers', () => {
  let pinia: ReturnType<typeof createPinia>

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function fresh() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    return store
  }

  it('every boss win earns a hire, and a second offer waits rather than replacing the first', () => {
    const store = fresh()
    winGate(store, 1, T0)
    const first = [...store.headhunterOffer]
    store.rollOffer()
    expect(store.headhunterOffer).toEqual(first)
    expect(store.queuedOffers).toBe(1)
    store.hireAdvisor(0)
    expect(store.headhunterOffer).toHaveLength(3)
    expect(store.queuedOffers).toBe(0)
  })

  it('the next boss waits until the headhunter offer is hired or passed', async () => {
    const store = fresh()
    const t = winGate(store, 1, T0)
    store.addDebugMoney(gateThreshold(2) * 2, t)
    store.tick(t)
    expect(store.nextBoss?.status).toBe('available')
    expect(store.mustHireFirst).toBe(true)
    expect(store.startBossAttempt()).toBe(false)
    const cashBefore = store.money
    expect(store.skipAdvisorOffer()).toBe(true)
    expect(store.money).toBe(cashBefore)
    expect(store.officeSeats.filter(Boolean)).toHaveLength(0)
    expect(store.mustHireFirst).toBe(false)
    expect(store.startBossAttempt()).toBe(true)
  })

  it('the victory screen stays open until you hire', () => {
    const store = fresh()
    store.addDebugMoney(gateThreshold(1) * 2, T0)
    store.jobsPurchased['21'] = 50
    store.tick(T0)
    store.startBossAttempt()
    for (let i = 0; i < 200; i++) store.manualClick(T0 + 10 + i * 20)
    store.tick(T0 + 4500)
    expect(store.classModalOpen).toBe(true)
    store.closeClassModal()
    expect(store.classModalOpen).toBe(true)
    store.hireAdvisor(0)
    store.closeClassModal()
    expect(store.classModalOpen).toBe(false)
  })

  it('with every seat taken, the required hire replaces someone', () => {
    const store = fresh()
    for (let i = 0; i < store.officeSeats.length; i++) {
      store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
      store.hireAdvisor(0)
    }
    store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
    expect(store.hireAdvisor(1, 0)).toBe(true)
    expect(store.officeSeats[0]?.advisorId).toBe('sommelier')
  })

  it('queued offers survive a reload', () => {
    const store = fresh()
    const t = winGate(store, 1, T0)
    store.rollOffer()
    store.flushSave(t)
    const loaded = parseSavedState(localStorage.getItem(STORAGE_KEY))
    expect(loaded.office.queued).toBe(1)
    expect(parseSavedState(serializeState({ ...loaded, office: { ...loaded.office, queued: -4 } })).office.queued).toBe(0)
  })

  it('the victory screen ignores taps for a moment, so fight taps cannot pick an advisor', async () => {
    vi.useFakeTimers()
    const store = fresh()
    const wrapper = mount(ClassModal, { global: { plugins: [pinia] } })
    store.addDebugMoney(gateThreshold(1) * 2, T0)
    store.jobsPurchased['21'] = 50
    store.tick(T0)
    store.startBossAttempt()
    for (let i = 0; i < 200; i++) store.manualClick(T0 + 10 + i * 20)
    store.tick(T0 + 4500)
    await wrapper.vm.$nextTick()
    const hire = () => wrapper.findAll('[data-testid="victory-headhunter"] [data-testid="hire-advisor"]')
    expect(hire().length).toBe(3)
    expect(hire()[0].attributes('disabled')).toBeDefined()
    await hire()[0].trigger('click')
    expect(store.officeSeats.filter(Boolean)).toHaveLength(0)
    vi.advanceTimersByTime(VICTORY_LOCK_MS)
    await wrapper.vm.$nextTick()
    expect(hire()[0].attributes('disabled')).toBeUndefined()
    await hire()[0].trigger('click')
    expect(store.officeSeats.filter(Boolean)).toHaveLength(1)
  })

  it('the victory screen lets you hire straight away', async () => {
    const store = fresh()
    store.addDebugMoney(gateThreshold(1) * 2, T0)
    store.jobsPurchased['21'] = 50
    store.tick(T0)
    store.startBossAttempt()
    for (let i = 0; i < 200; i++) store.manualClick(T0 + 10 + i * 20)
    store.tick(T0 + 4500)
    vi.useFakeTimers()
    const wrapper = mount(ClassModal, { global: { plugins: [pinia] } })
    vi.advanceTimersByTime(VICTORY_LOCK_MS)
    await wrapper.vm.$nextTick()
    const hire = wrapper.findAll('[data-testid="victory-headhunter"] [data-testid="hire-advisor"]')
    expect(hire.length).toBe(3)
    await hire[0].trigger('click')
    expect(store.officeSeats.filter(Boolean)).toHaveLength(1)
  })

  it('the Family & gates tab is flagged while an offer waits', async () => {
    const store = fresh()
    const dock = mount(MobileDock, { props: { tab: 'jobs' }, global: { plugins: [pinia] } })
    expect(dock.find('[data-testid="tab-family"] [data-testid="tab-hire"]').exists()).toBe(false)
    store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
    await dock.vm.$nextTick()
    expect(dock.find('[data-testid="tab-family"] [data-testid="tab-hire"]').exists()).toBe(true)
  })

  it('with the office full, shows what each seated advisor gives before you replace one', async () => {
    const store = fresh()
    for (const id of ['lobbyist', 'sommelier', 'accountant']) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    store.headhunterOffer = ['spin-doctor']
    const wrapper = mount(HeadhunterOffer, { global: { plugins: [pinia] } })
    // One Hire per candidate; with the office full it asks who makes way
    expect(wrapper.findAll('[data-testid="hire-advisor"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="seat-picker"]').exists()).toBe(false)
    await wrapper.find('[data-testid="hire-advisor"]').trigger('click')
    const picker = wrapper.find('[data-testid="seat-picker"]')
    const seated = store.officeSeats.map((seat) => ADVISORS_BY_ID[seat!.advisorId])
    for (const a of seated) {
      expect(picker.text()).toContain(a.name)
      expect(picker.text()).toContain(a.effectText)
    }
    const options = wrapper.findAll('[data-testid="replace-seat"]')
    expect(options).toHaveLength(3)
    await options[1].trigger('click')
    expect(store.officeSeats[1]!.advisorId).toBe('spin-doctor')
    expect(store.headhunterOffer).toHaveLength(0)
  })
})
