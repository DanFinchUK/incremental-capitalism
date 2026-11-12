import { describe, expect, it } from 'vitest'
import { BUSINESSES, JOBS, itemImageUrl } from '../src/data/items'
import { SOCIAL_CLASSES } from '../src/data/classes'
import { LEGACY_PERKS, perkNextCost } from '../src/data/perks'
import { MARKET_EVENTS } from '../src/data/events'
import { pickHeadline } from '../src/data/headlines'

describe('catalogue & static data', () => {
  it('defines 18 jobs and 18 businesses preserving legacy IDs', () => {
    expect(JOBS).toHaveLength(18)
    expect(BUSINESSES).toHaveLength(18)
    expect(BUSINESSES.map((b) => b.id)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      '11', '12', '13', '14', '16', '17', '18', '19'
    ])
  })

  it('forms a 1-to-1 synergy bijection between jobs and businesses', () => {
    const bizIds = new Set(BUSINESSES.map((b) => b.id))
    const targeted = JOBS.map((j) => j.synergyBusinessId)
    expect(new Set(targeted).size).toBe(18)
    for (const id of targeted) {
      expect(bizIds.has(id)).toBe(true)
    }
  })

  it('rebalances #11 Utilities provider and #16 Film studio', () => {
    const utilities = BUSINESSES.find((b) => b.id === '11')
    const filmStudio = BUSINESSES.find((b) => b.id === '16')
    expect(utilities?.baseCost).toBe(4_500_000_000)
    expect(utilities?.moneyPerSecond).toBe(3_600_000)
    expect(filmStudio?.moneyPerSecond).toBe(75_000_000)
  })

  it('maps item labels to public image paths including accented café', () => {
    expect(itemImageUrl('jobs', 'Shelf filler')).toBe('./img/jobs/shelf-filler.png')
    expect(itemImageUrl('businesses', 'High-end café')).toBe('./img/businesses/high-end-café.png')
  })

  it('defines 7 social classes, 6 legacy perks, market events, and headlines', () => {
    expect(SOCIAL_CLASSES).toHaveLength(7)
    expect(SOCIAL_CLASSES[0].threshold).toBe(0)
    expect(LEGACY_PERKS).toHaveLength(6)
    expect(perkNextCost('autoClicker', 0)).toBe(2)
    expect(perkNextCost('autoClicker', 17)).toBe(2)
    expect(perkNextCost('nepotism', 4)).toBeNull()
    expect(MARKET_EVENTS.some((e) => e.shady)).toBe(true)
    expect(MARKET_EVENTS.some((e) => !e.shady)).toBe(true)
    expect(pickHeadline(0, null).length).toBeGreaterThan(10)
    expect(pickHeadline(6, 'bullRun').length).toBeGreaterThan(10)
  })
})
