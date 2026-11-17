import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ItemCard from '../src/components/ItemCard.vue'
import HeroHeader from '../src/components/HeroHeader.vue'
import { BUSINESSES } from '../src/data/items'
import { DOMINANCE_AT, bulkBuyQuote } from '../src/engine/economy'
import { useGameStore } from '../src/stores/game'

const T0 = 1_000_000

describe('market dominance', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('nothing is bought past 1,000, whatever the bulk setting', () => {
    expect(DOMINANCE_AT).toBe(1000)
    expect(bulkBuyQuote(1, 1.0001, 995, 1, 10, 1e300).count).toBe(5)
    expect(bulkBuyQuote(1, 1.0001, 990, 1, 'max', 1e300).count).toBe(10)
    const full = bulkBuyQuote(1, 1.0001, 1000, 1, 1, 1e300)
    expect(full.count).toBe(0)
    expect(full.canAfford).toBe(false)
  })

  it('each Job or Business held at 1,000 adds a quarter to all income', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.businessesOwned = { '1': 999, '2': 10 }
    const before = store.moneyPerSecond
    const click = store.moneyPerClick
    // Ownership milestones aside, the 1,000th unit also brings dominance
    store.businessesOwned = { '1': 1000, '2': 10 }
    expect(store.dominanceHeld).toBe(1)
    store.businessesOwned = { '1': 999, '2': 10 }
    expect(store.moneyPerSecond).toBeCloseTo(before)
    store.jobsPurchased = { '1': 1000 }
    expect(store.dominanceHeld).toBe(1)
    expect(store.moneyPerSecond).toBeCloseTo(before * 1.25)
    expect(store.moneyPerClick).toBeGreaterThan(click * 1.25 * 0.99)
  })

  it('a card held at 1,000 says so in place of its buy button', () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    const item = BUSINESSES[0]
    store.businessesOwned = { [item.id]: 1000 }
    store.money = 1e300
    const card = mount(ItemCard, { props: { kind: 'businesses', row: { mode: 'revealed', item } }, global: { plugins: [pinia] } })
    expect(card.find('[data-testid="dominance"]').text()).toBe('Market dominance')
    expect(card.find('.scn-Action').exists()).toBe(false)
    expect(card.find('.scn-CostLine').exists()).toBe(false)
    expect(store.buyItem('businesses', item.id, 1).bought).toBe(0)
  })

  it("shows with the family's lasting effects, totalled", async () => {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    const header = mount(HeroHeader, { props: { phone: false }, global: { plugins: [pinia] } })
    expect(header.find('[data-testid="dominance-pill"]').exists()).toBe(false)
    store.jobsPurchased = { '1': 1000 }
    store.businessesOwned = { '1': 1000 }
    await header.vm.$nextTick()
    expect(header.find('[data-testid="dominance-pill"]').text()).toBe('Market dominance +50%')
  })
})
