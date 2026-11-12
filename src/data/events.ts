export type MarketEventKind = 'bullRun' | 'overtimeFrenzy' | 'taxRebate' | 'shadyDeal'

export interface MarketEventDef {
  kind: MarketEventKind
  title: string
  subtitle: string
  shady: boolean
  baseDurationSec: number
}

export const MARKET_EVENTS: ReadonlyArray<MarketEventDef> = [
  {
    kind: 'bullRun',
    title: 'Quantitative Easing!',
    subtitle: '5x Business income for 20s',
    shady: false,
    baseDurationSec: 20
  },
  {
    kind: 'overtimeFrenzy',
    title: 'Mandatory Unpaid Overtime!',
    subtitle: '7x Click income for 15s',
    shady: false,
    baseDurationSec: 15
  },
  {
    kind: 'taxRebate',
    title: 'Non-Dom Tax Rebate!',
    subtitle: 'Instant 60s passive windfall',
    shady: false,
    baseDurationSec: 0
  },
  {
    kind: 'shadyDeal',
    title: 'Shady VIP-Lane Tip-Off',
    subtitle: '50/50 Risk: 180s windfall OR 15s auto-buy freeze',
    shady: true,
    baseDurationSec: 0
  }
]
