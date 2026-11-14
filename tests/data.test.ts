import { describe, expect, it } from 'vitest'
import { BUSINESSES, JOBS, itemImageUrl } from '../src/data/items'
import { SOCIAL_CLASSES } from '../src/data/classes'
import { EMPTY_PERKS, LEGACY_PERKS, perkNextCost, perkSpend } from '../src/data/perks'
import { MARKET_EVENTS, pickEventRarity, pickMarketEvent } from '../src/data/events'
import { pickHeadline } from '../src/data/headlines'

function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

const JOB_IMAGE_FILES = Object.keys(import.meta.glob('../public/img/jobs/*.png'))
const BUSINESS_IMAGE_FILES = Object.keys(import.meta.glob('../public/img/businesses/*.png'))

describe('catalogue & static data', () => {
  it('defines 22 jobs and 22 businesses preserving all legacy IDs plus new UK tiers', () => {
    expect(JOBS).toHaveLength(22)
    expect(BUSINESSES).toHaveLength(22)
    expect(JOBS[0]).toMatchObject({ id: '1', label: 'Gig delivery rider', baseCost: 130 })
    expect(JOBS[1]).toMatchObject({ id: '19', label: 'Hairdresser' })
    expect(JOBS[21]).toMatchObject({ id: '22', label: 'Non-dom peer' })

    const bizLabels = BUSINESSES.map((b) => b.label)
    expect(bizLabels).toContain('Phone case & repair kiosk')
    expect(bizLabels).toContain('Neon vape shop')
    expect(bizLabels).toContain('Skin-fade barbershop')
    expect(bizLabels).toContain('High-street bookies')
    expect(bizLabels).toContain('Buy-to-let portfolio')
    expect(bizLabels).toContain('Fish and chip shop')
    expect(bizLabels).toContain('Private health clinic')
    expect(bizLabels).toContain('Mayfair hedge fund')
    expect(bizLabels).toContain('Artisanal sourdough bakery')
    expect(bizLabels).toContain('PFI outsourcing giant')

    const oilIdx = BUSINESSES.findIndex((b) => b.label === 'Oil driller')
    const bakeryIdx = BUSINESSES.findIndex((b) => b.label === 'Artisanal sourdough bakery')
    expect(bakeryIdx).toBeGreaterThan(oilIdx)
  })

  it('forms a 1-to-1 synergy bijection between all 22 jobs and 22 businesses', () => {
    const bizIds = new Set(BUSINESSES.map((b) => b.id))
    const targeted = JOBS.map((j) => j.synergyBusinessId)
    expect(new Set(targeted).size).toBe(22)
    for (const id of targeted) {
      expect(bizIds.has(id)).toBe(true)
    }
  })

  it('maintains strictly decreasing unit-1 ROI across all 22 jobs and 22 businesses', () => {
    for (let i = 1; i < JOBS.length; i++) {
      const prevRoi = JOBS[i - 1].moneyPerClick / JOBS[i - 1].baseCost
      const currRoi = JOBS[i].moneyPerClick / JOBS[i].baseCost
      expect(currRoi).toBeLessThan(prevRoi)
    }
    for (let i = 1; i < BUSINESSES.length; i++) {
      const prevRoi = BUSINESSES[i - 1].moneyPerSecond / BUSINESSES[i - 1].baseCost
      const currRoi = BUSINESSES[i].moneyPerSecond / BUSINESSES[i].baseCost
      expect(currRoi).toBeLessThan(prevRoi)
    }
  })

  it('maps item labels cleanly to public image paths and verifies all 44 PNG thumbnails exist with zero orphans', () => {
    expect(itemImageUrl('jobs', 'Shelf filler')).toBe('./img/jobs/shelf-filler.png')
    expect(itemImageUrl('businesses', 'Phone case & repair kiosk')).toBe('./img/businesses/phone-case-repair-kiosk.png')
    expect(itemImageUrl('jobs', 'FTSE 100 CEO')).toBe('./img/jobs/ftse-100-ceo.png')
    expect(itemImageUrl('businesses', 'High-end café')).toBe('./img/businesses/high-end-café.png')

    const jobSet = new Set(JOB_IMAGE_FILES)
    const bizSet = new Set(BUSINESS_IMAGE_FILES)
    for (const job of JOBS) {
      const rel = `../public/${itemImageUrl('jobs', job.label).replace(/^\.\//, '')}`
      expect(jobSet.has(rel), `Missing job icon: ${rel}`).toBe(true)
    }
    for (const biz of BUSINESSES) {
      const rel = `../public/${itemImageUrl('businesses', biz.label).replace(/^\.\//, '')}`
      expect(bizSet.has(rel), `Missing business icon: ${rel}`).toBe(true)
    }

    expect(JOB_IMAGE_FILES).toHaveLength(22)
    expect(BUSINESS_IMAGE_FILES).toHaveLength(22)
  })

  it('defines 10 social classes (including 3 post-Elite secret tiers), 7 legacy perks, events, and headlines', () => {
    expect(SOCIAL_CLASSES).toHaveLength(10)
    expect(SOCIAL_CLASSES[0].threshold).toBe(0)
    expect(SOCIAL_CLASSES[7].label).toBe('Davos Regular')
    expect(SOCIAL_CLASSES[8].label).toBe('Shadow Cabinet')
    expect(SOCIAL_CLASSES[9].label).toBe('Reptilian Dynasty')
    expect(LEGACY_PERKS).toHaveLength(7)
    expect(perkNextCost('autoClicker', 0)).toBe(0)
    expect(perkNextCost('autoClicker', 1)).toBe(1)
    expect(perkNextCost('autoClicker', 3)).toBe(1)
    expect(perkNextCost('autoClicker', 4)).toBe(2)
    expect(perkNextCost('autoClicker', 16)).toBe(4)
    expect(perkNextCost('hustleCap', 0)).toBe(1)
    expect(perkNextCost('hustleCap', 3)).toBe(2)
    expect(perkNextCost('hustleCap', 5)).toBeNull()
    expect(perkNextCost('nepotism', 4)).toBeNull()
    // The whole finite tree costs 31 Legacy; Interns are the open-ended sink
    expect(perkSpend({ autoClicker: 0, hustleCap: 5, offshore: 5, nepotism: 4, deregulation: 4, insider: 4, officeSeats: 0 })).toBe(31)
    expect(perkSpend({ ...EMPTY_PERKS, autoClicker: 10 })).toBe(16)
    expect(MARKET_EVENTS.some((e) => e.shady)).toBe(true)
    // Rarity tiers: 60/30/10, and the 7x Overtime only in Legendary
    expect(pickEventRarity(0)).toBe('common')
    expect(pickEventRarity(0.59)).toBe('common')
    expect(pickEventRarity(0.6)).toBe('rare')
    expect(pickEventRarity(0.89)).toBe('rare')
    expect(pickEventRarity(0.9)).toBe('legendary')
    expect(pickEventRarity(0.999)).toBe('legendary')
    for (const rarity of ['common', 'rare', 'legendary'] as const) {
      expect(MARKET_EVENTS.some((e) => e.rarity === rarity)).toBe(true)
    }
    const strongestClick = MARKET_EVENTS.filter((e) => e.effect.type === 'clickBuff').sort(
      (a, b) => (b.effect as { mult: number }).mult - (a.effect as { mult: number }).mult
    )[0]
    expect(strongestClick.kind).toBe('unpaidOvertime')
    expect(strongestClick.rarity).toBe('legendary')
    // pickMarketEvent: first roll picks rarity, second picks within tier
    expect(pickMarketEvent(seq([0.95, 0])).rarity).toBe('legendary')
    expect(pickMarketEvent(seq([0.1, 0.99])).rarity).toBe('common')
    expect(MARKET_EVENTS.some((e) => !e.shady)).toBe(true)
    expect(pickHeadline(0, null).length).toBeGreaterThan(10)
    expect(pickHeadline(9, 'businessBuff').length).toBeGreaterThan(10)
  })
})
