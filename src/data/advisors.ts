import type { EventRarity } from './events'
import type { Sector } from './items'
import type { ModifierSource } from '../engine/modifiers'

export type AdvisorRole =
  | 'buyer'
  | 'finance'
  | 'fixer'
  | 'property'
  | 'hospitality'
  | 'media'
  | 'infrastructure'
  | 'services'
  | 'household'

export const ROLE_LABELS: Readonly<Record<AdvisorRole, string>> = {
  buyer: 'Buyer',
  finance: 'Finance',
  fixer: 'Fixer',
  property: 'Property',
  hospitality: 'Hospitality',
  media: 'Media',
  infrastructure: 'Infrastructure',
  services: 'Services',
  household: 'Household'
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
  // The effect this advisor brings; every family has one advisor per rarity
  family: string
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
  // A buyer presses Buy on one list for you each second (engine/buyers.ts).
  // You keep one of each: hiring another replaces the first
  buyer?: 'jobs' | 'businesses'
  // Extra income per advisor in the office who has this role
  roleBonus?: { role: AdvisorRole; incomePerAdvisor: number }
  campaign?: Campaign
}

const FEE: Readonly<Record<EventRarity, number>> = { common: 0.05, rare: 0.12, legendary: 0.25 }

// Every effect comes in three tiers: each family has a common, a rare and a
// legendary advisor, and the buff grows with rarity (so does the upkeep).
export const ADVISORS: ReadonlyArray<AdvisorDef> = [
  {
    id: 'life-coach',
    name: 'Life Coach',
    family: 'clicks',
    rarity: 'common',
    roles: ['media'],
    effectText: 'Clicks pay 25% more. Says "grind" unironically.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { clickMult: 1.25 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'productivity-guru',
    name: 'Productivity Guru',
    family: 'clicks',
    rarity: 'rare',
    roles: ['media'],
    effectText: 'Clicks pay 50% more. Cold showers are mandatory.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.rare,
    mods: { clickMult: 1.5 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'hustle-billionaire',
    name: 'Hustle Billionaire',
    family: 'clicks',
    rarity: 'legendary',
    roles: ['media'],
    effectText: 'Clicks pay double. Wakes at 4am, mostly to post about it.',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { clickMult: 2 },
    upkeep: { incomeDrain: 0.03 }
  },
  {
    id: 'management-consultant',
    name: 'Management Consultant',
    family: 'business',
    rarity: 'common',
    roles: ['finance'],
    effectText: 'Businesses earn 15% more. Bills by the slide.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { businessMult: 1.15 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'turnaround-specialist',
    name: 'Turnaround Specialist',
    family: 'business',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'Businesses earn 30% more. Turned around a pension fund, once.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { businessMult: 1.3 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'former-chancellor',
    name: 'Former Chancellor',
    family: 'business',
    rarity: 'legendary',
    roles: ['fixer', 'finance'],
    effectText: 'Businesses earn 50% more and ordeal twists bite 20% less. Available for after-dinner speeches.',
    costText: 'Takes 4% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { businessMult: 1.5, twistStrength: 0.8 },
    upkeep: { incomeDrain: 0.04 }
  },
  {
    id: 'personal-shopper',
    name: 'Personal Shopper',
    family: 'costs',
    rarity: 'common',
    roles: ['buyer'],
    effectText: 'Everything costs 8% less. They know a man.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { purchaseCostMult: 0.92 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'procurement-director',
    name: 'Procurement Director',
    family: 'costs',
    rarity: 'rare',
    roles: ['buyer'],
    effectText: 'Everything costs 15% less. Three quotes, all from cousins.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { purchaseCostMult: 0.85 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'oligarch-fixer',
    name: 'Oligarch\'s Fixer',
    family: 'costs',
    rarity: 'legendary',
    roles: ['buyer'],
    effectText: 'Everything costs 25% less. Nobody asks where it fell off.',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { purchaseCostMult: 0.75 },
    upkeep: { incomeDrain: 0.03 }
  },
  {
    id: 'estate-manager',
    name: 'Estate Manager',
    family: 'acquisitions',
    rarity: 'common',
    roles: ['buyer'],
    buyer: 'businesses',
    effectText: 'Buys Businesses for you: up to 20% of your cash a second, one kind at a time. Walks the grounds with a clipboard.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: {},
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'head-butler',
    name: 'Head Butler',
    family: 'acquisitions',
    rarity: 'rare',
    roles: ['buyer', 'household'],
    buyer: 'businesses',
    effectText: 'Buys Businesses for you: up to 40% of your cash a second, two kinds at a time. Runs the household, and now the holdings.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: {},
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'proxy',
    name: 'Proxy with Power of Attorney',
    family: 'acquisitions',
    rarity: 'legendary',
    roles: ['buyer'],
    buyer: 'businesses',
    effectText: 'Buys Businesses for you: up to 60% of your cash a second, three kinds at a time. Signs for everything.',
    costText: 'Commission: purchases cost 3% more.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { purchaseCostMult: 1.03 }
  },
  {
    id: 'temp-agency',
    name: 'Temping Agency',
    family: 'recruiting',
    rarity: 'common',
    roles: ['buyer'],
    buyer: 'jobs',
    effectText: 'Takes on Jobs for you: up to 20% of your cash a second, one kind at a time. Sends whoever was free.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: {},
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'recruitment-consultant',
    name: 'Recruitment Consultant',
    family: 'recruiting',
    rarity: 'rare',
    roles: ['buyer', 'services'],
    buyer: 'jobs',
    effectText: 'Takes on Jobs for you: up to 40% of your cash a second, two kinds at a time. Calls everyone "a rockstar".',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: {},
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'executive-search',
    name: 'Executive Search Partner',
    family: 'recruiting',
    rarity: 'legendary',
    roles: ['buyer', 'finance'],
    buyer: 'jobs',
    effectText: 'Takes on Jobs for you: up to 60% of your cash a second, three kinds at a time. Only places people they were at school with.',
    costText: 'Commission: purchases cost 3% more.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { purchaseCostMult: 1.03 }
  },
  {
    id: 'accountant',
    name: 'Creative Accountant',
    family: 'windfalls',
    rarity: 'common',
    roles: ['finance'],
    effectText: 'Windfalls are doubled. Nobody asks how.',
    costText: 'One-off fee only.',
    hireFeeShare: FEE.common,
    mods: { windfallMult: 2 },
    upkeep: {}
  },
  {
    id: 'offshore-banker',
    name: 'Offshore Banker',
    family: 'windfalls',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'Windfalls are tripled, via the Caymans.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.rare,
    mods: { windfallMult: 3 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'tax-haven-architect',
    name: 'Tax Haven Architect',
    family: 'windfalls',
    rarity: 'legendary',
    roles: ['finance'],
    effectText: 'Windfalls are five times bigger and arrive in four jurisdictions at once.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { windfallMult: 5 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'spin-doctor',
    name: 'Spin Doctor',
    family: 'events',
    rarity: 'common',
    roles: ['fixer', 'media'],
    effectText: 'Opportunities turn up 25% more often.',
    costText: 'One-off fee only.',
    hireFeeShare: FEE.common,
    mods: { eventIntervalMult: 0.75 },
    upkeep: {}
  },
  {
    id: 'pr-agency-boss',
    name: 'PR Agency Boss',
    family: 'events',
    rarity: 'rare',
    roles: ['fixer', 'media'],
    effectText: 'Opportunities turn up 60% more often.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.rare,
    mods: { eventIntervalMult: 0.6 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'former-press-secretary',
    name: 'Former Press Secretary',
    family: 'events',
    rarity: 'legendary',
    roles: ['fixer', 'media'],
    effectText: 'Opportunities turn up more than twice as often. Knows which stories to bury.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { eventIntervalMult: 0.45 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'club-secretary',
    name: 'Golf Club Secretary',
    family: 'bossTime',
    rarity: 'common',
    roles: ['fixer'],
    effectText: 'Ordeals last 20% longer. The committee can wait.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { bossTimeMult: 1.2 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'party-whip',
    name: 'Party Whip',
    family: 'bossTime',
    rarity: 'rare',
    roles: ['fixer'],
    effectText: 'Ordeals last 35% longer. Filibusters on request.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { bossTimeMult: 1.35 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'permanent-secretary',
    name: 'Permanent Secretary',
    family: 'bossTime',
    rarity: 'legendary',
    roles: ['fixer'],
    effectText: 'Ordeals last 50% longer. Yes, Minister.',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { bossTimeMult: 1.5 },
    upkeep: { incomeDrain: 0.03 }
  },
  {
    id: 'parliamentary-researcher',
    name: 'Parliamentary Researcher',
    family: 'twists',
    rarity: 'common',
    roles: ['fixer'],
    effectText: 'Ordeal twists bite 15% less hard.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { twistStrength: 0.85 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'lobbyist',
    name: 'Lobbyist',
    family: 'twists',
    rarity: 'rare',
    roles: ['fixer'],
    effectText: 'Ordeal twists bite 25% less hard.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { twistStrength: 0.75 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'friendly-peer',
    name: 'Friendly Life Peer',
    family: 'twists',
    rarity: 'legendary',
    roles: ['fixer'],
    effectText: 'Ordeal twists bite 40% less hard. Owes the family a favour.',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { twistStrength: 0.6 },
    upkeep: { incomeDrain: 0.03 }
  },
  {
    id: 'reputation-manager',
    name: 'Reputation Manager',
    family: 'scandals',
    rarity: 'common',
    roles: ['fixer'],
    effectText: 'Scandals hurt a quarter less: cash costs, freezes and penalties.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { scandalSeverity: 0.75 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'family-lawyer',
    name: 'Family Lawyer',
    family: 'scandals',
    rarity: 'rare',
    roles: ['fixer'],
    effectText: 'Scandals settle out of court: their cash costs, freezes and penalties are halved.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { scandalSeverity: 0.5 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'injunction-kc',
    name: 'Super-Injunction KC',
    family: 'scandals',
    rarity: 'legendary',
    roles: ['fixer'],
    effectText: 'Scandals barely surface: their cash costs, freezes and penalties are cut by three quarters.',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { scandalSeverity: 0.25 },
    upkeep: { incomeDrain: 0.03 }
  },
  {
    id: 'trust-administrator',
    name: 'Trust Administrator',
    family: 'trustFund',
    rarity: 'common',
    roles: ['finance'],
    effectText: 'The heir\'s trust fund grows by another 2% of the estate.',
    costText: 'Commission: purchases cost 0.5% more.',
    hireFeeShare: FEE.common,
    mods: { trustFundShareAdd: 0.02 },
    upkeep: { purchaseCostMult: 1.005 }
  },
  {
    id: 'wealth-manager',
    name: 'Wealth Manager',
    family: 'trustFund',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'The heir\'s trust fund grows by another 5% of the estate.',
    costText: 'Commission: purchases cost 1% more.',
    hireFeeShare: FEE.rare,
    mods: { trustFundShareAdd: 0.05 },
    upkeep: { purchaseCostMult: 1.01 }
  },
  {
    id: 'dynasty-planner',
    name: 'Dynasty Planner',
    family: 'trustFund',
    rarity: 'legendary',
    roles: ['finance'],
    effectText: 'The heir\'s trust fund grows by another 10% of the estate.',
    costText: 'Commission: purchases cost 2% more.',
    hireFeeShare: FEE.legendary,
    mods: { trustFundShareAdd: 0.1 },
    upkeep: { purchaseCostMult: 1.02 }
  },
  {
    id: 'day-trader',
    name: 'Day Trader',
    family: 'milestones',
    rarity: 'common',
    roles: ['finance'],
    effectText: 'Every ownership milestone is worth 0.5x more.',
    costText: 'Commission: 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { milestoneStepBonus: 0.5 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'stockbroker',
    name: 'Stockbroker',
    family: 'milestones',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'Every ownership milestone is worth 1x more.',
    costText: 'Commission: 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { milestoneStepBonus: 1 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'hedge-fund-founder',
    name: 'Hedge Fund Founder',
    family: 'milestones',
    rarity: 'legendary',
    roles: ['finance'],
    effectText: 'Every ownership milestone is worth 1.5x more.',
    costText: 'Commission: 4% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { milestoneStepBonus: 1.5 },
    upkeep: { incomeDrain: 0.04 }
  },
  {
    id: 'finance-clerk',
    name: 'Finance Clerk',
    family: 'financeTeam',
    rarity: 'common',
    roles: ['finance'],
    effectText: '+5% income for each Finance advisor in the office, themselves included.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: {},
    upkeep: { incomeDrain: 0.01 },
    roleBonus: { role: 'finance', incomePerAdvisor: 0.05 }
  },
  {
    id: 'head-of-finance',
    name: 'Head of Finance',
    family: 'financeTeam',
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
    id: 'group-cfo',
    name: 'Group CFO',
    family: 'financeTeam',
    rarity: 'legendary',
    roles: ['finance'],
    effectText: '+20% income for each Finance advisor in the office, themselves included.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.02 },
    roleBonus: { role: 'finance', incomePerAdvisor: 0.2 }
  },
  {
    id: 'sommelier',
    name: 'Sommelier',
    family: 'food',
    rarity: 'common',
    roles: ['hospitality'],
    effectText: 'Food and drink businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { food: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'celebrity-chef',
    name: 'Celebrity Chef',
    family: 'food',
    rarity: 'rare',
    roles: ['hospitality', 'media'],
    effectText: 'Food and drink earn three times as much; clicks pay 20% more.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { food: 3 }, clickMult: 1.2 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'flour-campaigner',
    name: 'Flour Duty Campaigner',
    family: 'food',
    rarity: 'legendary',
    roles: ['fixer', 'hospitality'],
    effectText: 'The Flour Duty Relief campaign: each minute in office, food costs 1% less and earns 3% more (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'food', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'property-guy',
    name: 'Property Guy',
    family: 'property',
    rarity: 'common',
    roles: ['property'],
    effectText: 'Property businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { property: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'buy-to-let-baron',
    name: 'Buy-to-Let Baron',
    family: 'property',
    rarity: 'rare',
    roles: ['property'],
    effectText: 'Property businesses earn three times as much. Has never fixed a boiler.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { property: 3 } },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'planning-lobby',
    name: 'Planning Reform Lobbyist',
    family: 'property',
    rarity: 'legendary',
    roles: ['fixer', 'property'],
    effectText: 'The "Get Britain Building (Second Homes)" campaign: each minute in office, property costs 1% less and earns 3% more (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'property', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'bank-manager',
    name: 'Bank Manager',
    family: 'finance',
    rarity: 'common',
    roles: ['finance'],
    effectText: 'Finance businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { finance: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'fund-manager',
    name: 'Fund Manager',
    family: 'finance',
    rarity: 'rare',
    roles: ['finance'],
    effectText: 'Finance businesses earn three times as much. Fees on the fees.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { finance: 3 } },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'deregulation-campaigner',
    name: 'Light-Touch Campaigner',
    family: 'finance',
    rarity: 'legendary',
    roles: ['fixer', 'finance'],
    effectText: 'The "Unleash the City" campaign: each minute in office, finance costs 1% less and earns 3% more (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'finance', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'influencer-agent',
    name: 'Influencer Agent',
    family: 'media',
    rarity: 'common',
    roles: ['media'],
    effectText: 'Media businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { media: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'media-consultant',
    name: 'Media Consultant',
    family: 'media',
    rarity: 'rare',
    roles: ['media'],
    effectText: 'Media businesses earn three times as much.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { media: 3 } },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'licence-fee-campaigner',
    name: 'Licence Fee Campaigner',
    family: 'media',
    rarity: 'legendary',
    roles: ['fixer', 'media'],
    effectText: 'The "Scrap the Licence Fee" campaign: each minute in office, media costs 1% less and earns 3% more (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'media', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'site-foreman',
    name: 'Site Foreman',
    family: 'infrastructure',
    rarity: 'common',
    roles: ['infrastructure'],
    effectText: 'Infrastructure businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { infrastructure: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'pfi-consultant',
    name: 'PFI Consultant',
    family: 'infrastructure',
    rarity: 'rare',
    roles: ['infrastructure'],
    effectText: 'Infrastructure businesses earn three times as much. The hospital is yours for 30 years.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { infrastructure: 3 } },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'privatisation-campaigner',
    name: 'Privatisation Campaigner',
    family: 'infrastructure',
    rarity: 'legendary',
    roles: ['fixer', 'infrastructure'],
    effectText: 'The "Sell the Railways (Again)" campaign: each minute in office, infrastructure costs 1% less and earns 3% more (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'infrastructure', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'outsourcing-manager',
    name: 'Outsourcing Manager',
    family: 'services',
    rarity: 'common',
    roles: ['services'],
    effectText: 'Services businesses earn double.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.common,
    mods: { sectorBusinessMult: { services: 2 } },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'contracts-director',
    name: 'Public Contracts Director',
    family: 'services',
    rarity: 'rare',
    roles: ['services'],
    effectText: 'Services businesses earn three times as much. No tender required.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.rare,
    mods: { sectorBusinessMult: { services: 3 } },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'vip-lane-lobbyist',
    name: 'VIP Lane Lobbyist',
    family: 'services',
    rarity: 'legendary',
    roles: ['fixer', 'services'],
    effectText: 'The "Fast-Track Contracts" campaign: each minute in office, services cost 1% less and earn 3% more (up to 50% and 150%).',
    costText: 'Takes 3% of all income.',
    hireFeeShare: FEE.legendary,
    mods: {},
    upkeep: { incomeDrain: 0.03 },
    campaign: { sector: 'services', costCutPerMin: 0.01, maxCostCut: 0.5, incomePerMin: 0.03, maxIncome: 1.5 }
  },
  {
    id: 'benefits-adviser',
    name: 'Benefits Adviser',
    family: 'allowance',
    rarity: 'common',
    roles: ['household'],
    effectText: 'Adds 100% to your base allowance. Knows every form.',
    costText: 'One-off fee only.',
    hireFeeShare: FEE.common,
    mods: { allowanceTapsAdd: 2 },
    upkeep: {}
  },
  {
    id: 'family-trustee',
    name: 'Family Trustee',
    family: 'allowance',
    rarity: 'rare',
    roles: ['household'],
    effectText: 'Adds 250% to your base allowance.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.rare,
    mods: { allowanceTapsAdd: 5 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'sovereign-grant-adviser',
    name: 'Sovereign Grant Adviser',
    family: 'allowance',
    rarity: 'legendary',
    roles: ['household'],
    effectText: 'Adds 500% to your base allowance. Funded by the taxpayer, naturally.',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { allowanceTapsAdd: 10 },
    upkeep: { incomeDrain: 0.02 }
  },
  {
    id: 'house-sitter',
    name: 'House Sitter',
    family: 'offline',
    rarity: 'common',
    roles: ['household'],
    effectText: 'While you are away, you earn 10% more of your passive income.',
    costText: 'One-off fee only.',
    hireFeeShare: FEE.common,
    mods: { offlineEfficiencyAdd: 0.1 },
    upkeep: {}
  },
  {
    id: 'night-manager',
    name: 'Night Manager',
    family: 'offline',
    rarity: 'rare',
    roles: ['household'],
    effectText: 'While you are away, you earn 25% more of your passive income.',
    costText: 'Takes 1% of all income.',
    hireFeeShare: FEE.rare,
    mods: { offlineEfficiencyAdd: 0.25 },
    upkeep: { incomeDrain: 0.01 }
  },
  {
    id: 'monaco-family-office',
    name: 'Monaco Family Office',
    family: 'offline',
    rarity: 'legendary',
    roles: ['household', 'finance'],
    effectText: 'While you are away, you earn 50% more of your passive income (up to all of it).',
    costText: 'Takes 2% of all income.',
    hireFeeShare: FEE.legendary,
    mods: { offlineEfficiencyAdd: 0.5 },
    upkeep: { incomeDrain: 0.02 }
  }
]

export const ADVISORS_BY_ID: Readonly<Record<string, AdvisorDef>> = Object.fromEntries(ADVISORS.map((a) => [a.id, a]))
