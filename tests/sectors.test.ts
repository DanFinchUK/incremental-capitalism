import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ItemCard from '../src/components/ItemCard.vue'
import { BUSINESSES, JOBS } from '../src/data/items'
import { sectorPill } from '../src/engine/sectors'
import { useGameStore } from '../src/stores/game'
import { hireFree } from './helpers'

const T0 = 1_000_000
const infraBusiness = BUSINESSES.find((b) => b.sector === 'infrastructure')!
const infraJob = JOBS.find((j) => j.sector === 'infrastructure')!

describe('sectors on the cards', () => {
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function store() {
    const s = useGameStore()
    s.hydrateFromStorage(T0)
    s.closeIntro(T0)
    return s
  }

  const card = (kind: 'jobs' | 'businesses', item: (typeof BUSINESSES)[number] | (typeof JOBS)[number]) =>
    mount(ItemCard, { props: { kind, row: { mode: 'revealed', item } }, global: { plugins: [pinia] } })

  it('every card names its sector, quietly, with nothing changing it', () => {
    store()
    const c = card('businesses', infraBusiness)
    expect(c.find('[data-testid="sector-pill"]').text()).toBe('Infrastructure')
    expect(c.find('[data-testid="sector-pill"]').classes()).not.toContain('scn-SectorPill-changed')
    expect(c.find('[data-testid="sector-from"]').exists()).toBe(false)
  })

  it("shows what the staff are doing to a sector's businesses, and who", () => {
    const s = store()
    hireFree(s, 'site-foreman')
    const c = card('businesses', infraBusiness)
    expect(c.find('[data-testid="sector-pill"]').text()).toBe('Infrastructure ×2')
    expect(c.find('[data-testid="sector-pill"]').classes()).toContain('scn-SectorPill-changed')
    expect(c.find('[data-testid="sector-from"]').text()).toBe('From: Site Foreman')
    // A Job earns by the tap, so a sector's income boost doesn't reach it
    expect(card('jobs', infraJob).find('[data-testid="sector-pill"]').text()).toBe('Infrastructure')
  })

  it('states income and cost changes plainly, and marks a change for the worse', () => {
    expect(sectorPill('property', { income: 5, cost: 0.75, from: ['Landlord'] }, 'businesses')).toEqual({ text: 'Property ×5 −25% cost', changed: true, worse: false })
    expect(sectorPill('property', { income: 5, cost: 0.75, from: [] }, 'jobs')).toEqual({ text: 'Property −25% cost', changed: true, worse: false })
    expect(sectorPill('media', { income: 0.5, cost: 1, from: [] }, 'businesses').worse).toBe(true)
  })
})
