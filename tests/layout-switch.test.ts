import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

// A matchMedia whose answer the test can change, as resizing a window would
function fakeMatchMedia() {
  let matches = false
  const listeners = new Set<() => void>()
  const list = {
    get matches() {
      return matches
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn)
  }
  vi.stubGlobal('matchMedia', () => list)
  return (next: boolean) => {
    matches = next
    for (const fn of listeners) fn()
  }
}

describe('switching between desktop and phone layouts', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('still opens the retire dialog after the window narrows to a phone', async () => {
    const setPhone = fakeMatchMedia()
    const errors: unknown[] = []
    const wrapper = mount(App, {
      attachTo: document.body,
      global: { plugins: [pinia], config: { errorHandler: (e) => errors.push(e) } }
    })
    const store = useGameStore()
    store.closeIntro(T0)
    await flushPromises()

    setPhone(true)
    await flushPromises()
    setPhone(false)
    await flushPromises()
    setPhone(true)
    await flushPromises()

    store.gatesBeaten = 2
    await flushPromises()
    await wrapper.find('[data-testid="dock-retire"]').trigger('click')
    await flushPromises()

    expect(errors).toEqual([])
    expect(wrapper.find('[data-testid="retire-modal"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
