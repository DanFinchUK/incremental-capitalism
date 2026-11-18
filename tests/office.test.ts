import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ADVISORS, ADVISORS_BY_ID } from '../src/data/advisors'
import { combineModifiers } from '../src/engine/modifiers'
import { childOf, officeModifierSources, paStanding, paTitle, rollAdvisorOffer, type AdvisorInstance } from '../src/engine/office'
import { gateThreshold } from '../src/engine/bosses'
import { useGameStore } from '../src/stores/game'
import { mount } from '@vue/test-utils'
import FamilyOffice from '../src/components/FamilyOffice.vue'
import HeadhunterOffer from '../src/components/HeadhunterOffer.vue'

const T0 = 1_000_000
const inst = (advisorId: string, servedGenerations = 0, campaignMs = 0): AdvisorInstance => ({
  uid: `${advisorId}-${servedGenerations}-${campaignMs}`,
  advisorId,
  servedGenerations,
  campaignMs
})

describe('advisor data', () => {
  it('has a common, a rare and a legendary advisor in every family, each with an effect and a cost line', () => {
    const families = new Set(ADVISORS.map((a) => a.family))
    expect(families.size).toBeGreaterThanOrEqual(20)
    for (const f of families) {
      const tiers = ADVISORS.filter((a) => a.family === f).map((a) => a.rarity).sort()
      expect(tiers, f).toEqual(['common', 'legendary', 'rare'])
    }
    for (const a of ADVISORS) {
      expect(a.effectText.length).toBeGreaterThan(10)
      expect(a.costText.length).toBeGreaterThan(5)
    }
  })

  it('rolls an offer of three different advisors', () => {
    let i = 0
    const rng = () => [0.1, 0.3, 0.65, 0.2, 0.95, 0.5, 0.05, 0.7][i++ % 8]
    const offer = rollAdvisorOffer(rng)
    expect(offer).toHaveLength(3)
    expect(new Set(offer).size).toBe(3)
    for (const id of offer) expect(ADVISORS_BY_ID[id]).toBeDefined()
  })
})

describe('office modifiers', () => {
  it('stacks duplicates: effects and upkeep both multiply up', () => {
    const m = combineModifiers(officeModifierSources([inst('property-guy'), inst('property-guy')]))
    expect(m.sectorBusinessMult.property).toBeCloseTo(4)
    expect(m.incomeDrain).toBeCloseTo(0.02)
  })

  it('a long-serving PA is promoted up the family, then through the honours', () => {
    const asPA = (served: number) => {
      const pa = inst('life-coach', served)
      return combineModifiers(officeModifierSources([pa]))
    }
    const rare = ADVISORS_BY_ID['productivity-guru'].mods.clickMult!
    const legendary = ADVISORS_BY_ID['hustle-billionaire'].mods.clickMult!
    expect(asPA(0).clickMult).toBeCloseTo(ADVISORS_BY_ID['life-coach'].mods.clickMult!)
    expect(asPA(1).clickMult).toBeCloseTo(rare)
    expect(asPA(2).clickMult).toBeCloseTo(legendary)
    // MBE a generation later: half again; a peer is three times a legendary
    expect(asPA(3).clickMult).toBeCloseTo(legendary ** 1.5)
    expect(asPA(6).clickMult).toBeCloseTo(legendary ** 3)
    expect(asPA(40).clickMult).toBeCloseTo(legendary ** 3)
    // Moved out of the chair to an open seat, they keep what they earned
    const seated = combineModifiers(officeModifierSources([inst('life-coach', 9)]))
    expect(seated.clickMult).toBeCloseTo(asPA(9).clickMult)
    // Never a PA, never promoted
    const plain = combineModifiers(officeModifierSources([inst('life-coach', 0)]))
    expect(plain.clickMult).toBeCloseTo(ADVISORS_BY_ID['life-coach'].mods.clickMult!)
  })

  it('names a PA by their rank, and hands over to a child capped at Legendary', () => {
    const veteran = inst('estate-manager', 5)
    const s = paStanding(veteran)!
    expect(s.tier).toBe(5)
    expect(paTitle(s)).toBe('Proxy with Power of Attorney, knighted')
    expect(s.hiredAs?.name).toBe('Estate Manager')
    expect(paTitle(paStanding(inst('estate-manager', 3))!)).toBe('Proxy with Power of Attorney, MBE')
    expect(paTitle(paStanding(inst('estate-manager', 6))!)).toBe('Proxy with Power of Attorney, now in the Lords')
    expect(childOf(veteran, 'kid')).toEqual({ uid: 'kid', advisorId: 'proxy', servedGenerations: 0, campaignMs: 0 })
    expect(childOf(inst('estate-manager', 2), 'kid')?.advisorId).toBe('head-butler')
    expect(childOf(inst('head-butler', 0), 'kid')?.advisorId).toBe('estate-manager')
    expect(childOf(inst('estate-manager', 0), 'kid')?.advisorId).toBe('estate-manager')
  })

  it('Head of Finance pays out per Finance advisor', () => {
    const m = combineModifiers(officeModifierSources([inst('head-of-finance'), inst('accountant'), inst('stockbroker')]))
    expect(m.businessMult).toBeCloseTo(1.6)
    expect(m.clickMult).toBeCloseTo(1.6)
  })

  it("only the best Finance bonus counts: two Group CFOs don't each count the other", () => {
    const m = combineModifiers(officeModifierSources([inst('group-cfo'), inst('group-cfo'), inst('stockbroker')]))
    // One bonus at 35% for three Finance advisors, not two of them multiplied
    expect(m.businessMult).toBeCloseTo(1 + 0.35 * 3)
    const mixed = combineModifiers(officeModifierSources([inst('finance-clerk'), inst('group-cfo'), inst('stockbroker')]))
    expect(mixed.businessMult).toBeCloseTo(1 + 0.35 * 3)
  })

  it('campaigns build with minutes in office and stop at their cap', () => {
    const early = combineModifiers(officeModifierSources([inst('flour-campaigner', 0, 10 * 60_000)]))
    expect(early.sectorCostMult.food).toBeCloseTo(0.9)
    expect(early.sectorBusinessMult.food).toBeCloseTo(1.3)
    const capped = combineModifiers(officeModifierSources([inst('flour-campaigner', 0, 600 * 60_000)]))
    expect(capped.sectorCostMult.food).toBeCloseTo(0.5)
    expect(capped.sectorBusinessMult.food).toBeCloseTo(2.5)
  })
})

