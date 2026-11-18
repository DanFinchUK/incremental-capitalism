import { LADDER_TRIAL } from './trial'

export type ItemKind = 'jobs' | 'businesses'

export type Sector = 'food' | 'property' | 'finance' | 'infrastructure' | 'media' | 'services'

export interface JobDef {
  id: string
  label: string
  baseCost: number
  scaleFactor: number
  moneyPerClick: number
  synergyBusinessId: string
  // What the Job brings to its paired Business, as a phrase: "Insulated
  // e-bike fleet". The card adds the effect and the Business's name.
  synergyNote: string
  sector: Sector
}

export interface BusinessDef {
  id: string
  label: string
  baseCost: number
  scaleFactor: number
  moneyPerSecond: number
  sector: Sector
}

// Jobs and Businesses are two ladders on one price scale. The stats follow a
// rule rather than being picked one by one, so a tuning pass can move the
// whole curve (rungs counted from 0, in list order):
// - Each rung pays 200x the rung below it.
// - Each rung costs 200 x (2.05 + 0.01 x rung) times the rung below it, so a
//   rung pays back about twice as slowly as the last. Gates sit every 2.3
//   rungs, making each gate 4 to 5 times harder than the one before: the
//   prestige rule in docs/pacing.md.
// - Units get 11% dearer each, rising 0.2 points a rung. With milestones
//   doubling pay at 10, 25 and 50 owned, you need roughly 50 of a rung before
//   the next one is affordable (the pacing sim checks this).
// - The first Job costs £130 and pays £1 a tap, so it takes a few dozen taps.
// - Business rung k costs ten times what a Job at rung k + 0.15 would (about
//   half a rung above Job rung k), and pays per second what 20 taps a second
//   would earn from Jobs of the same price. Businesses carry the economy; a
//   fast tapper roughly keeps pace with them on Jobs.
// The class gates in data/classes.ts sit at set positions on this ladder.
export const JOBS: ReadonlyArray<JobDef> = [
  { id: '1', label: 'Gig delivery rider', moneyPerClick: 1, baseCost: 130, scaleFactor: 1.11, synergyBusinessId: '5', synergyNote: 'Insulated e-bike fleet', sector: 'services' },
  { id: '19', label: 'Hairdresser', moneyPerClick: 200, baseCost: 53_000, scaleFactor: 1.112, synergyBusinessId: '21', synergyNote: 'Highlights that overrun the ticket', sector: 'services' },
  { id: '2', label: 'Cleaner', moneyPerClick: 40_000, baseCost: 22_000_000, scaleFactor: 1.114, synergyBusinessId: '3', synergyNote: 'Gleaming espresso chrome', sector: 'services' },
  { id: '3', label: 'Shelf filler', moneyPerClick: 8_000_000, baseCost: 9_100_000_000, scaleFactor: 1.116, synergyBusinessId: '20', synergyNote: 'Rapid screen-protector restocks', sector: 'food' },
  { id: '4', label: 'Barista', moneyPerClick: 1_600_000_000, baseCost: 3_800_000_000_000, scaleFactor: 1.118, synergyBusinessId: '22', synergyNote: '£5.80 oat flat-whites', sector: 'food' },
  { id: '5', label: 'Teaching assistant', moneyPerClick: 320_000_000_000, baseCost: 1.6e15, scaleFactor: 1.12, synergyBusinessId: '1', synergyNote: 'Craft-cupboard side-hustles', sector: 'services' },
  { id: '6', label: 'Fishmonger', moneyPerClick: 64_000_000_000_000, baseCost: 6.6e17, scaleFactor: 1.122, synergyBusinessId: '9', synergyNote: 'Morning market catch', sector: 'food' },
  { id: '7', label: 'Receptionist', moneyPerClick: 1.3e16, baseCost: 2.8e20, scaleFactor: 1.124, synergyBusinessId: '2', synergyNote: 'Scope-creep gatekeeping', sector: 'services' },
  { id: '20', label: 'Estate agent', moneyPerClick: 2.6e18, baseCost: 1.2e23, scaleFactor: 1.126, synergyBusinessId: '7', synergyNote: '0.5x wide-angle lenses', sector: 'property' },
  { id: '8', label: 'Electrical engineer', moneyPerClick: 5.1e20, baseCost: 5.1e25, scaleFactor: 1.128, synergyBusinessId: '11', synergyNote: 'Grid load-shedding', sector: 'infrastructure' },
  { id: '9', label: 'Tax expert', moneyPerClick: 1e23, baseCost: 2.2e28, scaleFactor: 1.13, synergyBusinessId: '4', synergyNote: 'Rent-a-room relief claims', sector: 'finance' },
  { id: '12', label: 'Train driver', moneyPerClick: 2e25, baseCost: 9.3e30, scaleFactor: 1.132, synergyBusinessId: '12', synergyNote: 'Rest-day overtime', sector: 'infrastructure' },
  { id: '10', label: 'Private GP', moneyPerClick: 4.1e27, baseCost: 4e33, scaleFactor: 1.134, synergyBusinessId: '10', synergyNote: '£350 ten-minute consults', sector: 'services' },
  { id: '11', label: 'Management consultant', moneyPerClick: 8.2e29, baseCost: 1.7e36, scaleFactor: 1.136, synergyBusinessId: '6', synergyNote: 'Behavioural nudge slide-decks', sector: 'finance' },
  { id: '13', label: 'Broker', moneyPerClick: 1.6e32, baseCost: 7.6e38, scaleFactor: 1.138, synergyBusinessId: '14', synergyNote: 'High-frequency order flow', sector: 'finance' },
  { id: '14', label: 'Financial manager', moneyPerClick: 3.3e34, baseCost: 3.3e41, scaleFactor: 1.14, synergyBusinessId: '17', synergyNote: 'Structured derivatives', sector: 'finance' },
  { id: '15', label: 'IT director', moneyPerClick: 6.6e36, baseCost: 1.5e44, scaleFactor: 1.142, synergyBusinessId: '13', synergyNote: 'Mid-contract CPI+3.9% scripts', sector: 'media' },
  { id: '16', label: 'Corporate lawyer', moneyPerClick: 1.3e39, baseCost: 6.5e46, scaleFactor: 1.144, synergyBusinessId: '16', synergyNote: '70-year IP lock-in', sector: 'finance' },
  { id: '17', label: 'Air traffic controller', moneyPerClick: 2.6e41, baseCost: 2.9e49, scaleFactor: 1.146, synergyBusinessId: '18', synergyNote: 'Penthouse helipad slots', sector: 'infrastructure' },
  { id: '18', label: 'Pilot', moneyPerClick: 5.2e43, baseCost: 1.3e52, scaleFactor: 1.148, synergyBusinessId: '8', synergyNote: 'Aerial land-banking surveys', sector: 'infrastructure' },
  { id: '21', label: 'FTSE 100 CEO', moneyPerClick: 1e46, baseCost: 5.8e54, scaleFactor: 1.15, synergyBusinessId: '19', synergyNote: 'Share-buyback bonuses', sector: 'finance' },
  { id: '22', label: 'Non-dom peer', moneyPerClick: 2.1e48, baseCost: 2.6e57, scaleFactor: 1.152, synergyBusinessId: '23', synergyNote: 'House of Lords committee lunches', sector: 'finance' }
]

