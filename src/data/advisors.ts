import type { EventRarity } from './events'
import type { Sector } from './items'
import type { ModifierSource } from '../engine/modifiers'

export type AdvisorRole = 'buyer' | 'finance' | 'fixer' | 'property' | 'hospitality' | 'media'

export const ROLE_LABELS: Readonly<Record<AdvisorRole, string>> = {
  buyer: 'Buyer',
  finance: 'Finance',
  fixer: 'Fixer',
  property: 'Property',
  hospitality: 'Hospitality',
  media: 'Media'
}

// A lobbying campaign that builds the longer the advisor serves.
export interface Campaign {
  sector: Sector
  // Cheaper purchases in the sector, per minute in office, up to the cap
  costCutPerMin: number
  maxCostCut: number
  // Extra sector income per minute in office, up to the cap
  incomePerMin: number
  maxIncome: number
}

export interface AdvisorDef {
  id: string
  name: string
  rarity: EventRarity
  roles: ReadonlyArray<AdvisorRole>
  effectText: string
  costText: string
  // Share of current cash paid up front
  hireFeeShare: number
  // What they do, per copy in the office
  mods: ModifierSource
  // What they cost while employed, per copy (payrises scale this)
  upkeep: ModifierSource
  // Extra income per advisor in the office who has this role
  roleBonus?: { role: AdvisorRole; incomePerAdvisor: number }
  campaign?: Campaign
}

const FEE: Readonly<Record<EventRarity, number>> = { common: 0.05, rare: 0.12, legendary: 0.25 }

export const ADVISORS: ReadonlyArray<AdvisorDef> = [
  {
    id: 'accountant',
    name: 'Creative Accountant',
    rarity: 'common',
    roles: ['finance'],
    effectText: 'Windfalls are doubled. Nobody asks how.',
    costText: 'One-off fee only.',
    hireFeeShare: FEE.common,
    mods: { windfallMult: 2 },
    upkeep: {}
  },
  {
    id: 'property-guy',
    name: 'Property Guy',
    rarity: 'common',
    roles: ['property'],
    effectText: 'Property businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { property: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'personal-shopper',
    name: 'Personal Shopper',
    rarity: 'common',
    roles: ['buyer'],
    effectText: 'Everything costs 8% less. They know a man.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { purchaseCostMult: 0.92 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'spin-doctor',
    name: 'Spin Doctor',
    rarity: 'common',
    roles: ['fixer', 'media'],
    effectText: 'Opportunities turn up 25% more often.',
    costText: 'One-off fee only.',
    hireFeeShare: FEE.common,
    mods: { eventIntervalMult: 0.75 },
    upkeep: {}
  },
  {
    id: 'club-secretary',
    name: 'Golf Club Secretary',
    rarity: 'common',
    roles: ['fixer'],
    effectText: 'Boss fights last 20% longer. The committee can wait.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { bossTimeMult: 1.2 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'sommelier',
    name: 'Sommelier',
    rarity: 'common',
    roles: ['hospitality'],
    effectText: 'Food and drink businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { food: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'estate-manager',
    name: 'Estate Manager',
    rarity: 'common',
    roles: ['buyer'],
    effectText: 'Automation reaches 2% further towards the frontier.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { automationShareBonus: 0.02 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'productivity-guru',
    name: 'Productivity Guru',
    rarity: 'common',
    roles: ['media'],
    effectText: 'Clicks pay 50% more. Cold showers are mandatory.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { clickMult: 1.5 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'stockbroker',
    name: 'Stockbroker',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'Every ownership milestone is worth 1x more.',
    costText: 'Commission: 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { milestoneStepBonus: 1 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'head-of-finance',
    name: 'Head of Finance',
    rarity: 'rare',
    roles: ['finance'],
    effectText: '+10% income for each Finance advisor in the office, themselves included.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.rare,
    mods: {},
    upkeep: { incomeDrain: 0.01 },
    roleBonus: { role: 'finance', incomePerAdvisor: 0.1 }
  },
  {
    id: 'wealth-manager',
    name: 'Wealth Manager',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'The heir\'s trust fund grows by another 5% of the estate.',
    costText: 'Commission: purchases cost 1% more.',
    hireFeeShare: FEE.rare,
    mods: { trustFundShareAdd: 0.05 },
    upkeep: { purchaseCostMult: 1.01 }
  },
  {
    id: 'lobbyist',
    name: 'Lobbyist',
    rarity: 'rare',
    roles: ['fixer'],
    effectText: 'Boss twists bite 25% less hard.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { twistStrength: 0.75 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'media-consultant',
    name: 'Media Consultant',
    rarity: 'rare',
    roles: ['media'],
    effectText: 'Media businesses earn three times as much.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { media: 3 } },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'family-lawyer',
    name: 'Family Lawyer',
    rarity: 'rare',
    roles: ['fixer'],
    effectText: 'Scandals settle out of court: their cash costs, freezes and penalties are halved.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { scandalSeverity: 0.5 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'celebrity-chef',
    name: 'Celebrity Chef',
    rarity: 'rare',
    roles: ['hospitality', 'media'],
    effectText: 'Food and drink earn three times as much; clicks pay 20% more.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { food: 3 }, clickMult: 1.2 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'proxy',
    name: 'Proxy with Power of Attorney',
    rarity: 'legendary',
    roles: ['buyer'],
    effectText: 'Automation reaches 15% further towards the frontier.',
    costText: 'Commission: purchases cost 3% more.',
    hireFeeShare: FEE.legendary,
    mods: { automationShareBonus: 0.15 },
    upkeep: { purchaseCostMult: 1.03 }
  },
  {
    id: 'flour-campaigner',
    name: 'Flour Duty Campaigner',
    rarity: 'legendary',
    roles: ['fixer', 'hospitality'],
    effectText: 'Runs the Flour Duty Relief campaign: food gets 1% cheaper and earns 3% more for every minute in office (up to 50% cheaper and 150% more).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'food', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'planning-lobby',
    name: 'Planning Reform Lobbyist',
    rarity: 'legendary',
    roles: ['fixer', 'property'],
    effectText: 'Runs the "Get Britain Building (Second Homes)" campaign: property gets 1% cheaper and earns 3% more per minute in office (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'property', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'deregulation-campaigner',
    name: 'Light-Touch Campaigner',
    rarity: 'legendary',
    roles: ['fixer', 'finance'],
    effectText: 'Runs the "Unleash the City" campaign: finance gets 1% cheaper and earns 3% more per minute in office (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'finance', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'former-chancellor',
    name: 'Former Chancellor',
    rarity: 'legendary',
    roles: ['fixer', 'finance'],
    effectText: 'Businesses earn 50% more and boss twists bite 20% less. Available for after-dinner speeches.',
    costText: 'Takes 4% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { businessMult: 1.5, twistStrength: 0.8 },
    upkeep: { incomeDrain: 0.04 }
  }
]

export const ADVISORS_BY_ID: Readonly<Record<string, AdvisorDef>> = Object.fromEntries(ADVISORS.map((a) => [a.id, a]))
