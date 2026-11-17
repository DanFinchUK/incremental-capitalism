import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

function app() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
  const store = useGameStore()
  return { wrapper, store }
}

describe('the menu is a screen of its own', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('the game is not drawn while the menu or the register is up', async () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    store.generation = 2
    store.openMenu()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="main-menu"]').exists()).toBe(true)
    expect(wrapper.find('.lyt-Cockpit').exists()).toBe(false)
    store.closeMenu(T0)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lyt-Cockpit').exists()).toBe(true)
    store.openCensus()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="census"]').exists()).toBe(true)
    expect(wrapper.find('.lyt-Cockpit').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('the register', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('pauses the game until the family begins', () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    store.businessesOwned = { '1': 50 }
    store.tick(T0)
    store.openCensus()
    const money = store.money
    store.tick(T0 + 5000)
    expect(store.money).toBe(money)
    store.closeCensus(T0 + 6000)
    store.tick(T0 + 7000)
    expect(store.money).toBeGreaterThan(money)
    wrapper.unmount()
  })

  it('writes in a folded bloodline, striking off the old one', async () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    const old = store.familySurname
    store.startNewBloodline(T0)
    await wrapper.vm.$nextTick()
    const census = wrapper.find('[data-testid="census"]')
    expect(census.attributes('aria-modal')).toBe('true')
    expect(census.find('.cen-Entry-struck').text()).toContain(old)
    expect(census.find('[data-testid="census-entry"]').text()).toContain(store.heir.name)
    await census.find('[data-testid="census-begin"]').trigger('click')
    expect(census.find('[data-testid="census-motto"]').classes()).toContain('cen-Motto-shown')
    await census.find('[data-testid="census-begin"]').trigger('click')
    expect(store.census).toBeNull()
    expect(wrapper.find('[data-testid="census"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('a family nobody had seen is not struck off when another is chosen in its place', () => {
    const { wrapper, store } = app()
    store.abandonDynasty(T0)
    expect(store.census).toEqual({ previous: null, departure: null })
    wrapper.unmount()
  })
})
