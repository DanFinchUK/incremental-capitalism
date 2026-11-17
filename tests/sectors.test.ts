import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ItemCard from '../src/components/ItemCard.vue'
import { BUSINESSES, JOBS } from '../src/data/items'
import { useGameStore } from '../src/stores/game'

describe('sectors on the cards', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useGameStore().hydrateFromStorage(1_000_000)
  })

  it('every card says what kind of business or job it is', () => {
    const business = BUSINESSES.find((b) => b.sector === 'infrastructure')!
    const job = JOBS.find((j) => j.sector === 'food')!
    const card = (kind: 'jobs' | 'businesses', item: typeof business | typeof job) =>
      mount(ItemCard, { props: { kind, row: { mode: 'revealed', item } }, global: { plugins: [pinia] } })
    expect(card('businesses', business).find('[data-testid="sector-pill"]').text()).toBe('Infrastructure')
    expect(card('jobs', job).find('[data-testid="sector-pill"]').text()).toBe('Food')
  })
})
