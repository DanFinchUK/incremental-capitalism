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
    // Nobody is named until they are written into the register
    expect(menu.text()).not.toContain(store.familySurname)
    await menu.find('[data-testid="menu-continue"]').trigger('click')
    expect(wrapper.find('[data-testid="main-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="census"]').text()).toContain(store.heir.name)
    expect(wrapper.find('[data-testid="intro-modal"]').exists()).toBe(false)
    // The first tap hurries the clerk, the second begins
    await wrapper.find('[data-testid="census-begin"]').trigger('click')
    await wrapper.find('[data-testid="census-begin"]').trigger('click')
    expect(wrapper.find('[data-testid="census"]').exists()).toBe(false)
    expect(store.menuOpen).toBe(false)
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
    // The new family goes into the register, under the old one struck off
    const census = wrapper.find('[data-testid="census"]')
    expect(census.exists()).toBe(true)
    expect(census.find('.cen-Entry-struck').text()).toContain(surname)
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

  it('opens the Hall over itself, and How to play and the settings as its own pages', async () => {
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
    // Reading the rules stays on the menu, and doesn't start the game
    expect(store.menuOpen).toBe(true)
    expect(wrapper.find('[data-testid="menu-how"]').text()).toContain('Retire and let your heir take over')
    expect(wrapper.find('[data-testid="intro-modal"]').exists()).toBe(false)
    await wrapper.find('[data-testid="menu-back"]').trigger('click')
    await wrapper.find('[data-testid="menu-settings"]').trigger('click')
    expect(store.menuOpen).toBe(true)
    expect(wrapper.find('[data-testid="settings"]').exists()).toBe(false)
    const muted = store.muted
    await wrapper.find('[data-testid="menu-toggle-sound"]').trigger('click')
    expect(store.muted).toBe(!muted)
    await wrapper.find('[data-testid="menu-reset"]').trigger('click')
    expect(wrapper.find('[data-testid="reset-modal"]').exists()).toBe(true)
    await wrapper.find('[data-testid="menu-back"]').trigger('click')
    expect(wrapper.find('[data-testid="menu-continue"]').exists()).toBe(true)
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
