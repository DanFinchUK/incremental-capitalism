// Family office rules: advisor effects and upkeep, the Personal Assistants'
// promotions and honours, lobbying campaigns and role bonuses.
import { ADVISORS, ADVISORS_BY_ID, type AdvisorDef, type Campaign } from '../data/advisors'
import { pickEventRarity, type EventRarity } from '../data/events'
import type { Sector } from '../data/items'
import type { ModifierSource } from './modifiers'

export interface AdvisorInstance {
  uid: string
  advisorId: string
  // Generations served in a PA chair. A PA is promoted one tier every
  // SERVICE_GENERATIONS_PER_TIER: up their advisor family's rarities, then
  // through the honours
  servedGenerations: number
  // Active time in office, which drives lobbying campaigns
  campaignMs: number
}

export const BASE_OFFICE_SEATS = 3
export const SERVICE_GENERATIONS_PER_TIER = 1
// Tiers: 0 common, 1 rare, 2 legendary, then honours earned only by service
export const HONOURS: ReadonlyArray<string> = ['MBE', 'OBE', 'Knighthood', 'Peerage']
export const MAX_TIER = 2 + HONOURS.length
// Each tier past what the family offers adds this much of its best advisor's
// effect (and pay): a peer is three times a legendary
export const HONOUR_STEP = 0.5
// A PA's child arrives one tier below them, never above Legendary: honours aren't inherited
export const CHILD_MAX_TIER = 2

const RARITY_TIER: Readonly<Record<EventRarity, number>> = { common: 0, rare: 1, legendary: 2 }

// The advisor in a family at a tier, or its best below that
function familyAdvisorAt(family: string, tier: number): AdvisorDef | undefined {
  let best: AdvisorDef | undefined
  for (const a of ADVISORS) {
    if (a.family !== family || RARITY_TIER[a.rarity] > tier) continue
    if (!best || RARITY_TIER[a.rarity] > RARITY_TIER[best.rarity]) best = a
  }
  return best
}

// A buyer is worth offering only if they'd beat the one you have for that list
export function buyerTierOf(kind: 'jobs' | 'businesses', seats: ReadonlyArray<AdvisorInstance | null>, chairs: ReadonlyArray<AdvisorInstance | null>): number {
  let best = -1
  for (const s of seats) if (s && ADVISORS_BY_ID[s.advisorId]?.buyer === kind) best = Math.max(best, paTier(s))
  for (const p of chairs) if (p && ADVISORS_BY_ID[p.advisorId]?.buyer === kind) best = Math.max(best, paTier(p))
  return best
}

export function rarityTier(a: AdvisorDef): number {
  return RARITY_TIER[a.rarity]
}

export function paTier(inst: AdvisorInstance): number {
  const hired = ADVISORS_BY_ID[inst.advisorId]
  if (!hired) return 0
  return Math.min(MAX_TIER, RARITY_TIER[hired.rarity] + Math.floor(inst.servedGenerations / SERVICE_GENERATIONS_PER_TIER))
}

export interface PaStanding {
  tier: number
  // The advisor they now work as: promoted up the family where it goes
  def: AdvisorDef
  // The honour they hold, if any
  honour: string | null
  // Effect and pay, against def's own
  scale: number
  // Who they were hired as, when that differs
  hiredAs: AdvisorDef | null
  // Generations until the next promotion, or null at the top
  nextPromotionIn: number | null
}

export function paStanding(inst: AdvisorInstance): PaStanding | null {
  const hired = ADVISORS_BY_ID[inst.advisorId]
  if (!hired) return null
  const tier = paTier(inst)
  const def = familyAdvisorAt(hired.family, tier) ?? hired
  const scale = 1 + HONOUR_STEP * Math.max(0, tier - RARITY_TIER[def.rarity])
  const honour = tier > 2 ? HONOURS[tier - 3] : null
  const nextPromotionIn =
    tier >= MAX_TIER ? null : SERVICE_GENERATIONS_PER_TIER - (inst.servedGenerations % SERVICE_GENERATIONS_PER_TIER)
  return { tier, def, honour, scale, hiredAs: def.id === hired.id ? null : hired, nextPromotionIn }
}

// How a PA is named on screen: "Head Butler", "Head Butler, MBE"
export function paTitle(standing: PaStanding): string {
  if (!standing.honour) return standing.def.name
  if (standing.honour === 'Knighthood') return `${standing.def.name}, knighted`
  if (standing.honour === 'Peerage') return `${standing.def.name}, now in the Lords`
  return `${standing.def.name}, ${standing.honour}`
}

// At elevation a PA hands over to their child, who grew up around the job:
// one tier below the parent, never above Legendary, with no service yet
export function childOf(inst: AdvisorInstance, uid: string): AdvisorInstance | null {
  const hired = ADVISORS_BY_ID[inst.advisorId]
  if (!hired) return null
  const tier = Math.max(0, Math.min(paTier(inst) - 1, CHILD_MAX_TIER))
  const def = familyAdvisorAt(hired.family, tier) ?? hired
  return { uid, advisorId: def.id, servedGenerations: 0, campaignMs: 0 }
}

