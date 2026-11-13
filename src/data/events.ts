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
  | 'leakedWhatsApps'
  | 'nonDomQuestioned'
  | 'secondHomeFlooded'
  | 'internToThePress'

export type MarketEventEffect =
  | { type: 'clickBuff'; mult: number; durationSec: number }
  | { type: 'businessBuff'; mult: number; durationSec: number }
  | { type: 'windfall'; seconds: number }
  | { type: 'shady'; winSeconds: number; freezeSec: number }
  | {
      type: 'scandal'
      options: readonly [ScandalOption, ScandalOption]
      // What happens if the player lets it run without answering
      ignored: ReadonlyArray<ScandalOutcome>
      ignoredText: string
    }

// What one choice in a scandal does. A gamble picks win or lose by chance.
export type ScandalOutcome =
  | { type: 'cashLoss'; share: number }
  | { type: 'windfall'; seconds: number }
  | { type: 'buff'; target: 'click' | 'business'; mult: number; durationSec: number }
  | { type: 'freeze'; sec: number }
  | { type: 'penalty'; mult: number; durationSec: number }
  | { type: 'gamble'; chance: number; win: ReadonlyArray<ScandalOutcome>; lose: ReadonlyArray<ScandalOutcome> }

export interface ScandalOption {
  label: string
  // Shown under the button so the player knows the stakes
  detail: string
  outcomes: ReadonlyArray<ScandalOutcome>
}

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

const OPPORTUNITIES: ReadonlyArray<MarketEventDef> = [
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
    subtitle: '50/50 Risk: 180s windfall OR a 15s freeze (automation stops, or income halves without it)',
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

// Scandals ask for a decision. The satire is always aimed at the player's
// own family when they take the cynical route.
export const SCANDALS: ReadonlyArray<MarketEventDef> = [
  {
    kind: 'leakedWhatsApps',
    title: 'Leaked WhatsApps!',
    subtitle: 'The "Lads on Tour (Board)" group chat has reached a journalist.',
    buffLabel: 'Free Publicity',
    rarity: 'rare',
    shady: true,
    effect: {
      type: 'scandal',
      ignored: [{ type: 'penalty', mult: 0.5, durationSec: 60 }],
      ignoredText: 'No comment was taken as a comment. The story runs and income halves for 60s.',
      options: [
        { label: 'Pay the hush money', detail: 'Costs 10% of cash.', outcomes: [{ type: 'cashLoss', share: 0.1 }] },
        {
          label: 'Ride it out',
          detail: '50/50: 3x business income for 30s, or income halved for 60s.',
          outcomes: [
            {
              type: 'gamble',
              chance: 0.5,
              win: [{ type: 'buff', target: 'business', mult: 3, durationSec: 30 }],
              lose: [{ type: 'penalty', mult: 0.5, durationSec: 60 }]
            }
          ]
        }
      ]
    }
  },
  {
    kind: 'nonDomQuestioned',
    title: 'Non-Dom Status Questioned!',
    subtitle: 'A select committee has noticed you "live" in a Monaco postbox.',
    buffLabel: 'Public Goodwill',
    rarity: 'rare',
    shady: true,
    effect: {
      type: 'scandal',
      ignored: [{ type: 'cashLoss', share: 0.08 }],
      ignoredText: 'HMRC decided for you: 8% of your cash, with interest.',
      options: [
        {
          label: 'Move it all offshore',
          detail: '90s windfall, then a 30s freeze while the lawyers work: automation stops, or income halves if you have none.',
          outcomes: [
            { type: 'windfall', seconds: 90 },
            { type: 'freeze', sec: 30 }
          ]
        },
        {
          label: 'Pay your taxes like everyone else',
          detail: 'Costs 5% of cash; the goodwill doubles click pay for 60s.',
          outcomes: [
            { type: 'cashLoss', share: 0.05 },
            { type: 'buff', target: 'click', mult: 2, durationSec: 60 }
          ]
        }
      ]
    }
  },
  {
    kind: 'secondHomeFlooded',
    title: 'Third Home Flooded!',
    subtitle: 'The moat at the Cotswolds place has burst its banks.',
    buffLabel: 'Insurance',
    rarity: 'common',
    shady: true,
    effect: {
      type: 'scandal',
      ignored: [{ type: 'freeze', sec: 20 }],
      ignoredText: 'Nobody answered the phone. The loss adjuster froze everything for 20s.',
      options: [
        { label: 'Claim on the insurance', detail: '60s windfall.', outcomes: [{ type: 'windfall', seconds: 60 }] },
        {
          label: 'Blame the council',
          detail: '50/50: a 180s compensation windfall, or a 20s freeze (automation stops, or income halves without it).',
          outcomes: [
            {
              type: 'gamble',
              chance: 0.5,
              win: [{ type: 'windfall', seconds: 180 }],
              lose: [{ type: 'freeze', sec: 20 }]
            }
          ]
        }
      ]
    }
  },
  {
    kind: 'internToThePress',
    title: 'Unpaid Intern Goes to the Press!',
    subtitle: 'Nine months of "exposure" turned out to be exposure after all.',
    buffLabel: 'Back Pay',
    rarity: 'common',
    shady: true,
    effect: {
      type: 'scandal',
      ignored: [{ type: 'penalty', mult: 0.5, durationSec: 45 }],
      ignoredText: 'Silence looked worse. Income halves for 45s while the story trends.',
      options: [
        {
          label: 'Pay them, finally',
          detail: 'Costs 3% of cash; a motivated workforce doubles click pay for 30s.',
          outcomes: [
            { type: 'cashLoss', share: 0.03 },
            { type: 'buff', target: 'click', mult: 2, durationSec: 30 }
          ]
        },
        {
          label: 'Call it a learning opportunity',
          detail: '50/50: it blows over, or income is halved for 45s.',
          outcomes: [{ type: 'gamble', chance: 0.5, win: [], lose: [{ type: 'penalty', mult: 0.5, durationSec: 45 }] }]
        }
      ]
    }
  }
]

// Every event that can spawn, scandals included
export const MARKET_EVENTS: ReadonlyArray<MarketEventDef> = [...OPPORTUNITIES, ...SCANDALS]

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

export function pickMarketEvent(rng: () => number = Math.random, includeScandals = true): MarketEventDef {
  const rarity = pickEventRarity(rng())
  const pool = MARKET_EVENTS.filter((e) => e.rarity === rarity && (includeScandals || e.effect.type !== 'scandal'))
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}
