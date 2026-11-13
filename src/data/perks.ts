export type PerkId =
  | 'autoClicker'
  | 'hustleCap'
  | 'offshore'
  | 'nepotism'
  | 'deregulation'
  | 'insider'

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
  insider: 0
}

export const LEGACY_PERKS: ReadonlyArray<LegacyPerkDef> = [
  {
    id: 'autoClicker',
    label: 'Unpaid Interns (Auto-Clicker)',
    description: 'Each rank clicks Get Paid once per second, riding your manual Hustle streak. First intern is literally unpaid!',
    maxRank: null,
    costForRank: (r) => Math.floor(Math.sqrt(r)),
    effectSummary: (r) => `${r} auto-click${r === 1 ? '' : 's'}/sec`
  },
  {
    id: 'hustleCap',
    label: 'Grindset Coaching',
    description: 'Raises max Hustle click multiplier by +1x per rank (3x up to 8x) and scales streak build-up, boosting both manual clicks and Unpaid Interns.',
    maxRank: 5,
    costForRank: (r) => [1, 1, 1, 2, 2][r],
    effectSummary: (r) => `${3 + r}x max Hustle`
  },
  {
    id: 'offshore',
    label: 'Cayman Shell Company',
    description: 'Raises offline catch-up efficiency by +10% and extends offline cap by +12h per rank.',
    maxRank: 5,
    costForRank: () => 1,
    effectSummary: (r) => `${50 + 10 * r}% offline rate (${24 + 12 * r}h cap)`
  },
  {
    id: 'nepotism',
    label: 'Old School Tie',
    description: 'Moves the automation line: items costing up to 1% more of your cash per rank restock themselves.',
    maxRank: 4,
    costForRank: (r) => [1, 1, 2, 2][r],
    effectSummary: (r) => `Automation line at ${1 + r}% of cash`
  },
  {
    id: 'deregulation',
    label: 'Light-Touch Regulation',
    description: 'Boosts each ownership milestone multiplier by +0.25x per rank.',
    maxRank: 4,
    costForRank: (r) => [1, 2, 2, 3][r],
    effectSummary: (r) => `${(2 + 0.25 * r).toFixed(2)}x per milestone`
  },
  {
    id: 'insider',
    label: 'Chancellor on Speed Dial',
    description: 'Market Opportunities spawn 15% faster and active frenzies last 25% longer per rank.',
    maxRank: 4,
    costForRank: (r) => [1, 1, 1, 2][r],
    effectSummary: (r) => `+${25 * r}% buff duration`
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
