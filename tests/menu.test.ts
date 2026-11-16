import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('the main menu', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function app() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const store = useGameStore()
    return { wrapper, store }
  }

  it('a first visit begins from the menu, then the intro', async () => {
    const { wrapper, store } = app()
    store.openMenu()
    await wrapper.vm.$nextTick()
    const menu = wrapper.find('[data-testid="main-menu"]')
    expect(menu.attributes('aria-modal')).toBe('true')
    expect(wrapper.find('[data-testid="intro-modal"]').exists()).toBe(false)
    expect(menu.find('[data-testid="menu-continue"]').text()).toContain('Begin')
    expect(menu.find('[data-testid="menu-new-dynasty"]').exists()).toBe(false)
    await menu.find('[data-testid="menu-continue"]').trigger('click')
    expect(wrapper.find('[data-testid="main-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="intro-modal"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('the game waits behind the menu', () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    store.businessesOwned = { '1': 50 }
    store.tick(T0)
    store.openMenu()
    const money = store.money
    store.tick(T0 + 5000)
    expect(store.money).toBe(money)
    store.closeMenu(T0 + 6000)
    store.tick(T0 + 7000)
    expect(store.money).toBeGreaterThan(money)
    wrapper.unmount()
  })

  it('continues the family, or abandons it for a new one after asking', async () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    store.generation = 4
    store.titles = 2
    const surname = store.familySurname
    store.openMenu()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="menu-continue"]').text()).toContain('Generation 4 · Viscount')
    await wrapper.find('[data-testid="menu-new-dynasty"]').trigger('click')
    expect(wrapper.find('[data-testid="menu-confirm-abandon"]').text()).toContain("doesn't go in the Hall")
    await wrapper.find('[data-testid="menu-confirm-new-dynasty"]').trigger('click')
    // Back to the title screen, with a new family ready to begin
    expect(store.menuOpen).toBe(true)
    expect(wrapper.find('[data-testid="menu-continue"]').text()).toContain('Begin')
    expect(store.familySurname).not.toBe(surname)
    expect(store).toMatchObject({ generation: 1, titles: 0 })
    expect(store.hall).toHaveLength(0)
    wrapper.unmount()
  })

  it('a full reset goes back to the menu', async () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    store.generation = 3
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as { $: { setupState: { confirmHardReset: () => void } } }).$.setupState.confirmHardReset()
    await wrapper.vm.$nextTick()
    expect(store.menuOpen).toBe(true)
    expect(store.generation).toBe(1)
    expect(wrapper.find('[data-testid="menu-continue"]').text()).toContain('Begin')
    wrapper.unmount()
  })

  it('opens the Hall and the settings over itself, and How to play in place of itself', async () => {
    const { wrapper, store } = app()
    store.closeIntro(T0)
    store.openMenu()
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="menu-hall"]').trigger('click')
    expect(wrapper.find('[data-testid="hall-modal"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hall-empty"]').exists()).toBe(true)
    expect(store.menuOpen).toBe(true)
    store.hallOpen = false
    await wrapper.find('[data-testid="menu-how-to-play"]').trigger('click')
    expect(store.menuOpen).toBe(false)
    expect(wrapper.find('[data-testid="intro-modal"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('back to the menu', () => {
  it('Settings has a way back to the main menu', async () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [pinia] } })
    const store = useGameStore()
    store.closeIntro(T0)
    store.settingsOpen = true
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="settings-main-menu"]').trigger('click')
    expect(store.settingsOpen).toBe(false)
    expect(store.menuOpen).toBe(true)
    wrapper.unmount()
  })
})