export const BUSINESSES: ReadonlyArray<BusinessDef> = [
  { id: '1', label: 'Etsy store', baseCost: 3_200, moneyPerSecond: 440, scaleFactor: 1.11, sector: 'services' },
  { id: '20', label: 'Phone case & repair kiosk', baseCost: 1_300_000, moneyPerSecond: 89_000, scaleFactor: 1.112, sector: 'media' },
  { id: '2', label: 'Freelance website design', baseCost: 540_000_000, moneyPerSecond: 18_000_000, scaleFactor: 1.114, sector: 'media' },
  { id: '3', label: 'Coffee shop', baseCost: 220_000_000_000, moneyPerSecond: 3_500_000_000, scaleFactor: 1.116, sector: 'food' },
  { id: '4', label: 'HMO bedsits', baseCost: 94_000_000_000_000, moneyPerSecond: 710_000_000_000, scaleFactor: 1.118, sector: 'property' },
  { id: '21', label: 'Hospital car park', baseCost: 3.9e16, moneyPerSecond: 140_000_000_000_000, scaleFactor: 1.12, sector: 'infrastructure' },
  { id: '5', label: 'Burger franchise', baseCost: 1.6e19, moneyPerSecond: 2.8e16, scaleFactor: 1.122, sector: 'food' },
  { id: '6', label: 'High-street bookies', baseCost: 6.9e21, moneyPerSecond: 5.7e18, scaleFactor: 1.124, sector: 'finance' },
  { id: '7', label: 'Buy-to-let portfolio', baseCost: 2.9e24, moneyPerSecond: 1.1e21, scaleFactor: 1.126, sector: 'property' },
  { id: '8', label: 'Construction firm', baseCost: 1.3e27, moneyPerSecond: 2.3e23, scaleFactor: 1.128, sector: 'infrastructure' },
  { id: '9', label: 'Fish and chip shop', baseCost: 5.4e29, moneyPerSecond: 4.5e25, scaleFactor: 1.13, sector: 'food' },
  { id: '10', label: 'Private health clinic', baseCost: 2.3e32, moneyPerSecond: 9.1e27, scaleFactor: 1.132, sector: 'services' },
  { id: '11', label: 'Utilities provider', baseCost: 1e35, moneyPerSecond: 1.8e30, scaleFactor: 1.134, sector: 'infrastructure' },
  { id: '12', label: 'Railway provider', baseCost: 4.3e37, moneyPerSecond: 3.6e32, scaleFactor: 1.136, sector: 'infrastructure' },
  { id: '13', label: 'Internet service provider', baseCost: 1.9e40, moneyPerSecond: 7.3e34, scaleFactor: 1.138, sector: 'media' },
  { id: '14', label: 'Mayfair hedge fund', baseCost: 8.3e42, moneyPerSecond: 1.5e37, scaleFactor: 1.14, sector: 'finance' },
  { id: '16', label: 'Film studio', baseCost: 3.7e45, moneyPerSecond: 2.9e39, scaleFactor: 1.142, sector: 'media' },
  { id: '17', label: 'International bank', baseCost: 1.6e48, moneyPerSecond: 5.8e41, scaleFactor: 1.144, sector: 'finance' },
  { id: '18', label: 'Luxury riverside towers', baseCost: 7.2e50, moneyPerSecond: 1.2e44, scaleFactor: 1.146, sector: 'property' },
  { id: '22', label: 'Artisanal sourdough bakery', baseCost: 3.2e53, moneyPerSecond: 2.3e46, scaleFactor: 1.148, sector: 'food' },
  { id: '23', label: 'PFI outsourcing giant', baseCost: 1.4e56, moneyPerSecond: 4.6e48, scaleFactor: 1.15, sector: 'services' },
  { id: '19', label: 'Multi-national conglomerate', baseCost: 6.5e58, moneyPerSecond: 9.3e50, scaleFactor: 1.152, sector: 'finance' }
]

