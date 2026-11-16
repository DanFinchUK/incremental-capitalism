import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { ADVISORS_BY_ID } from '../../data/advisors'
import {
  BASE_OFFICE_SEATS,
  childOf,
  officeModifierSources,
  paStanding,
  paTitle,
  rollAdvisorOffer,
  type AdvisorInstance
} from '../../engine/office'
import type { ModifierSource } from '../../engine/modifiers'

export interface OfficeModuleDeps {
  money: Ref<number>
  extraSeats: () => number
  // PA chairs: one, plus one per title
  paChairCount: () => number
  announce: (msg: string) => void
  flushSave: () => void
  // Playing without tapping (the headhunter brings allowance advisors then)
  noTap?: () => boolean
}

// Where a hire goes when the office is full: an office seat, or a PA chair
export type HireTarget = number | { pa: number }

export interface OfficeState {
  seats: (AdvisorInstance | null)[]
  paChairs: (AdvisorInstance | null)[]
  offer: string[]
  // Offers earned by boss wins while another offer was still open
  queued: number
}

export interface OfficeModule {
  officeSeats: ComputedRef<(AdvisorInstance | null)[]>
  paChairs: ComputedRef<(AdvisorInstance | null)[]>
  headhunterOffer: Ref<string[]>
  queuedOffers: Ref<number>
  officeSources: ComputedRef<ModifierSource[]>
  hireAdvisor: (offerIndex: number, replaceSeat?: HireTarget) => boolean
  // The advisor a hire would replace because they buy the same list, if any
  replacedBuyer: (advisorId: string) => AdvisorInstance | null
  skipOffer: () => boolean
  fireAdvisor: (seat: number) => void
  firePA: (chair?: number) => void
  promoteToPA: (seat: number, chair?: number) => void
  rollOffer: (rng?: () => number) => void
  // Returns the promotions long service earned, as sentences for the retirement news
  onRetire: () => string[]
  onElevate: () => void
  addCampaignTime: (ms: number) => void
  loadState: (state: OfficeState) => void
  snapshot: () => OfficeState
}

