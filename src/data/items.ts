
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

// The numbers each rung takes from the ladder
type LadderStats = 'baseCost' | 'scaleFactor' | 'moneyPerClick' | 'moneyPerSecond'

const JOB_LIST: ReadonlyArray<Omit<JobDef, LadderStats>> = [
  { id: '1', label: 'Gig delivery rider', synergyBusinessId: '5', synergyNote: 'Insulated e-bike fleet', sector: 'services' },
  { id: '19', label: 'Hairdresser', synergyBusinessId: '21', synergyNote: 'Highlights that overrun the ticket', sector: 'services' },
  { id: '2', label: 'Cleaner', synergyBusinessId: '3', synergyNote: 'Gleaming espresso chrome', sector: 'services' },
  { id: '3', label: 'Shelf filler', synergyBusinessId: '20', synergyNote: 'Rapid screen-protector restocks', sector: 'food' },
  { id: '4', label: 'Barista', synergyBusinessId: '22', synergyNote: '£5.80 oat flat-whites', sector: 'food' },
  { id: '5', label: 'Teaching assistant', synergyBusinessId: '1', synergyNote: 'Craft-cupboard side-hustles', sector: 'services' },
  { id: '6', label: 'Fishmonger', synergyBusinessId: '9', synergyNote: 'Morning market catch', sector: 'food' },
  { id: '7', label: 'Receptionist', synergyBusinessId: '2', synergyNote: 'Scope-creep gatekeeping', sector: 'services' },
  { id: '20', label: 'Estate agent', synergyBusinessId: '7', synergyNote: '0.5x wide-angle lenses', sector: 'property' },
  { id: '8', label: 'Electrical engineer', synergyBusinessId: '11', synergyNote: 'Grid load-shedding', sector: 'infrastructure' },
  { id: '9', label: 'Tax expert', synergyBusinessId: '4', synergyNote: 'Rent-a-room relief claims', sector: 'finance' },
  { id: '12', label: 'Train driver', synergyBusinessId: '12', synergyNote: 'Rest-day overtime', sector: 'infrastructure' },
  { id: '10', label: 'Private GP', synergyBusinessId: '10', synergyNote: '£350 ten-minute consults', sector: 'services' },
  { id: '11', label: 'Management consultant', synergyBusinessId: '6', synergyNote: 'Behavioural nudge slide-decks', sector: 'finance' },
  { id: '13', label: 'Broker', synergyBusinessId: '14', synergyNote: 'High-frequency order flow', sector: 'finance' },
  { id: '14', label: 'Financial manager', synergyBusinessId: '17', synergyNote: 'Structured derivatives', sector: 'finance' },
  { id: '15', label: 'IT director', synergyBusinessId: '13', synergyNote: 'Mid-contract CPI+3.9% scripts', sector: 'media' },
  { id: '16', label: 'Corporate lawyer', synergyBusinessId: '16', synergyNote: '70-year IP lock-in', sector: 'finance' },
  { id: '17', label: 'Air traffic controller', synergyBusinessId: '18', synergyNote: 'Penthouse helipad slots', sector: 'infrastructure' },
  { id: '18', label: 'Pilot', synergyBusinessId: '8', synergyNote: 'Aerial land-banking surveys', sector: 'infrastructure' },
  { id: '21', label: 'FTSE 100 CEO', synergyBusinessId: '19', synergyNote: 'Share-buyback bonuses', sector: 'finance' },
  { id: '22', label: 'Non-dom peer', synergyBusinessId: '23', synergyNote: 'House of Lords committee lunches', sector: 'finance' }
]

