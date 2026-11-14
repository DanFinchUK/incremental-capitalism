import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import MobileDock from '../src/components/MobileDock.vue'
import ClassModal from '../src/components/ClassModal.vue'
import { gateThreshold, legacyForRetiring } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('retiring is visible on a phone', () => {
  let pinia: ReturnType<typeof createPinia>

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

  it('the dock offers Retire with its Legacy once a gate is beaten', async () => {
    const store = fresh()
    const dock = mount(MobileDock, { props: { tab: 'jobs' }, global: { plugins: [pinia] } })
    expect(dock.find('[data-testid="dock-retire"]').exists()).toBe(false)
    store.gatesBeaten = 3
    await dock.vm.$nextTick()
    const retire = dock.find('[data-testid="dock-retire"]')
    expect(retire.text()).toContain(`+${legacyForRetiring(3, 0)}`)
    await retire.trigger('click')
    expect(dock.emitted('retire')).toHaveLength(1)
  })

  it('the victory screen compares retiring now with the next gate', () => {
    const store = fresh()
    store.addDebugMoney(gateThreshold(1) * 2, T0)
    store.jobsPurchased['21'] = 50
    store.tick(T0)
    store.startBossAttempt()
    for (let i = 0; i < 200; i++) store.manualClick(T0 + 10 + i * 20)
    store.tick(T0 + 4500)
    const wrapper = mount(ClassModal, { global: { plugins: [pinia] } })
    const text = wrapper.find('[data-testid="victory-unlocks"]').text()
    expect(text).toContain(`Retire now for +${legacyForRetiring(1, 0)} Legacy`)
    expect(text).toContain(`+${legacyForRetiring(2, 0)}`)
  })
})