export function createOfficeModule(deps: OfficeModuleDeps): OfficeModule {
  const seatStore = ref<(AdvisorInstance | null)[]>([])
  const paStore = ref<(AdvisorInstance | null)[]>([])
  const headhunterOffer = ref<string[]>([])
  const queuedOffers = ref(0)
  let nextUid = 1

  // The current offer is settled: bring forward the next one owed, if any
  function nextOffer(): void {
    headhunterOffer.value = []
    if (queuedOffers.value > 0) {
      queuedOffers.value -= 1
      headhunterOffer.value = rollAdvisorOffer(Math.random, deps.noTap?.() ?? false)
    }
  }

  // Seat count follows the perk; extra stored seats beyond it are kept but hidden.
  const officeSeats = computed(() => {
    const count = BASE_OFFICE_SEATS + deps.extraSeats()
    return Array.from({ length: count }, (_, i) => seatStore.value[i] ?? null)
  })

  // Chair count follows the titles; PAs beyond it are kept but stand aside
  const paChairs = computed(() =>
    Array.from({ length: Math.max(1, deps.paChairCount()) }, (_, i) => paStore.value[i] ?? null)
  )

  const officeSources = computed(() => {
    const pas = paChairs.value.filter((s): s is AdvisorInstance => s !== null)
    const everyone = [...officeSeats.value.filter((s): s is AdvisorInstance => s !== null), ...pas]
    return officeModifierSources(everyone, new Set(pas.map((p) => p.uid)))
  })

  function setChair(index: number, inst: AdvisorInstance | null): void {
    const chairs = [...paChairs.value]
    chairs[index] = inst
    paStore.value = chairs
  }

  function newUid(): string {
    return `a${Date.now().toString(36)}${nextUid++}`
  }

  function setSeat(index: number, inst: AdvisorInstance | null): void {
    const seats = [...officeSeats.value]
    seats[index] = inst
    seatStore.value = seats
  }

  // Where a buyer already of this kind sits: a new one takes their place
  function sameBuyerAt(kind: 'jobs' | 'businesses' | undefined): HireTarget | null {
    if (!kind) return null
    const isKind = (a: AdvisorInstance | null) => a !== null && ADVISORS_BY_ID[a.advisorId]?.buyer === kind
    const chair = paChairs.value.findIndex(isKind)
    if (chair >= 0) return { pa: chair }
    const seat = officeSeats.value.findIndex(isKind)
    return seat >= 0 ? seat : null
  }

  // replaceSeat: an office seat index, or { pa } for a PA chair. A buyer
  // always replaces the buyer of its kind, if there is one: one of each.
  function hireAdvisor(offerIndex: number, requested?: HireTarget): boolean {
    const advisorId = headhunterOffer.value[offerIndex]
    const def = advisorId ? ADVISORS_BY_ID[advisorId] : undefined
    if (!def) return false
    const replaceSeat = sameBuyerAt(def.buyer) ?? requested
    const inst: AdvisorInstance = { uid: newUid(), advisorId, servedGenerations: 0, campaignMs: 0 }
    // An empty PA chair is filled first, so the family's first advisors
    // aren't lost on retirement by accident
    const emptyChair = paChairs.value.findIndex((c) => c === null)
    const chair = typeof replaceSeat === 'object' ? replaceSeat.pa : replaceSeat === undefined ? emptyChair : -1
    if (chair >= 0 && chair < paChairs.value.length) {
      deps.money.value -= deps.money.value * def.hireFeeShare
      setChair(chair, inst)
      nextOffer()
      deps.announce(`${def.name} joins the family office as your Personal Assistant.`)
      deps.flushSave()
      return true
    }
    const seat = typeof replaceSeat === 'number' ? replaceSeat : officeSeats.value.findIndex((s) => s === null)
    if (seat < 0 || seat >= officeSeats.value.length) return false
    deps.money.value -= deps.money.value * def.hireFeeShare
    setSeat(seat, inst)
    nextOffer()
    deps.announce(`${def.name} joins the family office.`)
    deps.flushSave()
    return true
  }

  function replacedBuyer(advisorId: string): AdvisorInstance | null {
    const at = sameBuyerAt(ADVISORS_BY_ID[advisorId]?.buyer)
    if (at === null) return null
    return typeof at === 'number' ? (officeSeats.value[at] ?? null) : (paChairs.value[at.pa] ?? null)
  }

  function skipOffer(): boolean {
    if (headhunterOffer.value.length === 0) return false
    nextOffer()
    deps.announce('Sent the lot packing, with a nice lunch for their trouble.')
    deps.flushSave()
    return true
  }

  function fireAdvisor(seat: number): void {
    setSeat(seat, null)
    deps.flushSave()
  }

  function firePA(chair = 0): void {
    setChair(chair, null)
    deps.flushSave()
  }

  // The seat's advisor takes a PA chair (the first empty one, unless one is
  // named); whoever sat there moves into the seat.
  function promoteToPA(seat: number, chair?: number): void {
    const promoted = officeSeats.value[seat]
    if (!promoted) return
    const target = chair ?? Math.max(0, paChairs.value.findIndex((c) => c === null))
    const previous = paChairs.value[target] ?? null
    setChair(target, promoted)
    setSeat(seat, previous)
    deps.flushSave()
  }

  // Each boss win earns one offer. If one is already open, the new one waits.
  function rollOffer(rng: () => number = Math.random): void {
    if (headhunterOffer.value.length > 0) {
      queuedOffers.value += 1
      return
    }
    headhunterOffer.value = rollAdvisorOffer(rng, deps.noTap?.() ?? false)
  }

  // Open-seat advisors leave with the outgoing generation; PAs stay on, and
  // long service brings promotion
  function onRetire(): string[] {
    seatStore.value = []
    headhunterOffer.value = []
    queuedOffers.value = 0
    const news: string[] = []
    paStore.value = paChairs.value.map((pa) => {
      if (!pa) return null
      const before = paStanding(pa)
      const after = { ...pa, servedGenerations: pa.servedGenerations + 1 }
      const now = paStanding(after)
      if (before && now && now.tier > before.tier) {
        news.push(
          now.honour
            ? `${before.def.name} is honoured for services to the family: ${paTitle(now)}.`
            : `${before.def.name} is promoted to ${now.def.name}.`
        )
      }
      return after
    })
    return news
  }

  // Elevating to the Lords: each PA hands over to their child
  function onElevate(): void {
    paStore.value = paChairs.value.map((pa) => (pa ? childOf(pa, newUid()) : null))
  }

  function addCampaignTime(ms: number): void {
    const grow = (a: AdvisorInstance | null) =>
      a && ADVISORS_BY_ID[a.advisorId]?.campaign ? { ...a, campaignMs: a.campaignMs + ms } : a
    if (officeSeats.value.some((a) => a && ADVISORS_BY_ID[a.advisorId]?.campaign)) {
      seatStore.value = officeSeats.value.map(grow)
    }
    if (paChairs.value.some((a) => a && ADVISORS_BY_ID[a.advisorId]?.campaign)) {
      paStore.value = paChairs.value.map(grow)
    }
  }

  function loadState(state: OfficeState): void {
    seatStore.value = state.seats
    paStore.value = state.paChairs
    headhunterOffer.value = state.offer
    queuedOffers.value = state.queued
  }

  function snapshot(): OfficeState {
    return { seats: seatStore.value, paChairs: paStore.value, offer: headhunterOffer.value, queued: queuedOffers.value }
  }

  return {
    officeSeats,
    paChairs,
    headhunterOffer,
    queuedOffers,
    officeSources,
    hireAdvisor,
    replacedBuyer,
    skipOffer,
    fireAdvisor,
    firePA,
    promoteToPA,
    rollOffer,
    onRetire,
    onElevate,
    addCampaignTime,
    loadState,
    snapshot
  }
}
