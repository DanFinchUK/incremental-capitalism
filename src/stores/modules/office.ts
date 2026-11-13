import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { ADVISORS_BY_ID } from '../../data/advisors'
import { BASE_OFFICE_SEATS, officeModifierSources, rollAdvisorOffer, type AdvisorInstance } from '../../engine/office'
import type { ModifierSource } from '../../engine/modifiers'

export interface OfficeModuleDeps {
  money: Ref<number>
  extraSeats: () => number
  announce: (msg: string) => void
  flushSave: () => void
}

export interface OfficeState {
  seats: (AdvisorInstance | null)[]
  paChair: AdvisorInstance | null
  offer: string[]
  // Offers earned by boss wins while another offer was still open
  queued: number
}

export interface OfficeModule {
  officeSeats: ComputedRef<(AdvisorInstance | null)[]>
  paChair: Ref<AdvisorInstance | null>
  headhunterOffer: Ref<string[]>
  queuedOffers: Ref<number>
  officeSources: ComputedRef<ModifierSource[]>
  hireAdvisor: (offerIndex: number, replaceSeat?: number) => boolean
  fireAdvisor: (seat: number) => void
  firePA: () => void
  promoteToPA: (seat: number) => void
  rollOffer: (rng?: () => number) => void
  onRetire: () => void
  addCampaignTime: (ms: number) => void
  loadState: (state: OfficeState) => void
  snapshot: () => OfficeState
}

export function createOfficeModule(deps: OfficeModuleDeps): OfficeModule {
  const seatStore = ref<(AdvisorInstance | null)[]>([])
  const paChair = ref<AdvisorInstance | null>(null)
  const headhunterOffer = ref<string[]>([])
  const queuedOffers = ref(0)
  let nextUid = 1

  // The current offer is settled: bring forward the next one owed, if any
  function nextOffer(): void {
    headhunterOffer.value = []
    if (queuedOffers.value > 0) {
      queuedOffers.value -= 1
      headhunterOffer.value = rollAdvisorOffer(Math.random)
    }
  }

  // Seat count follows the perk; extra stored seats beyond it are kept but hidden.
  const officeSeats = computed(() => {
    const count = BASE_OFFICE_SEATS + deps.extraSeats()
    return Array.from({ length: count }, (_, i) => seatStore.value[i] ?? null)
  })

  const officeSources = computed(() => {
    const everyone = [...officeSeats.value.filter((s): s is AdvisorInstance => s !== null)]
    if (paChair.value) everyone.push(paChair.value)
    return officeModifierSources(everyone, paChair.value?.uid ?? null)
  })

  function setSeat(index: number, inst: AdvisorInstance | null): void {
    const seats = [...officeSeats.value]
    seats[index] = inst
    seatStore.value = seats
  }

  function hireAdvisor(offerIndex: number, replaceSeat?: number): boolean {
    const advisorId = headhunterOffer.value[offerIndex]
    const def = advisorId ? ADVISORS_BY_ID[advisorId] : undefined
    if (!def) return false
    const seat = replaceSeat ?? officeSeats.value.findIndex((s) => s === null)
    if (seat < 0 || seat >= officeSeats.value.length) return false
    deps.money.value -= deps.money.value * def.hireFeeShare
    setSeat(seat, { uid: `a${Date.now().toString(36)}${nextUid++}`, advisorId, servedGenerations: 0, campaignMs: 0 })
    nextOffer()
    deps.announce(`${def.name} joins the family office.`)
    deps.flushSave()
    return true
  }

  function fireAdvisor(seat: number): void {
    setSeat(seat, null)
    deps.flushSave()
  }

  function firePA(): void {
    paChair.value = null
    deps.flushSave()
  }

  // The seat's advisor takes the PA chair; any previous PA moves into that seat.
  function promoteToPA(seat: number): void {
    const promoted = officeSeats.value[seat]
    if (!promoted) return
    const previous = paChair.value
    paChair.value = promoted
    setSeat(seat, previous)
    deps.flushSave()
  }

  // Each boss win earns one offer. If one is already open, the new one waits.
  function rollOffer(rng: () => number = Math.random): void {
    if (headhunterOffer.value.length > 0) {
      queuedOffers.value += 1
      return
    }
    headhunterOffer.value = rollAdvisorOffer(rng)
  }

  // Open-seat advisors leave with the outgoing generation; the PA stays on
  // and gets a payrise.
  function onRetire(): void {
    seatStore.value = []
    headhunterOffer.value = []
    queuedOffers.value = 0
    if (paChair.value) {
      paChair.value = { ...paChair.value, servedGenerations: paChair.value.servedGenerations + 1 }
    }
  }

  function addCampaignTime(ms: number): void {
    const grow = (a: AdvisorInstance | null) =>
      a && ADVISORS_BY_ID[a.advisorId]?.campaign ? { ...a, campaignMs: a.campaignMs + ms } : a
    if (officeSeats.value.some((a) => a && ADVISORS_BY_ID[a.advisorId]?.campaign)) {
      seatStore.value = officeSeats.value.map(grow)
    }
    if (paChair.value && ADVISORS_BY_ID[paChair.value.advisorId]?.campaign) {
      paChair.value = grow(paChair.value)
    }
  }

  function loadState(state: OfficeState): void {
    seatStore.value = state.seats
    paChair.value = state.paChair
    headhunterOffer.value = state.offer
    queuedOffers.value = state.queued
  }

  function snapshot(): OfficeState {
    return { seats: seatStore.value, paChair: paChair.value, offer: headhunterOffer.value, queued: queuedOffers.value }
  }

  return {
    officeSeats,
    paChair,
    headhunterOffer,
    queuedOffers,
    officeSources,
    hireAdvisor,
    fireAdvisor,
    firePA,
    promoteToPA,
    rollOffer,
    onRetire,
    addCampaignTime,
    loadState,
    snapshot
  }
}
