export type PerkId =
  | 'autoClicker'
  | 'trustFund'
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
  trustFund: 0,
  offshore: 0,
  nepotism: 0,
  deregulation: 0,
  insider: 0
}

export const LEGACY_PERKS: ReadonlyArray<LegacyPerkDef> = [
  {
    id: 'autoClicker',
    label: 'Unpaid Interns (Auto-Clicker)',
    description: 'Each rank clicks Get Paid once per second automatically and enables Job auto-buying.',
    maxRank: null,
    costForRank: () => 2,
    effectSummary: (r) => `${r} auto-click${r === 1 ? '' : 's'}/sec`
  },
  {
    id: 'trustFund',
    label: 'Family Trust Fund',
    description: 'Start every retirement with tax-efficient seed capital so you skip early manual graft.',
    maxRank: 10,
    costForRank: (r) => 1 + r,
    effectSummary: (r) => (r === 0 ? '£0 starting cash' : `Start runs with £${(25_000 * Math.pow(5, r - 1)).toLocaleString('en-GB')}`)
  },
  {
    id: 'offshore',
    label: 'Cayman Shell Company',
    description: 'Raises offline catch-up efficiency by +10% and extends offline cap by +12h per rank.',
    maxRank: 5,
    costForRank: (r) => 2 + r,
    effectSummary: (r) => `${50 + 10 * r}% offline rate (${24 + 12 * r}h cap)`
  },
  {
    id: 'nepotism',
    label: 'Old School Tie',
    description: 'Lowers every Job & Business auto-buy unlock requirement by 5 lifetime purchases (min 5).',
    maxRank: 4,
    costForRank: (r) => 3 + 2 * r,
    effectSummary: (r) => `-${5 * r} lifetime purchases needed`
  },
  {
    id: 'deregulation',
    label: 'Light-Touch Regulation',
    description: 'Boosts each ownership milestone multiplier (10/25/50/100/200) by +0.25x per rank.',
    maxRank: 4,
    costForRank: (r) => 4 + 3 * r,
    effectSummary: (r) => `${(2 + 0.25 * r).toFixed(2)}x per milestone`
  },
  {
    id: 'insider',
    label: 'Chancellor on Speed Dial',
    description: 'Market Opportunities spawn 15% faster and active frenzies last 25% longer per rank.',
    maxRank: 4,
    costForRank: (r) => 3 + 2 * r,
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
