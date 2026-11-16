// Buyers: staff who press Buy for you, one list each. A Recruiter takes on
// Jobs, Acquisitions buys Businesses. Each second a buyer gets a budget, a
// share of the cash in hand, and buys the best return per pound it can
// afford, then the next best, up to its number of item types.
import { ADVISORS_BY_ID } from '../data/advisors'
import { BUYER_SHARE_PER_SIGNING_RANK } from '../data/perks'
import type { ItemKind } from '../data/items'
import { paTier, type AdvisorInstance } from './office'

// Budget share and item types by tier: common, rare, legendary
const SHARE_BY_TIER: ReadonlyArray<number> = [0.2, 0.4, 0.6]
const TYPES_BY_TIER: ReadonlyArray<number> = [1, 2, 3]
// Each honour a PA buyer holds adds this much budget, and one more item type
export const HONOUR_BUYER_SHARE = 0.1
const RARITY_TIER = { common: 0, rare: 1, legendary: 2 } as const

export interface Buyer {
  kind: ItemKind
  // Who it is: an advisor's name, or the family's own staff
  name: string
  // Share of cash this buyer may spend a second, after the family-wide cap
  share: number
  itemTypes: number
}

export interface BuyerInputs {
  seats: ReadonlyArray<AdvisorInstance | null>
  paChairs: ReadonlyArray<AdvisorInstance | null>
  signingRanks: number
  // Landed Gentry and kin: extra item types, and the family's own staff when
  // no buyer is hired
  extraItemTypes: number
}

function tierOf(inst: AdvisorInstance, isPA: boolean): number {
  const def = ADVISORS_BY_ID[inst.advisorId]
  if (!def) return 0
  return isPA ? paTier(inst) : RARITY_TIER[def.rarity]
}

// The best buyer of a kind in the office, by tier, or the family's staff
function buyerOf(kind: ItemKind, inputs: BuyerInputs): { name: string; tier: number } | null {
  let best: { name: string; tier: number } | null = null
  const consider = (inst: AdvisorInstance | null, isPA: boolean) => {
    const def = inst ? ADVISORS_BY_ID[inst.advisorId] : undefined
    if (!inst || !def || def.buyer !== kind) return
    const tier = tierOf(inst, isPA)
    if (!best || tier > best.tier) best = { name: def.name, tier }
  }
  for (const s of inputs.seats) consider(s, false)
  for (const p of inputs.paChairs) consider(p, true)
  if (best) return best
  return inputs.extraItemTypes > 0 ? { name: "The family's staff", tier: 0 } : null
}

// Both buyers, with budgets scaled down together if they would spend more than you hold
export function familyBuyers(inputs: BuyerInputs): Record<ItemKind, Buyer | null> {
  const raw: Record<ItemKind, Buyer | null> = { jobs: null, businesses: null }
  for (const kind of ['jobs', 'businesses'] as const) {
    const who = buyerOf(kind, inputs)
    if (!who) continue
    const honours = Math.max(0, who.tier - 2)
    const base = Math.min(2, who.tier)
    raw[kind] = {
      kind,
      name: who.name,
      share: SHARE_BY_TIER[base] + HONOUR_BUYER_SHARE * honours + BUYER_SHARE_PER_SIGNING_RANK * inputs.signingRanks,
      itemTypes: TYPES_BY_TIER[base] + honours + inputs.extraItemTypes
    }
  }
  const total = (raw.jobs?.share ?? 0) + (raw.businesses?.share ?? 0)
  if (total > 1) {
    for (const b of [raw.jobs, raw.businesses]) if (b) b.share /= total
  }
  return raw
}

export interface BuyOption {
  id: string
  cost: number
  // Income gained per pound: what makes one purchase better than another
  valuePerPound: number
}

// The best return per pound among what's affordable, or null. The store asks
// again after each purchase, with what's left of the budget, so on Max the
// first pick spends as much as fits and later ones get the rest.
export function bestValue(options: ReadonlyArray<BuyOption>): BuyOption | null {
  let best: BuyOption | null = null
  for (const o of options) {
    if (o.valuePerPound > 0 && o.cost > 0 && (!best || o.valuePerPound > best.valuePerPound)) best = o
  }
  return best
}
