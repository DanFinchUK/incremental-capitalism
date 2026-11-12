export type EventRarity = 'common' | 'rare' | 'legendary'

export type MarketEventKind =
  | 'paidOvertime'
  | 'stimulusCheque'
  | 'taxRebate'
  | 'weekendOvertime'
  | 'quantitativeEasing'
  | 'shadyDeal'
  | 'unpaidOvertime'
  | 'bankHolidayBailout'

export type MarketEventEffect =
  | { type: 'clickBuff'; mult: number; durationSec: number }
  | { type: 'businessBuff'; mult: number; durationSec: number }
  | { type: 'windfall'; seconds: number }
  | { type: 'shady'; winSeconds: number; freezeSec: number }

export interface MarketEventDef {
  kind: MarketEventKind
  title: string
  subtitle: string
  // Short name for the buff pill while a timed effect runs
  buffLabel: string
  rarity: EventRarity
  shady: boolean
  effect: MarketEventEffect
}

// Chance of each rarity when an event spawns; an event is then picked
// uniformly from that tier.
export const RARITY_WEIGHTS: Readonly<Record<EventRarity, number>> = {
  common: 0.6,
  rare: 0.3,
  legendary: 0.1
}

export const RARITY_LABELS: Readonly<Record<EventRarity, string>> = {
  common: 'Common',
  rare: 'Rare',
  legendary: 'Legendary'
}

export const MARKET_EVENTS: ReadonlyArray<MarketEventDef> = [
  {
    kind: 'paidOvertime',
    title: 'Paid Overtime',
    subtitle: '2x Click income for 20s',
    buffLabel: 'Paid Overtime',
    rarity: 'common',
    shady: false,
    effect: { type: 'clickBuff', mult: 2, durationSec: 20 }
  },
  {
    kind: 'stimulusCheque',
    title: 'Stimulus Cheque',
    subtitle: '3x Business income for 20s',
    buffLabel: 'Stimulus',
    rarity: 'common',
    shady: false,
    effect: { type: 'businessBuff', mult: 3, durationSec: 20 }
  },
  {
    kind: 'taxRebate',
    title: 'Non-Dom Tax Rebate!',
    subtitle: 'Instant 60s passive windfall',
    buffLabel: 'Tax Rebate',
    rarity: 'common',
    shady: false,
    effect: { type: 'windfall', seconds: 60 }
  },
  {
    kind: 'weekendOvertime',
    title: 'Weekend Overtime!',
    subtitle: '4x Click income for 15s',
    buffLabel: 'Weekend Overtime',
    rarity: 'rare',
    shady: false,
    effect: { type: 'clickBuff', mult: 4, durationSec: 15 }
  },
  {
    kind: 'quantitativeEasing',
    title: 'Quantitative Easing!',
    subtitle: '5x Business income for 20s',
    buffLabel: 'QE',
    rarity: 'rare',
    shady: false,
    effect: { type: 'businessBuff', mult: 5, durationSec: 20 }
  },
  {
    kind: 'shadyDeal',
    title: 'Shady VIP-Lane Tip-Off',
    subtitle: '50/50 Risk: 180s windfall OR 15s auto-buy freeze',
    buffLabel: 'VIP Lane',
    rarity: 'rare',
    shady: true,
    effect: { type: 'shady', winSeconds: 180, freezeSec: 15 }
  },
  {
    kind: 'unpaidOvertime',
    title: 'Mandatory Unpaid Overtime!',
    subtitle: '7x Click income for 15s',
    buffLabel: 'Unpaid Overtime',
    rarity: 'legendary',
    shady: false,
    effect: { type: 'clickBuff', mult: 7, durationSec: 15 }
  },
  {
    kind: 'bankHolidayBailout',
    title: 'Bank Holiday Bailout!',
    subtitle: 'Instant 10 min passive windfall',
    buffLabel: 'Bailout',
    rarity: 'legendary',
    shady: false,
    effect: { type: 'windfall', seconds: 600 }
  }
]

export const MARKET_EVENTS_BY_KIND: Readonly<Record<MarketEventKind, MarketEventDef>> = Object.fromEntries(
  MARKET_EVENTS.map((e) => [e.kind, e])
) as Record<MarketEventKind, MarketEventDef>

export function pickEventRarity(roll: number): EventRarity {
  let acc = 0
  for (const rarity of ['common', 'rare', 'legendary'] as const) {
    acc += RARITY_WEIGHTS[rarity]
    if (roll < acc) {
      return rarity
    }
  }
  return 'legendary'
}

export function pickMarketEvent(rng: () => number = Math.random): MarketEventDef {
  const rarity = pickEventRarity(rng())
  const pool = MARKET_EVENTS.filter((e) => e.rarity === rarity)
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}