describe('the family office in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function winGate1() {
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.addDebugMoney(gateThreshold(1) * 10, T0)
    store.tick(T0)
    store.startBossAttempt()
    store.bossAttempt!.clickEarningsAtFullHustle = 1e300
    store.tick(T0 + 1000)
    return store
  }

  it('each title adds a PA chair, and empty chairs are filled first', () => {
    const store = winGate1()
    store.titles = 2
    expect(store.paChairs).toHaveLength(3)
    store.headhunterOffer = ['sommelier']
    store.hireAdvisor(0)
    store.headhunterOffer = ['accountant']
    store.hireAdvisor(0)
    expect(store.paChairs.map((p) => p?.advisorId ?? null)).toEqual(['sommelier', 'accountant', null])
    expect(store.officeSeats.filter(Boolean)).toHaveLength(0)
  })

  it('long service brings promotion at retirement, and says so', () => {
    const store = winGate1()
    store.headhunterOffer = ['estate-manager']
    store.hireAdvisor(0)
    store.retire(T0 + 2000)
    expect(store.paChairs[0]?.servedGenerations).toBe(1)
    expect(paStanding(store.paChairs[0]!)?.def.name).toBe('Head Butler')
    expect(store.bannerMessage ?? '').toContain('Estate Manager is promoted to Head Butler')
  })

  it('an old save\'s single PA moves into the first chair', () => {
    localStorage.setItem(
      'state',
      JSON.stringify({
        schemaVersion: 8,
        scene: { office: { seats: [], paChair: { uid: 'x', advisorId: 'sommelier', servedGenerations: 4, campaignMs: 0 }, offer: [], queued: 0 } }
      })
    )
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    expect(store.paChairs[0]).toMatchObject({ uid: 'x', advisorId: 'sommelier', servedGenerations: 4 })
  })

  it('a boss win brings the headhunter with three candidates', () => {
    const store = winGate1()
    expect(store.gatesBeaten).toBe(1)
    expect(store.headhunterOffer).toHaveLength(3)
  })

  it('the first hire takes the empty PA chair, so retiring cannot lose it', () => {
    const store = winGate1()
    store.headhunterOffer = ['sommelier', 'accountant', 'lobbyist']
    expect(store.hireAdvisor(0)).toBe(true)
    expect(store.paChairs[0]?.advisorId).toBe('sommelier')
    expect(store.officeSeats.filter(Boolean)).toHaveLength(0)
    store.retire(T0 + 2000)
    store.pickHeir(0)
    expect(store.paChairs[0]?.advisorId).toBe('sommelier')
  })

  it('hiring pays the fee from cash, fills a seat and applies the effect', () => {
    const store = winGate1()
    store.headhunterOffer = ['accountant']
    store.hireAdvisor(0) // into the PA chair
    store.headhunterOffer = ['sommelier', 'accountant', 'lobbyist']
    const cash = store.money
    expect(store.hireAdvisor(0)).toBe(true)
    expect(store.money).toBeCloseTo(cash * 0.95)
    expect(store.officeSeats.filter(Boolean)).toHaveLength(1)
    expect(store.modifiers.sectorBusinessMult.food).toBeCloseTo(2)
    expect(store.headhunterOffer).toHaveLength(0)
  })

  it('a full office needs a seat freed or a replacement named', () => {
    const store = winGate1()
    for (let i = 0; i < 4; i++) {
      store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
      expect(store.hireAdvisor(0)).toBe(true)
    }
    store.headhunterOffer = ['lobbyist', 'sommelier', 'accountant']
    expect(store.hireAdvisor(0)).toBe(false)
    expect(store.hireAdvisor(0, 1)).toBe(true)
    expect(store.officeSeats[1]?.advisorId).toBe('lobbyist')
    store.fireAdvisor(1)
    expect(store.officeSeats[1]).toBeNull()
  })

  it('the PA stays through retirement with a payrise; the rest leave', () => {
    const store = winGate1()
    store.headhunterOffer = ['productivity-guru', 'accountant', 'lobbyist']
    store.hireAdvisor(0) // into the PA chair
    store.headhunterOffer = ['accountant', 'sommelier', 'lobbyist']
    store.hireAdvisor(0)
    expect(store.officeSeats[0]?.advisorId).toBe('accountant')
    expect(store.paChairs[0]?.advisorId).toBe('productivity-guru')
    store.retire(T0 + 2000)
    store.pickHeir(0)
    expect(store.officeSeats.every((s) => s === null)).toBe(true)
    expect(store.paChairs[0]?.servedGenerations).toBe(1)
  })

  it('the Family Office Extension perk adds seats', () => {
    const store = winGate1()
    expect(store.officeSeats).toHaveLength(3)
    store.perks.officeSeats = 2
    expect(store.officeSeats).toHaveLength(5)
  })

  it('remembers the office through a reload', () => {
    const store = winGate1()
    store.headhunterOffer = ['stockbroker', 'accountant', 'lobbyist']
    store.hireAdvisor(0)
    store.promoteToPA(0)
    store.flushSave(T0 + 3000)
    setActivePinia(createPinia())
    const again = useGameStore()
    again.hydrateFromStorage(T0 + 3000)
    expect(again.paChairs[0]?.advisorId).toBe('stockbroker')
  })
})

