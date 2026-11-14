export type ItemKind = 'jobs' | 'businesses'

export type Sector = 'food' | 'property' | 'finance' | 'infrastructure' | 'media' | 'services'

export interface JobDef {
  id: string
  label: string
  baseCost: number
  scaleFactor: number
  moneyPerClick: number
  synergyBusinessId: string
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
// - Each rung costs 200 x (1.19 + 0.022 x rung) times the rung below it, so a
//   rung pays back a little slower than the last, and the late rungs slow
//   most, which is what stops one generation from clearing every gate.
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
  { id: '1', label: 'Gig delivery rider', moneyPerClick: 1, baseCost: 130, scaleFactor: 1.11, synergyBusinessId: '5', synergyNote: 'Insulated e-bike fleet boosts Burger franchise', sector: 'services' },
  { id: '19', label: 'Hairdresser', moneyPerClick: 200, baseCost: 31_000, scaleFactor: 1.112, synergyBusinessId: '21', synergyNote: 'Clipper mastery boosts Skin-fade barbershop', sector: 'services' },
  { id: '2', label: 'Cleaner', moneyPerClick: 40_000, baseCost: 7_500_000, scaleFactor: 1.114, synergyBusinessId: '3', synergyNote: 'Gleaming espresso chrome boosts Coffee shop', sector: 'services' },
  { id: '3', label: 'Shelf filler', moneyPerClick: 8_000_000, baseCost: 1_900_000_000, scaleFactor: 1.116, synergyBusinessId: '20', synergyNote: 'Rapid screen-protector restocks boost Phone case & repair kiosk', sector: 'food' },
  { id: '4', label: 'Barista', moneyPerClick: 1_600_000_000, baseCost: 460_000_000_000, scaleFactor: 1.118, synergyBusinessId: '22', synergyNote: '£5.80 oat flat-whites boost Artisanal sourdough bakery', sector: 'food' },
  { id: '5', label: 'Teaching assistant', moneyPerClick: 320_000_000_000, baseCost: 120_000_000_000_000, scaleFactor: 1.12, synergyBusinessId: '1', synergyNote: 'Craft-cupboard side-hustles boost Etsy store', sector: 'services' },
  { id: '6', label: 'Fishmonger', moneyPerClick: 64_000_000_000_000, baseCost: 3.1e16, scaleFactor: 1.122, synergyBusinessId: '9', synergyNote: 'Morning market catch boosts Fish and chip shop', sector: 'food' },
  { id: '7', label: 'Receptionist', moneyPerClick: 1.3e16, baseCost: 8.2e18, scaleFactor: 1.124, synergyBusinessId: '2', synergyNote: 'Scope-creep gatekeeping boosts Freelance website design', sector: 'services' },
  { id: '20', label: 'Estate agent', moneyPerClick: 2.6e18, baseCost: 2.2e21, scaleFactor: 1.126, synergyBusinessId: '7', synergyNote: '0.5x wide-angle lenses boost Buy-to-let portfolio', sector: 'property' },
  { id: '8', label: 'Electrical engineer', moneyPerClick: 5.1e20, baseCost: 6e23, scaleFactor: 1.128, synergyBusinessId: '11', synergyNote: 'Grid load-shedding boosts Utilities provider', sector: 'infrastructure' },
  { id: '9', label: 'Tax expert', moneyPerClick: 1e23, baseCost: 1.7e26, scaleFactor: 1.13, synergyBusinessId: '4', synergyNote: 'Retail REIT business-rates relief boosts Neon vape shop', sector: 'finance' },
  { id: '12', label: 'Train driver', moneyPerClick: 2e25, baseCost: 4.7e28, scaleFactor: 1.132, synergyBusinessId: '12', synergyNote: 'Rest-day overtime boosts Railway provider', sector: 'infrastructure' },
  { id: '10', label: 'Private GP', moneyPerClick: 4.1e27, baseCost: 1.3e31, scaleFactor: 1.134, synergyBusinessId: '10', synergyNote: '£350 ten-minute consults boost Private health clinic', sector: 'services' },
  { id: '11', label: 'Management consultant', moneyPerClick: 8.2e29, baseCost: 3.9e33, scaleFactor: 1.136, synergyBusinessId: '6', synergyNote: 'Behavioural nudge slide-decks boost High-street bookies', sector: 'finance' },
  { id: '13', label: 'Broker', moneyPerClick: 1.6e32, baseCost: 1.2e36, scaleFactor: 1.138, synergyBusinessId: '14', synergyNote: 'High-frequency order flow boosts Mayfair hedge fund', sector: 'finance' },
  { id: '14', label: 'Financial manager', moneyPerClick: 3.3e34, baseCost: 3.5e38, scaleFactor: 1.14, synergyBusinessId: '17', synergyNote: 'Structured derivatives boost International bank', sector: 'finance' },
  { id: '15', label: 'IT director', moneyPerClick: 6.6e36, baseCost: 1.1e41, scaleFactor: 1.142, synergyBusinessId: '13', synergyNote: 'Mid-contract CPI+3.9% scripts boost Internet service provider', sector: 'media' },
  { id: '16', label: 'Corporate lawyer', moneyPerClick: 1.3e39, baseCost: 3.2e43, scaleFactor: 1.144, synergyBusinessId: '16', synergyNote: '70-year IP lock-in boosts Film studio', sector: 'finance' },
  { id: '17', label: 'Air traffic controller', moneyPerClick: 2.6e41, baseCost: 1e46, scaleFactor: 1.146, synergyBusinessId: '18', synergyNote: 'North Sea rig chopper slots boost Oil driller', sector: 'infrastructure' },
  { id: '18', label: 'Pilot', moneyPerClick: 5.2e43, baseCost: 3.2e48, scaleFactor: 1.148, synergyBusinessId: '8', synergyNote: 'Aerial land-banking surveys boost Construction firm', sector: 'infrastructure' },
  { id: '21', label: 'FTSE 100 CEO', moneyPerClick: 1e46, baseCost: 1e51, scaleFactor: 1.15, synergyBusinessId: '19', synergyNote: 'Share-buyback bonuses boost Multi-national conglomerate', sector: 'finance' },
  { id: '22', label: 'Non-dom peer', moneyPerClick: 2.1e48, baseCost: 3.4e53, scaleFactor: 1.152, synergyBusinessId: '23', synergyNote: 'House of Lords committee lunches boost PFI outsourcing giant', sector: 'finance' }
]

