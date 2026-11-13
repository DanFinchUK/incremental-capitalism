// Family office rules: advisor effects and upkeep, the Personal Assistant's
// seniority and payrises, lobbying campaigns and role bonuses.
import { ADVISORS, ADVISORS_BY_ID, type AdvisorDef, type Campaign } from '../data/advisors'
import { pickEventRarity } from '../data/events'
import type { Sector } from '../data/items'
import type { ModifierSource } from './modifiers'

export interface AdvisorInstance {
  uid: string
  advisorId: string
  // Generations served in the PA chair
  servedGenerations: number
  // Active time in office, which drives lobbying campaigns
  campaignMs: number
}

export const BASE_OFFICE_SEATS = 3
export const SENIORITY_PER_GENERATION = 0.25
export const PAYRISE_PER_GENERATION = 0.2

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

const SUM_KEYS = ['incomeDrain', 'milestoneStepBonus', 'trustFundShareAdd', 'shadyBonus', 'automationShareBonus'] as const

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

function sourcesFor(def: AdvisorDef, inst: AdvisorInstance, isPA: boolean): ModifierSource[] {
  const seniority = isPA ? 1 + SENIORITY_PER_GENERATION * inst.servedGenerations : 1
  const payrise = isPA ? 1 + PAYRISE_PER_GENERATION * inst.servedGenerations : 1
  return [scaleSource(def.mods, seniority), scaleSource(def.upkeep, payrise)]
}

// Every modifier source the office contributes. paUid marks the PA.
export function officeModifierSources(advisors: ReadonlyArray<AdvisorInstance>, paUid: string | null): ModifierSource[] {
  const sources: ModifierSource[] = []
  // Campaigners for the same cause pool their time: the cap is shared, so
  // duplicates reach it sooner rather than doubling it.
  const campaignTime = new Map<string, { campaign: Campaign; ms: number }>()
  for (const inst of advisors) {
    const def = ADVISORS_BY_ID[inst.advisorId]
    if (!def) continue
    sources.push(...sourcesFor(def, inst, inst.uid === paUid))
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

export function rollAdvisorOffer(rng: () => number): string[] {
  const offer: string[] = []
  for (let guard = 0; offer.length < 3 && guard < 50; guard++) {
    const rarity = pickEventRarity(rng())
    const pool = ADVISORS.filter((a) => a.rarity === rarity && !offer.includes(a.id))
    if (pool.length === 0) continue
    offer.push(pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))].id)
  }
  return offer
}