describe('the family office on screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('with every PA chair taken, Make PA asks who swaps out', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    store.titles = 1
    for (const id of ['head-butler', 'recruitment-consultant', 'sovereign-grant-adviser']) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    expect(store.paChairs.map((p) => p?.advisorId)).toEqual(['head-butler', 'recruitment-consultant'])
    const wrapper = mount(FamilyOffice, { global: { plugins: [pinia] } })
    await wrapper.find('[data-testid="promote-pa"]').trigger('click')
    const swaps = wrapper.findAll('[data-testid="pa-swap"]')
    expect(wrapper.find('[data-testid="pa-swap-picker"]').text()).toContain('Swap with:')
    expect(swaps.map((b) => b.text())).toEqual(['Head Butler', 'Recruitment Consultant'])
    await swaps[1].trigger('click')
    expect(store.paChairs.map((p) => p?.advisorId)).toEqual(['head-butler', 'sovereign-grant-adviser'])
    expect(store.officeSeats[0]?.advisorId).toBe('recruitment-consultant')
  })

  it('with a single PA chair, Make PA simply swaps the two', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    for (const id of ['head-butler', 'recruitment-consultant']) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    expect(store.paChairs.map((p) => p?.advisorId)).toEqual(['head-butler'])
    const wrapper = mount(FamilyOffice, { global: { plugins: [pinia] } })
    await wrapper.find('[data-testid="promote-pa"]').trigger('click')
    expect(wrapper.find('[data-testid="pa-swap-picker"]').exists()).toBe(false)
    expect(store.paChairs.map((p) => p?.advisorId)).toEqual(['recruitment-consultant'])
    expect(store.officeSeats[0]?.advisorId).toBe('head-butler')
  })

  it('a PA swapped back to an open seat keeps the honours they earned', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    for (const id of ['head-butler', 'recruitment-consultant']) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    // Three generations' service in the chair
    store.paChairs[0]!.servedGenerations = 3
    const honoured = paTitle(paStanding(store.paChairs[0]!)!)
    const before = store.modifiers
    const wrapper = mount(FamilyOffice, { global: { plugins: [pinia] } })
    await wrapper.find('[data-testid="promote-pa"]').trigger('click')
    expect(store.officeSeats[0]?.advisorId).toBe('head-butler')
    // Their title and their effect go with them
    expect(wrapper.find('[data-testid="office-seat"]').text()).toContain(honoured)
    expect(store.modifiers.clickMult).toBeCloseTo(before.clickMult)
    expect(store.modifiers.businessMult).toBeCloseTo(before.businessMult)
  })

  it('the advisor cards read the same in the office and in the hiring picker', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    // A PA and a full office, one of them knighted in an earlier chair
    for (const id of ['estate-manager', 'privatisation-campaigner', 'fund-manager', 'pfi-consultant']) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    store.officeSeats[0]!.servedGenerations = 3
    const office = mount(FamilyOffice, { global: { plugins: [pinia] } })
    const officeCard = office.findAll('[data-testid="office-seat"]')[0].text()
    store.headhunterOffer = ['head-of-finance']
    const offer = mount(HeadhunterOffer, { global: { plugins: [pinia] } })
    await offer.find('[data-testid="hire-advisor"]').trigger('click')
    const pickerCard = offer.findAll('[data-testid="replace-seat"]')[0].element.closest('article')!.textContent!
    // Categories and honours, in both
    expect(officeCard).toContain('Infrastructure')
    expect(pickerCard).toContain('Infrastructure')
    const honoured = paTitle(paStanding(store.officeSeats[0]!)!)
    expect(officeCard).toContain(honoured)
    expect(pickerCard).toContain(honoured)
  })

  it('without tapping, the lasting pills show the total allowance', () => {
    setActivePinia(createPinia())
    const store = useGameStore()
    store.hydrateFromStorage(T0)
    store.closeIntro(T0)
    expect(store.allowancePill).toBeNull()
    store.toggleNoTap()
    expect(store.allowancePill).toBeNull()
    for (const id of ['sovereign-grant-adviser', 'productivity-guru']) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    // The Guru's 50% on click pay; the Head of Talent brings Interns instead
    expect(store.allowancePill?.label).toBe('Total allowance x1.5')
  })
})