export const BUSINESSES: ReadonlyArray<BusinessDef> = [
  { id: '1', label: 'Etsy store', baseCost: 3_000, moneyPerSecond: 440, scaleFactor: 1.11, sector: 'services' },
  { id: '20', label: 'Phone case & repair kiosk', baseCost: 710_000, moneyPerSecond: 89_000, scaleFactor: 1.112, sector: 'services' },
  { id: '2', label: 'Freelance website design', baseCost: 170_000_000, moneyPerSecond: 18_000_000, scaleFactor: 1.114, sector: 'media' },
  { id: '3', label: 'Coffee shop', baseCost: 42_000_000_000, moneyPerSecond: 3_500_000_000, scaleFactor: 1.116, sector: 'food' },
  { id: '4', label: 'Neon vape shop', baseCost: 11_000_000_000_000, moneyPerSecond: 710_000_000_000, scaleFactor: 1.118, sector: 'services' },
  { id: '21', label: 'Skin-fade barbershop', baseCost: 2.7e15, moneyPerSecond: 140_000_000_000_000, scaleFactor: 1.12, sector: 'services' },
  { id: '5', label: 'Burger franchise', baseCost: 7.1e17, moneyPerSecond: 2.8e16, scaleFactor: 1.122, sector: 'food' },
  { id: '6', label: 'High-street bookies', baseCost: 1.9e20, moneyPerSecond: 5.7e18, scaleFactor: 1.124, sector: 'services' },
  { id: '7', label: 'Buy-to-let portfolio', baseCost: 5.1e22, moneyPerSecond: 1.1e21, scaleFactor: 1.126, sector: 'property' },
  { id: '8', label: 'Construction firm', baseCost: 1.4e25, moneyPerSecond: 2.3e23, scaleFactor: 1.128, sector: 'property' },
  { id: '9', label: 'Fish and chip shop', baseCost: 3.9e27, moneyPerSecond: 4.5e25, scaleFactor: 1.13, sector: 'food' },
  { id: '10', label: 'Private health clinic', baseCost: 1.1e30, moneyPerSecond: 9.1e27, scaleFactor: 1.132, sector: 'services' },
  { id: '11', label: 'Utilities provider', baseCost: 3.1e32, moneyPerSecond: 1.8e30, scaleFactor: 1.134, sector: 'infrastructure' },
  { id: '12', label: 'Railway provider', baseCost: 9.2e34, moneyPerSecond: 3.6e32, scaleFactor: 1.136, sector: 'infrastructure' },
  { id: '13', label: 'Internet service provider', baseCost: 2.7e37, moneyPerSecond: 7.3e34, scaleFactor: 1.138, sector: 'media' },
  { id: '14', label: 'Mayfair hedge fund', baseCost: 8.2e39, moneyPerSecond: 1.5e37, scaleFactor: 1.14, sector: 'finance' },
  { id: '16', label: 'Film studio', baseCost: 2.5e42, moneyPerSecond: 2.9e39, scaleFactor: 1.142, sector: 'media' },
  { id: '17', label: 'International bank', baseCost: 7.7e44, moneyPerSecond: 5.8e41, scaleFactor: 1.144, sector: 'finance' },
  { id: '18', label: 'Oil driller', baseCost: 2.4e47, moneyPerSecond: 1.2e44, scaleFactor: 1.146, sector: 'infrastructure' },
  { id: '22', label: 'Artisanal sourdough bakery', baseCost: 7.7e49, moneyPerSecond: 2.3e46, scaleFactor: 1.148, sector: 'food' },
  { id: '23', label: 'PFI outsourcing giant', baseCost: 2.5e52, moneyPerSecond: 4.6e48, scaleFactor: 1.15, sector: 'infrastructure' },
  { id: '19', label: 'Multi-national conglomerate', baseCost: 8.1e54, moneyPerSecond: 9.3e50, scaleFactor: 1.152, sector: 'finance' }
]

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