// The ladder trial (data/trial.ts) swaps in a ladder built by a different
// rule, fitted with a model of a player climbing it:
// - Rung k's units get dearer by a step falling from 9.5% at the bottom to
//   3.2% at the top, so deep rungs are bought in hundreds, not tens.
// - The gap to the next rung is worth a growing number of this rung's units:
//   about 58 at the bottom (Rung 2 arrives around 50 of Rung 1) up to 279 at
//   the top, so by the deepest rungs the first ten are long since full.
// - Each rung pays back more slowly than the one below: 7.5x at the bottom,
//   easing to 3.6x by halfway up, where it stays. A class a rung up to the
//   Garden Party (around rung 10), then gentler: a title is about two rungs.
//   Each first purchase and each second one takes longer than the last.
// - Milestones are worth x4 rather than x2 (MILESTONE_BASE_STEP), so a rung
//   with many units still matters next to the newest.
// Businesses keep their place half a rung above the matching Job, as above.
export const TRIAL_LADDER = { stepLow: 1.0945, stepHigh: 1.0315, gapLow: 57.68, gapHigh: 279.48, paybackLow: 7.5, paybackHigh: 3.556, paybackBend: 0.5 }

interface TrialRung { cost: number; pay: number; step: number }

// The ladder's 22 rungs, and one beyond the top to price the last Business
function trialRungs(): TrialRung[] {
  const t = TRIAL_LADDER
  const n = JOBS.length
  const rungs: TrialRung[] = []
  let cost = 130
  let pay = 1
  for (let k = 0; k <= n; k++) {
    const f = Math.min(1, k / (n - 1))
    const step = t.stepLow + (t.stepHigh - t.stepLow) * f
    rungs.push({ cost, pay, step })
    const gap = t.gapLow + (t.gapHigh - t.gapLow) * f
    const payback = t.paybackLow * Math.pow(t.paybackHigh / t.paybackLow, Math.min(1, f / t.paybackBend))
    const costRatio = Math.pow(step, gap)
    cost *= costRatio
    pay *= costRatio / payback
  }
  return rungs
}

// A rung part of the way to the next one, priced and paid between the two
function trialAt(rungs: TrialRung[], position: number): TrialRung {
  const k = Math.min(rungs.length - 2, Math.floor(position))
  const f = position - k
  const a = rungs[k]
  const b = rungs[k + 1]
  return {
    cost: a.cost * Math.pow(b.cost / a.cost, f),
    pay: a.pay * Math.pow(b.pay / a.pay, f),
    step: a.step + (b.step - a.step) * f
  }
}

// Net worth at a point on the trial's Job ladder, for placing the classes
export function trialJobCostAt(position: number): number {
  return trialAt(trialRungs(), position).cost
}

if (LADDER_TRIAL) {
  const rungs = trialRungs()
  JOBS.forEach((job, k) => {
    const j = job as { baseCost: number; moneyPerClick: number; scaleFactor: number }
    j.baseCost = rungs[k].cost
    j.moneyPerClick = rungs[k].pay
    j.scaleFactor = rungs[k].step
  })
  BUSINESSES.forEach((biz, k) => {
    const b = biz as { baseCost: number; moneyPerSecond: number; scaleFactor: number }
    const at = trialAt(rungs, k + 0.15)
    b.baseCost = 10 * at.cost
    b.moneyPerSecond = 200 * at.pay
    b.scaleFactor = at.step
  })
}

export const JOBS_BY_ID: Readonly<Record<string, JobDef>> = Object.fromEntries(JOBS.map((j) => [j.id, j]))
export const BUSINESSES_BY_ID: Readonly<Record<string, BusinessDef>> = Object.fromEntries(BUSINESSES.map((b) => [b.id, b]))
export const SYNERGY_JOB_FOR_BUSINESS: Readonly<Record<string, JobDef>> = Object.fromEntries(JOBS.map((j) => [j.synergyBusinessId, j]))

export function itemImageUrl(kind: ItemKind, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, '-')
    .replace(/^-|-$/g, '')
  return `./img/${kind}/${slug}.png`
}