const PRODUCT_KEYS = [
  'clickMult',
  'businessMult',
  'purchaseCostMult',
  'legacyScale',
  'trustFundMult',
  'eventIntervalMult',
  'bossTimeMult',
  'scandalSeverity',
  'twistStrength',
  'windfallMult'
] as const

const SUM_KEYS = [
  'incomeDrain',
  'milestoneStepBonus',
  'trustFundShareAdd',
  'shadyBonus',
  'buyerItemTypes',
  'allowanceTapsAdd',
  'offlineEfficiencyAdd'
] as const

function scaleSector(map: Partial<Record<Sector, number>> | undefined, factor: number): Partial<Record<Sector, number>> | undefined {
  if (!map) return undefined
  const out: Partial<Record<Sector, number>> = {}
  for (const [sector, mult] of Object.entries(map) as Array<[Sector, number]>) {
    out[sector] = mult ** factor
  }
  return out
}

// Scale a source's strength. Multipliers scale geometrically (m ** factor),
// so a "lower is better" multiplier shrinks towards zero but never reaches
// it; additive bonuses grow linearly.
export function scaleSource(src: ModifierSource, factor: number): ModifierSource {
  const out: ModifierSource = { ...src }
  for (const key of PRODUCT_KEYS) {
    if (src[key] !== undefined) out[key] = src[key]! ** factor
  }
  for (const key of SUM_KEYS) {
    if (src[key] !== undefined) out[key] = src[key]! * factor
  }
  out.sectorBusinessMult = scaleSector(src.sectorBusinessMult, factor)
  out.sectorCostMult = scaleSector(src.sectorCostMult, factor)
  return out
}

export function campaignSource(campaign: Campaign, campaignMs: number): ModifierSource {
  const minutes = campaignMs / 60_000
  const cut = Math.min(campaign.maxCostCut, campaign.costCutPerMin * minutes)
  const boost = Math.min(campaign.maxIncome, campaign.incomePerMin * minutes)
  return {
    sectorCostMult: { [campaign.sector]: 1 - cut },
    sectorBusinessMult: { [campaign.sector]: 1 + boost }
  }
}

// A PA works as their promoted advisor, scaled by any honours; pay follows
// Promotions and honours are earned in a PA chair, but kept wherever the
// advisor sits afterwards: they've earned them
function sourcesFor(def: AdvisorDef, inst: AdvisorInstance): ModifierSource[] {
  const standing = paStanding(inst)
  if (!standing) return [def.mods, def.upkeep]
  return [scaleSource(standing.def.mods, standing.scale), scaleSource(standing.def.upkeep, standing.scale)]
}

// Every modifier source the office contributes, PAs and open seats alike
export function officeModifierSources(advisors: ReadonlyArray<AdvisorInstance>): ModifierSource[] {
  const sources: ModifierSource[] = []
  // Campaigners for the same cause pool their time: the cap is shared, so
  // duplicates reach it sooner rather than doubling it.
  const campaignTime = new Map<string, { campaign: Campaign; ms: number }>()
  for (const inst of advisors) {
    const def = ADVISORS_BY_ID[inst.advisorId]
    if (!def) continue
    sources.push(...sourcesFor(def, inst))
    if (def.campaign) {
      const pooled = campaignTime.get(def.id) ?? { campaign: def.campaign, ms: 0 }
      pooled.ms += inst.campaignMs
      campaignTime.set(def.id, pooled)
    }
    if (def.roleBonus) {
      const count = advisors.filter((a) => ADVISORS_BY_ID[a.advisorId]?.roles.includes(def.roleBonus!.role)).length
      const mult = 1 + def.roleBonus.incomePerAdvisor * count
      sources.push({ businessMult: mult, clickMult: mult })
    }
  }
  for (const { campaign, ms } of campaignTime.values()) {
    sources.push(campaignSource(campaign, ms))
  }
  return sources
}

// The allowance family only does anything while playing without tapping, so
// the headhunter only brings them then
// skip: advisors not worth offering, such as a buyer no better than yours
export function rollAdvisorOffer(rng: () => number, noTap = false, skip: (a: AdvisorDef) => boolean = () => false): string[] {
  const offer: string[] = []
  for (let guard = 0; offer.length < 3 && guard < 50; guard++) {
    const rarity = pickEventRarity(rng())
    const pool = ADVISORS.filter(
      (a) => a.rarity === rarity && !offer.includes(a.id) && (noTap || a.family !== 'allowance') && !skip(a)
    )
    if (pool.length === 0) continue
    offer.push(pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id)
  }
  return offer
}
