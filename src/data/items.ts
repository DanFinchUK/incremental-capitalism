export type ItemKind = 'jobs' | 'businesses'

export interface JobDef {
  id: string
  label: string
  baseCost: number
  scaleFactor: number
  moneyPerClick: number
  synergyBusinessId: string
  synergyNote: string
}

export interface BusinessDef {
  id: string
  label: string
  baseCost: number
  scaleFactor: number
  moneyPerSecond: number
}

export const JOBS: ReadonlyArray<JobDef> = [
  { id: '1', label: 'Gig delivery rider', moneyPerClick: 30, baseCost: 20, scaleFactor: 1.1, synergyBusinessId: '5', synergyNote: 'Insulated e-bike fleet boosts Burger franchise' },
  { id: '19', label: 'Hairdresser', moneyPerClick: 90, baseCost: 350, scaleFactor: 1.14, synergyBusinessId: '21', synergyNote: 'Clipper mastery boosts Skin-fade barbershop' },
  { id: '2', label: 'Cleaner', moneyPerClick: 240, baseCost: 2500, scaleFactor: 1.18, synergyBusinessId: '3', synergyNote: 'Gleaming espresso chrome boosts Coffee shop' },
  { id: '3', label: 'Shelf filler', moneyPerClick: 460, baseCost: 8500, scaleFactor: 1.22, synergyBusinessId: '20', synergyNote: 'Rapid screen-protector restocks boost Phone case & repair kiosk' },
  { id: '4', label: 'Barista', moneyPerClick: 850, baseCost: 25_000, scaleFactor: 1.26, synergyBusinessId: '22', synergyNote: '£5.80 oat flat-whites boost Artisanal sourdough bakery' },
  { id: '5', label: 'Teaching assistant', moneyPerClick: 1450, baseCost: 65_000, scaleFactor: 1.3, synergyBusinessId: '1', synergyNote: 'Craft-cupboard side-hustles boost Etsy store' },
  { id: '6', label: 'Fishmonger', moneyPerClick: 2400, baseCost: 160_000, scaleFactor: 1.34, synergyBusinessId: '9', synergyNote: 'Morning market catch boosts Fish and chip shop' },
  { id: '7', label: 'Receptionist', moneyPerClick: 4000, baseCost: 400_000, scaleFactor: 1.38, synergyBusinessId: '2', synergyNote: 'Scope-creep gatekeeping boosts Freelance website design' },
  { id: '20', label: 'Estate agent', moneyPerClick: 6800, baseCost: 950_000, scaleFactor: 1.42, synergyBusinessId: '7', synergyNote: '0.5x wide-angle lenses boost Buy-to-let portfolio' },
  { id: '8', label: 'Electrical engineer', moneyPerClick: 12_000, baseCost: 2_400_000, scaleFactor: 1.46, synergyBusinessId: '11', synergyNote: 'Grid load-shedding boosts Utilities provider' },
  { id: '9', label: 'Tax expert', moneyPerClick: 21_000, baseCost: 6_000_000, scaleFactor: 1.5, synergyBusinessId: '4', synergyNote: 'Retail REIT business-rates relief boosts Neon vape shop' },
  { id: '12', label: 'Train driver', moneyPerClick: 38_000, baseCost: 15_000_000, scaleFactor: 1.54, synergyBusinessId: '12', synergyNote: 'Rest-day overtime boosts Railway provider' },
  { id: '10', label: 'Private GP', moneyPerClick: 72_000, baseCost: 38_000_000, scaleFactor: 1.58, synergyBusinessId: '10', synergyNote: '£350 ten-minute consults boost Private health clinic' },
  { id: '11', label: 'Management consultant', moneyPerClick: 135_000, baseCost: 95_000_000, scaleFactor: 1.63, synergyBusinessId: '6', synergyNote: 'Behavioural nudge slide-decks boost High-street bookies' },
  { id: '13', label: 'Broker', moneyPerClick: 265_000, baseCost: 240_000_000, scaleFactor: 1.68, synergyBusinessId: '14', synergyNote: 'High-frequency order flow boosts Mayfair hedge fund' },
  { id: '14', label: 'Financial manager', moneyPerClick: 520_000, baseCost: 600_000_000, scaleFactor: 1.73, synergyBusinessId: '17', synergyNote: 'Structured derivatives boost International bank' },
  { id: '15', label: 'IT director', moneyPerClick: 1_000_000, baseCost: 1_500_000_000, scaleFactor: 1.78, synergyBusinessId: '13', synergyNote: 'Mid-contract CPI+3.9% scripts boost Internet service provider' },
  { id: '16', label: 'Corporate lawyer', moneyPerClick: 2_100_000, baseCost: 4_000_000_000, scaleFactor: 1.83, synergyBusinessId: '16', synergyNote: '70-year IP lock-in boosts Film studio' },
  { id: '17', label: 'Air traffic controller', moneyPerClick: 4_600_000, baseCost: 11_000_000_000, scaleFactor: 1.88, synergyBusinessId: '18', synergyNote: 'North Sea rig chopper slots boost Oil driller' },
  { id: '18', label: 'Pilot', moneyPerClick: 10_000_000, baseCost: 30_000_000_000, scaleFactor: 1.92, synergyBusinessId: '8', synergyNote: 'Aerial land-banking surveys boost Construction firm' },
  { id: '21', label: 'FTSE 100 CEO', moneyPerClick: 24_000_000, baseCost: 90_000_000_000, scaleFactor: 1.96, synergyBusinessId: '19', synergyNote: 'Share-buyback bonuses boost Multi-national conglomerate' },
  { id: '22', label: 'Non-dom peer', moneyPerClick: 64_000_000, baseCost: 300_000_000_000, scaleFactor: 2.0, synergyBusinessId: '23', synergyNote: 'House of Lords committee lunches boost PFI outsourcing giant' }
]

