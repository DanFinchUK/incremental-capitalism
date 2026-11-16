import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { bestValue, familyBuyers, type BuyerInputs } from '../src/engine/buyers'
import { JOBS_BY_ID } from '../src/data/items'
import { useGameStore } from '../src/stores/game'
import { hireFree } from './helpers'

const inst = (advisorId: string, servedGenerations = 0) => ({ uid: advisorId + servedGenerations, advisorId, servedGenerations, campaignMs: 0 })
const inputs = (over: Partial<BuyerInputs> = {}): BuyerInputs => ({ seats: [], paChairs: [], signingRanks: 0, extraItemTypes: 0, ...over })

describe('who buys, and with how much', () => {
  it('nobody buys until someone is hired, or a gentry heir brings the family staff', () => {
    expect(familyBuyers(inputs())).toEqual({ jobs: null, businesses: null })
    const gentry = familyBuyers(inputs({ extraItemTypes: 2 }))
    expect(gentry.jobs).toMatchObject({ name: "The family's staff", share: 0.2, itemTypes: 3 })
    expect(gentry.businesses).toMatchObject({ share: 0.2, itemTypes: 3 })
  })

  it('rarity sets the budget and the item types; honours and Signing Authority add more', () => {
    const b = familyBuyers(inputs({ seats: [inst('estate-manager'), inst('recruitment-consultant')] }))
    expect(b.businesses).toMatchObject({ name: 'Estate Manager', share: 0.2, itemTypes: 1 })
    expect(b.jobs).toMatchObject({ name: 'Recruitment Consultant', share: 0.4, itemTypes: 2 })
    // A Proxy who has served 9 generations as PA holds an OBE: two honours
    const veteran = familyBuyers(inputs({ paChairs: [inst('proxy', 6)], signingRanks: 1 }))
    expect(veteran.businesses!.share).toBeCloseTo(0.6 + 0.2 + 0.2)
    expect(veteran.businesses!.itemTypes).toBe(5)
  })

  it('two buyers never spend more than you hold between them', () => {
    const b = familyBuyers(inputs({ seats: [inst('proxy'), inst('executive-search')], signingRanks: 2 }))
    expect(b.jobs!.share + b.businesses!.share).toBeCloseTo(1)
    expect(b.jobs!.share).toBeCloseTo(0.5)
  })

  it('picks the best return per pound', () => {
    expect(bestValue([{ id: 'a', cost: 10, valuePerPound: 1 }, { id: 'b', cost: 50, valuePerPound: 3 }, { id: 'c', cost: 5, valuePerPound: 0 }])?.id).toBe('b')
    expect(bestValue([])).toBeNull()
  })
})

describe('buyers in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function fresh(money: number) {
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.closeIntro(1000)
    store.money = money
    store.jobsPurchased = { '1': 30, '19': 5 }
    return store
  }

  const units = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0)

  it('buys nothing without a buyer', () => {
    const store = fresh(1e9)
    const before = units(store.jobsPurchased)
    store.tick(1000)
    store.tick(2100)
    expect(store.hasBuyers).toBe(false)
    expect(units(store.jobsPurchased)).toBe(before)
  })

  it('a Recruiter spends within its budget, on one kind of Job, and leaves the rest', () => {
    const store = fresh(1e9)
    hireFree(store, 'temp-agency')
    const cash = store.money
    const before = { ...store.jobsPurchased }
    store.tick(1000)
    store.tick(2100)
    expect(cash - store.money).toBeGreaterThan(0)
    expect(cash - store.money).toBeLessThanOrEqual(cash * 0.2 + 1)
    const changed = Object.keys(store.jobsPurchased).filter((id) => store.jobsPurchased[id] !== before[id])
    expect(changed).toHaveLength(1)
    expect(units(store.businessesOwned)).toBe(0)
  })

  it('buys the best value, not an old rung past its last milestone', () => {
    const store = fresh(JOBS_BY_ID['2'].baseCost * 100)
    store.jobsPurchased = { '1': 1000, '19': 40, '2': 20 }
    hireFree(store, 'temp-agency')
    store.bulkBuyMode = 1
    store.tick(1000)
    store.tick(2100)
    expect(store.jobsPurchased['1']).toBe(1000)
  })

  it('stands down when its list is unticked, and skips excluded items', () => {
    const store = fresh(1e9)
    hireFree(store, 'temp-agency')
    store.toggleBuyersPaused('jobs')
    const before = units(store.jobsPurchased)
    store.tick(1000)
    store.tick(2100)
    expect(units(store.jobsPurchased)).toBe(before)
    store.toggleBuyersPaused('jobs')
    for (const r of store.visibleJobs) if (r.mode === 'revealed') store.toggleAutoBuy('jobs', r.item.id)
    store.tick(3200)
    expect(units(store.jobsPurchased)).toBe(before)
  })

  it('keeps one buyer of each kind: a new one replaces the old', () => {
    const store = fresh(1e9)
    hireFree(store, 'temp-agency')
    expect(store.replacedBuyer('recruitment-consultant')?.advisorId).toBe('temp-agency')
    hireFree(store, 'recruitment-consultant')
    const everyone = [...store.paChairs, ...store.officeSeats].filter((a) => a !== null).map((a) => a!.advisorId)
    expect(everyone).toEqual(['recruitment-consultant'])
    expect(store.buyers.jobs?.name).toBe('Recruitment Consultant')
  })

  it('marks what it bought on the cash chart', () => {
    const store = fresh(1e9)
    hireFree(store, 'temp-agency')
    store.tick(1000)
    store.tick(2100)
    const buys = store.telemetry.candles.flatMap((c) => c.buys ?? [])
    expect(buys.some((b) => b.startsWith('Temping Agency bought '))).toBe(true)
  })
})