const BUSINESS_LIST: ReadonlyArray<Omit<BusinessDef, LadderStats>> = [
  { id: '1', label: 'Etsy store', sector: 'services' },
  { id: '20', label: 'Phone case & repair kiosk', sector: 'media' },
  { id: '2', label: 'Freelance website design', sector: 'media' },
  { id: '3', label: 'Coffee shop', sector: 'food' },
  { id: '4', label: 'HMO bedsits', sector: 'property' },
  { id: '21', label: 'Hospital car park', sector: 'infrastructure' },
  { id: '5', label: 'Burger franchise', sector: 'food' },
  { id: '6', label: 'High-street bookies', sector: 'finance' },
  { id: '7', label: 'Buy-to-let portfolio', sector: 'property' },
  { id: '8', label: 'Construction firm', sector: 'infrastructure' },
  { id: '9', label: 'Fish and chip shop', sector: 'food' },
  { id: '10', label: 'Private health clinic', sector: 'services' },
  { id: '11', label: 'Utilities provider', sector: 'infrastructure' },
  { id: '12', label: 'Railway provider', sector: 'infrastructure' },
  { id: '13', label: 'Internet service provider', sector: 'media' },
  { id: '14', label: 'Mayfair hedge fund', sector: 'finance' },
  { id: '16', label: 'Film studio', sector: 'media' },
  { id: '17', label: 'International bank', sector: 'finance' },
  { id: '18', label: 'Luxury riverside towers', sector: 'property' },
  { id: '22', label: 'Artisanal sourdough bakery', sector: 'food' },
  { id: '23', label: 'PFI outsourcing giant', sector: 'services' },
  { id: '19', label: 'Multi-national conglomerate', sector: 'finance' }
]

// Jobs and Businesses are two ladders on one price scale, built by a rule
// rather than picked one by one, so a tuning pass can move the whole curve
// (rungs counted from 0, in list order). The rule was fitted with a model of
// a player climbing it:
// - Rung k's units get dearer by a step falling from 9.5% at the bottom to
//   3.2% at the top, so deep rungs are bought in hundreds, not tens.
// - The gap to the next rung is worth a growing number of this rung's units:
//   about 58 at the bottom (Rung 2 arrives around 50 of Rung 1) up to 279 at
//   the top, so by the deepest rungs the first ten are long since full.
// - Each rung pays back more slowly than the one below: 7.5x at the bottom,
//   easing to 3.6x by halfway up, where it stays. A class a rung up to the
//   Garden Party (around rung 10), then gentler: a title is about two rungs.
//   Each first purchase and each second one takes longer than the last.
// - Each milestone multiplies a rung's pay by 4 (MILESTONE_BASE_STEP), so a
//   rung with many units still matters next to the newest.
// - The first Job costs £130 and pays £1 a tap.
// - Business rung k costs ten times what a Job at rung k + 0.15 would (about
//   half a rung above Job rung k), and pays a second what 200 taps on that
//   Job would. Businesses carry the economy.
// The class gates in data/classes.ts sit at set positions on this ladder.
export const LADDER = { stepLow: 1.0945, stepHigh: 1.0315, gapLow: 57.68, gapHigh: 279.48, paybackLow: 7.5, paybackHigh: 3.556, paybackBend: 0.5 }

interface Rung { cost: number; pay: number; step: number }

// The ladder's 22 rungs, and one beyond the top to price the last Business
function ladderRungs(n: number): Rung[] {
  const t = LADDER
  const rungs: Rung[] = []
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
function ladderAt(rungs: Rung[], position: number): Rung {
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

const RUNGS = ladderRungs(JOB_LIST.length)

// Net worth at a point on the Job ladder, for placing the classes
export function jobCostAt(position: number): number {
  return ladderAt(RUNGS, position).cost
}

export const JOBS: ReadonlyArray<JobDef> = JOB_LIST.map((job, k) => ({
  ...job,
  baseCost: RUNGS[k].cost,
  moneyPerClick: RUNGS[k].pay,
  scaleFactor: RUNGS[k].step
}))

export const BUSINESSES: ReadonlyArray<BusinessDef> = BUSINESS_LIST.map((biz, k) => {
  const at = ladderAt(RUNGS, k + 0.15)
  return { ...biz, baseCost: 10 * at.cost, moneyPerSecond: 200 * at.pay, scaleFactor: at.step }
})

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