export const BUSINESSES: ReadonlyArray<BusinessDef> = [
  { id: '1', label: 'Etsy store', baseCost: 20_000, moneyPerSecond: 2500, scaleFactor: 1.2 },
  { id: '20', label: 'Phone case & repair kiosk', baseCost: 65_000, moneyPerSecond: 4600, scaleFactor: 1.23 },
  { id: '2', label: 'Freelance website design', baseCost: 200_000, moneyPerSecond: 8000, scaleFactor: 1.26 },
  { id: '3', label: 'Coffee shop', baseCost: 750_000, moneyPerSecond: 14_800, scaleFactor: 1.3 },
  { id: '4', label: 'Neon vape shop', baseCost: 2_500_000, moneyPerSecond: 26_500, scaleFactor: 1.34 },
  { id: '21', label: 'Skin-fade barbershop', baseCost: 6_500_000, moneyPerSecond: 42_500, scaleFactor: 1.38 },
  { id: '5', label: 'Burger franchise', baseCost: 16_000_000, moneyPerSecond: 68_500, scaleFactor: 1.42 },
  { id: '6', label: 'High-street bookies', baseCost: 45_000_000, moneyPerSecond: 120_000, scaleFactor: 1.46 },
  { id: '7', label: 'Buy-to-let portfolio', baseCost: 115_000_000, moneyPerSecond: 205_000, scaleFactor: 1.5 },
  { id: '8', label: 'Construction firm', baseCost: 280_000_000, moneyPerSecond: 348_000, scaleFactor: 1.55 },
  { id: '9', label: 'Fish and chip shop', baseCost: 650_000_000, moneyPerSecond: 610_000, scaleFactor: 1.6 },
  { id: '10', label: 'Private health clinic', baseCost: 1_500_000_000, moneyPerSecond: 1_140_000, scaleFactor: 1.65 },
  { id: '11', label: 'Utilities provider', baseCost: 4_500_000_000, moneyPerSecond: 2_850_000, scaleFactor: 1.7 },
  { id: '12', label: 'Railway provider', baseCost: 14_000_000_000, moneyPerSecond: 7_950_000, scaleFactor: 1.74 },
  { id: '13', label: 'Internet service provider', baseCost: 35_000_000_000, moneyPerSecond: 18_000_000, scaleFactor: 1.78 },
  { id: '14', label: 'Mayfair hedge fund', baseCost: 85_000_000_000, moneyPerSecond: 40_800_000, scaleFactor: 1.82 },
  { id: '16', label: 'Film studio', baseCost: 200_000_000_000, moneyPerSecond: 89_000_000, scaleFactor: 1.86 },
  { id: '17', label: 'International bank', baseCost: 480_000_000_000, moneyPerSecond: 199_000_000, scaleFactor: 1.9 },
  { id: '18', label: 'Oil driller', baseCost: 1_100_000_000_000, moneyPerSecond: 428_000_000, scaleFactor: 1.94 },
  { id: '22', label: 'Artisanal sourdough bakery', baseCost: 2_600_000_000_000, moneyPerSecond: 965_000_000, scaleFactor: 1.98 },
  { id: '23', label: 'PFI outsourcing giant', baseCost: 6_500_000_000_000, moneyPerSecond: 2_280_000_000, scaleFactor: 2.02 },
  { id: '19', label: 'Multi-national conglomerate', baseCost: 18_000_000_000_000, moneyPerSecond: 5_950_000_000, scaleFactor: 2.05 }
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
