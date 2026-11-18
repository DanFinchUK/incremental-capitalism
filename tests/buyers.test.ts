import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import HeadhunterOffer from '../src/components/HeadhunterOffer.vue'
import BuyerControl from '../src/components/BuyerControl.vue'
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
    expect(b.businesses).toMatchObject({ name: 'Estate Manager', ownShare: 0.2, itemTypes: 1 })
    expect(b.jobs).toMatchObject({ name: 'Recruitment Consultant', ownShare: 0.4, itemTypes: 2 })
    // A Proxy who has served 2 generations as PA holds an OBE: two honours
    const veteran = familyBuyers(inputs({ paChairs: [inst('proxy', 2)], signingRanks: 1 }))
    expect(veteran.businesses!.share).toBeCloseTo(0.6 + 0.2 + 0.2)
    expect(veteran.businesses!.itemTypes).toBe(5)
  })

  it('two buyers share one purse: the larger of their budgets', () => {
    const b = familyBuyers(inputs({ seats: [inst('estate-manager'), inst('recruitment-consultant')] }))
    expect(b.jobs!.share).toBeCloseTo(0.4)
    expect(b.businesses!.share).toBeCloseTo(0.4)
    expect(b.businesses!.ownShare).toBeCloseTo(0.2)
  })

  it('a buyer never has more than all the cash to spend', () => {
    // Ten ranks of Signing Authority would take a buyer far past all the cash
    const capped = familyBuyers(inputs({ seats: [inst('temp-agency')], signingRanks: 10 }))
    expect(capped.jobs!.ownShare).toBe(1)
    expect(capped.jobs!.share).toBe(1)
  })

  it('a buyer stood down takes their budget out of the purse', () => {
    const one = familyBuyers(inputs({ seats: [inst('estate-manager'), inst('recruitment-consultant')], paused: { jobs: true } }))
    expect(one.businesses!.share).toBeCloseTo(0.2)
    // The one stood down shows the purse they'd bring back
    expect(one.jobs!.share).toBeCloseTo(0.4)
  })

  it('picks the best return per pound', () => {
    expect(bestValue([{ id: 'a', cost: 10, valuePerPound: 1 }, { id: 'b', cost: 50, valuePerPound: 3 }, { id: 'c', cost: 5, valuePerPound: 0 }])?.id).toBe('b')
    expect(bestValue([])).toBeNull()
    // Nothing worth measuring: the cheapest affordable thing, not nothing
    expect(bestValue([{ id: 'a', cost: 120, valuePerPound: 0 }, { id: 'b', cost: 40, valuePerPound: 0 }])?.id).toBe('b')
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

  it('logs what the buyers bought, a minute at a time', () => {
    const store = fresh(1e9)
    hireFree(store, 'temp-agency')
    const cash = store.money
    store.tick(1000)
    store.tick(2100)
    expect(store.playLog.events.some((e) => e.e === 'buyers')).toBe(false)
    const exported = JSON.parse(store.exportSave(2200))
    const tally = exported.scene.playLog.events.find((e: { e: string }) => e.e === 'buyers')
    expect(tally.jobs).toBeGreaterThan(0)
    expect(tally.jobsCost).toBeCloseTo(cash - store.money)
    expect(tally.businesses).toBe(0)
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

describe('introducing buyers', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('never introduces a buyer no better than the one you have, and offers the better ones as an upgrade', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.closeIntro(1000)
    hireFree(store, 'recruitment-consultant')
    for (let i = 0; i < 200; i++) {
      store.headhunterOffer = []
      store.rollOffer()
      expect(store.headhunterOffer).not.toContain('temp-agency')
      expect(store.headhunterOffer).not.toContain('recruitment-consultant')
    }
    store.headhunterOffer = ['executive-search', 'sommelier']
    const wrapper = mount(HeadhunterOffer, { global: { plugins: [pinia] } })
    const buttons = wrapper.findAll('[data-testid="hire-advisor"]')
    expect(buttons[0].text()).toBe('Upgrade')
    expect(buttons[1].text()).toBe('Hire')
    expect(wrapper.find('[data-testid="replaces-buyer"]').text()).toBe('Replaces your Recruitment Consultant')
  })
})

describe('the buyer beside each list', () => {
  it('shows what each spends now, and what it would otherwise', async () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(1000)
    store.closeIntro(1000)
    store.perks.signingAuthority = 2
    hireFree(store, 'head-butler')
    hireFree(store, 'recruitment-consultant')
    const jobs = mount(BuyerControl, { props: { kind: 'jobs' }, global: { plugins: [pinia] } })
    const biz = mount(BuyerControl, { props: { kind: 'businesses' }, global: { plugins: [pinia] } })
    // 40% + 2 x 20% each, from one purse
    expect(jobs.text()).toContain('Budget 80% · 2 items')
    expect(biz.text()).toContain('Budget 80%')
    store.toggleBuyersPaused('businesses')
    await jobs.vm.$nextTick()
    expect(biz.text()).toContain('Budget 0% (80% when on)')
    expect(jobs.text()).toContain('Budget 80% · 2 items')
  })
})
