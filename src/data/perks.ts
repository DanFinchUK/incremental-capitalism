export type PerkId =
  | 'autoClicker'
  | 'hustleCap'
  | 'offshore'
  | 'nepotism'
  | 'deregulation'
  | 'insider'
  | 'officeSeats'

export type PerkRanks = Record<PerkId, number>

export interface LegacyPerkDef {
  id: PerkId
  label: string
  description: string
  maxRank: number | null
  costForRank: (currentRank: number) => number
  effectSummary: (rank: number) => string
}

export const EMPTY_PERKS: Readonly<PerkRanks> = {
  autoClicker: 0,
  hustleCap: 0,
  offshore: 0,
  nepotism: 0,
  deregulation: 0,
  insider: 0,
  officeSeats: 0
}

// A perk rank lasts the whole bloodline and Legacy is scarce (about 9 points
// a bloodline against a much bigger tree), so each rank is worth at least a
// rare advisor, who only stays a generation
export const INTERNS_PER_RANK = 2
// Already strong: it compounds at every milestone of every item, and the
// sim's +4 rule breaks at 0.5
export const MILESTONE_STEP_PER_DEREGULATION_RANK = 0.25
export const OFFLINE_RATE_PER_OFFSHORE_RANK = 0.2
export const OFFLINE_HOURS_PER_OFFSHORE_RANK = 24
export const EVENT_INTERVAL_PER_INSIDER_RANK = 0.8
export const BUFF_DURATION_PER_INSIDER_RANK = 0.5

export const LEGACY_PERKS: ReadonlyArray<LegacyPerkDef> = [
  {
    id: 'autoClicker',
    label: 'Unpaid Interns (Auto-Clicker)',
    description: 'Each rank brings two Interns, who each click Get Paid once a second, riding your Hustle streak. The first pair is literally unpaid!',
    maxRank: null,
    costForRank: (r) => (r === 0 ? 0 : 1),
    effectSummary: (r) => `${r * INTERNS_PER_RANK} auto-clicks/sec`
  },
  {
    id: 'hustleCap',
    label: 'Grindset Coaching',
    description: 'Raises max Hustle click multiplier by +1x per rank (3x up to 8x) and scales streak build-up, boosting both manual clicks and Unpaid Interns.',
    maxRank: 5,
    costForRank: () => 1,
    effectSummary: (r) => `${3 + r}x max Hustle`
  },
  {
    id: 'offshore',
    label: 'Cayman Shell Company',
    description: 'Each rank pays 20% more of your passive income while you are away, and covers 24 hours more of it.',
    maxRank: 3,
    costForRank: () => 1,
    effectSummary: (r) => `${Math.min(100, 50 + 20 * r)}% offline rate (${24 + 24 * r}h cap)`
  },
  {
    id: 'nepotism',
    label: 'Old School Tie',
    description: 'Brings automation for the rest of the bloodline: each rank lets anything whose next unit costs up to 3% more of your cash restock itself, with or without an advisor.',
    maxRank: 4,
    costForRank: () => 1,
    effectSummary: (r) => `+${3 * r}% to the automation line`
  },
  {
    id: 'deregulation',
    label: 'Light-Touch Regulation',
    description: 'Boosts each ownership milestone multiplier by +0.25x per rank, on every Job and Business.',
    maxRank: 4,
    costForRank: () => 1,
    effectSummary: (r) => `${(2 + MILESTONE_STEP_PER_DEREGULATION_RANK * r).toFixed(2)}x per milestone`
  },
  {
    id: 'insider',
    label: 'Chancellor on Speed Dial',
    description: 'Each rank brings Market Opportunities 20% sooner and makes their buffs last 50% longer.',
    maxRank: 4,
    costForRank: () => 1,
    effectSummary: (r) => `${Math.round((1 - EVENT_INTERVAL_PER_INSIDER_RANK ** r) * 100)}% sooner, +${50 * r}% buff duration`
  },
  {
    id: 'officeSeats',
    label: 'Family Office Extension',
    description: 'Knocks through into the orangery: one more open seat in the family office per rank.',
    maxRank: 2,
    costForRank: () => 1,
    effectSummary: (r) => `${3 + r} open seats`
  }
]

export const PERKS_BY_ID: Readonly<Record<PerkId, LegacyPerkDef>> = Object.fromEntries(
  LEGACY_PERKS.map((p) => [p.id, p])
) as Record<PerkId, LegacyPerkDef>

export function perkNextCost(id: PerkId, currentRank: number): number | null {
  const perk = PERKS_BY_ID[id]
  if (perk.maxRank !== null && currentRank >= perk.maxRank) {
    return null
  }
  return perk.costForRank(currentRank)
}

// Total Legacy it costs to reach these ranks at current prices.
export function perkSpend(ranks: Readonly<PerkRanks>): number {
  let total = 0
  for (const perk of LEGACY_PERKS) {
    for (let r = 0; r < ranks[perk.id]; r++) {
      total += perk.costForRank(r)
    }
  }
  return total
}