describe('sector specialists', () => {
  it('are introduced only once the family owns a business in their sector', async () => {
    const { ref } = await import('vue')
    const { createOfficeModule } = await import('../src/stores/modules/office')
    const { advisorSector } = await import('../src/engine/office')
    const office = createOfficeModule({
      money: ref(0),
      extraSeats: () => 0,
      paChairCount: () => 1,
      announce: () => {},
      flushSave: () => {},
      ownsSector: (s) => s === 'services'
    })
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      office.headhunterOffer.value = []
      office.rollOffer()
      for (const id of office.headhunterOffer.value) seen.add(id)
      office.headhunterOffer.value = []
    }
    const sectors = new Set([...seen].map((id) => advisorSector(ADVISORS_BY_ID[id])).filter((s) => s !== null))
    expect([...sectors]).toEqual(['services'])
    // Advisors who work in no sector still turn up
    expect([...seen].some((id) => advisorSector(ADVISORS_BY_ID[id]) === null)).toBe(true)
  })
})

describe('a PA promoted into a campaigner', () => {
  it('runs the campaign of the role they now hold', () => {
    // A PFI Consultant after a generation's service holds the family's top
    // role, the Privatisation Campaigner, and campaigns as one
    const pa = { uid: 'p', advisorId: 'pfi-consultant', servedGenerations: 1, campaignMs: 10 * 60_000 }
    expect(paStanding(pa)!.def.id).toBe('privatisation-campaigner')
    const m = combineModifiers(officeModifierSources([pa]))
    expect(m.sectorBusinessMult.infrastructure).toBeCloseTo(1.3)
    expect(m.sectorCostMult.infrastructure).toBeCloseTo(0.9)
  })

  it('builds up campaign time', async () => {
    const { ref } = await import('vue')
    const { createOfficeModule } = await import('../src/stores/modules/office')
    const office = createOfficeModule({ money: ref(0), extraSeats: () => 0, paChairCount: () => 1, announce: () => {}, flushSave: () => {} })
    const pa = { uid: 'p', advisorId: 'pfi-consultant', servedGenerations: 1, campaignMs: 0 }
    office.loadState({ seats: [], paChairs: [pa], offer: [], queued: 0, waiting: 0, optional: false, parked: [] })
    office.addCampaignTime(5000)
    expect(office.paChairs.value[0]!.campaignMs).toBe(5000)
  })

})
