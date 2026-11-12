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
  { id: '1', label: 'Hairdresser', moneyPerClick: 30, baseCost: 20, scaleFactor: 1.1, synergyBusinessId: '1', synergyNote: 'Craft gossip boosts Etsy store' },
  { id: '2', label: 'Cleaner', moneyPerClick: 300, baseCost: 2500, scaleFactor: 1.15, synergyBusinessId: '4', synergyNote: 'Spotless marble boosts High-end café' },
  { id: '3', label: 'Shelf filler', moneyPerClick: 450, baseCost: 7500, scaleFactor: 1.2, synergyBusinessId: '9', synergyNote: 'Supply chain boosts National restaurant chain' },
  { id: '4', label: 'Housekeeper', moneyPerClick: 750, baseCost: 18_000, scaleFactor: 1.25, synergyBusinessId: '7', synergyNote: 'Crisp linen boosts Events organisation' },
  { id: '5', label: 'Teaching assistant', moneyPerClick: 1200, baseCost: 50_000, scaleFactor: 1.3, synergyBusinessId: '2', synergyNote: 'Evening coding boosts Freelance website design' },
  { id: '6', label: 'Fishmonger', moneyPerClick: 1800, baseCost: 75_000, scaleFactor: 1.35, synergyBusinessId: '5', synergyNote: 'Market trade boosts Burger franchise' },
  { id: '7', label: 'Receptionist', moneyPerClick: 2550, baseCost: 125_000, scaleFactor: 1.4, synergyBusinessId: '6', synergyNote: 'Gatekeeping boosts Small design studio' },
  { id: '8', label: 'Electrical engineer', moneyPerClick: 3450, baseCost: 250_000, scaleFactor: 1.45, synergyBusinessId: '11', synergyNote: 'Substation upgrades boost Utilities provider' },
  { id: '9', label: 'Tax expert', moneyPerClick: 4500, baseCost: 750_000, scaleFactor: 1.5, synergyBusinessId: '10', synergyNote: 'Creative relief boosts Local bank' },
  { id: '10', label: 'Health professional', moneyPerClick: 6000, baseCost: 1_250_000, scaleFactor: 1.55, synergyBusinessId: '3', synergyNote: 'Night-shift espresso boosts Coffee shop' },
  { id: '11', label: 'Prison officer', moneyPerClick: 7500, baseCost: 3_000_000, scaleFactor: 1.6, synergyBusinessId: '8', synergyNote: 'PFI tenders boost Construction firm' },
  { id: '12', label: 'Train driver', moneyPerClick: 15_000, baseCost: 6_000_000, scaleFactor: 1.65, synergyBusinessId: '12', synergyNote: 'Timetable mastery boosts Railway provider' },
  { id: '13', label: 'Broker', moneyPerClick: 37_500, baseCost: 13_500_000, scaleFactor: 1.7, synergyBusinessId: '14', synergyNote: 'Order flow boosts Regional bank' },
  { id: '14', label: 'Financial manager', moneyPerClick: 75_000, baseCost: 40_000_000, scaleFactor: 1.75, synergyBusinessId: '17', synergyNote: 'Offshore desks boost International bank' },
  { id: '15', label: 'IT director', moneyPerClick: 150_000, baseCost: 95_000_000, scaleFactor: 1.8, synergyBusinessId: '13', synergyNote: 'Peering deals boost Internet service provider' },
  { id: '16', label: 'Lawyer', moneyPerClick: 225_000, baseCost: 200_000_000, scaleFactor: 1.85, synergyBusinessId: '16', synergyNote: 'IP lock-in boosts Film studio' },
  { id: '17', label: 'Air traffic controller', moneyPerClick: 360_000, baseCost: 500_000_000, scaleFactor: 1.9, synergyBusinessId: '18', synergyNote: 'Rig heliports boost Oil driller' },
  { id: '18', label: 'Pilot', moneyPerClick: 600_000, baseCost: 1_250_000_000, scaleFactor: 1.95, synergyBusinessId: '19', synergyNote: 'Corporate jets boost Multi-national conglomerate' }
]

export const BUSINESSES: ReadonlyArray<BusinessDef> = [
  { id: '1', label: 'Etsy store', baseCost: 20_000, moneyPerSecond: 3000, scaleFactor: 1.2 },
  { id: '2', label: 'Freelance website design', baseCost: 100_000, moneyPerSecond: 9000, scaleFactor: 1.25 },
  { id: '3', label: 'Coffee shop', baseCost: 750_000, moneyPerSecond: 16_500, scaleFactor: 1.3 },
  { id: '4', label: 'High-end café', baseCost: 5_500_000, moneyPerSecond: 30_000, scaleFactor: 1.35 },
  { id: '5', label: 'Burger franchise', baseCost: 12_500_000, moneyPerSecond: 75_000, scaleFactor: 1.4 },
  { id: '6', label: 'Small design studio', baseCost: 50_000_000, moneyPerSecond: 120_000, scaleFactor: 1.45 },
  { id: '7', label: 'Events organisation', baseCost: 100_000_000, moneyPerSecond: 180_000, scaleFactor: 1.5 },
  { id: '8', label: 'Construction firm', baseCost: 250_000_000, moneyPerSecond: 300_000, scaleFactor: 1.55 },
  { id: '9', label: 'National restaurant chain', baseCost: 500_000_000, moneyPerSecond: 450_000, scaleFactor: 1.6 },
  { id: '10', label: 'Local bank', baseCost: 1_000_000_000, moneyPerSecond: 1_050_000, scaleFactor: 1.65 },
  { id: '11', label: 'Utilities provider', baseCost: 4_500_000_000, moneyPerSecond: 3_600_000, scaleFactor: 1.7 },
  { id: '12', label: 'Railway provider', baseCost: 15_000_000_000, moneyPerSecond: 9_000_000, scaleFactor: 1.75 },
  { id: '13', label: 'Internet service provider', baseCost: 30_000_000_000, moneyPerSecond: 18_000_000, scaleFactor: 1.8 },
  { id: '14', label: 'Regional bank', baseCost: 50_000_000_000, moneyPerSecond: 30_000_000, scaleFactor: 1.85 },
  { id: '16', label: 'Film studio', baseCost: 120_000_000_000, moneyPerSecond: 75_000_000, scaleFactor: 1.9 },
  { id: '17', label: 'International bank', baseCost: 250_000_000_000, moneyPerSecond: 150_000_000, scaleFactor: 1.95 },
  { id: '18', label: 'Oil driller', baseCost: 1_000_000_000_000, moneyPerSecond: 600_000_000, scaleFactor: 2.0 },
  { id: '19', label: 'Multi-national conglomerate', baseCost: 10_000_000_000_000, moneyPerSecond: 6_000_000_000, scaleFactor: 2.05 }
]

export const JOBS_BY_ID: Readonly<Record<string, JobDef>> = Object.fromEntries(JOBS.map((j) => [j.id, j]))
export const BUSINESSES_BY_ID: Readonly<Record<string, BusinessDef>> = Object.fromEntries(BUSINESSES.map((b) => [b.id, b]))
export const SYNERGY_JOB_FOR_BUSINESS: Readonly<Record<string, JobDef>> = Object.fromEntries(JOBS.map((j) => [j.synergyBusinessId, j]))

export function itemImageUrl(kind: ItemKind, label: string): string {
  const slug = label.toLowerCase().replace(/ /g, '-')
  return `./img/${kind}/${slug}.png`
}
