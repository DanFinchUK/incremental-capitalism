import type { EventRarity } from './events'
import { pickEventRarity } from './events'
import type { ModifierSource } from '../engine/modifiers'

export interface HeirTrait {
  id: string
  name: string
  rarity: EventRarity
  description: string
  mods: ModifierSource
}

export interface Heir {
  name: string
  // null for the founder, who arrived before anyone thought to write it down
  traitId: string | null
}

// Every trait is a trade-off. The joke is always on the dynasty.
export const HEIR_TRAITS: ReadonlyArray<HeirTrait> = [
  {
    id: 'old-etonian',
    name: 'Old Etonian',
    rarity: 'common',
    description: 'The old school tie opens every door: boss targets are 40% lower. The hands have never done a day\'s work, so clicks pay 25% less.',
    mods: { bossTargetMult: 0.6, clickMult: 0.75 }
  },
  {
    id: 'black-sheep',
    name: 'Black Sheep',
    rarity: 'common',
    description: 'Dropped out of Oxford to "disrupt" things. Businesses earn double; clicking is beneath them, so clicks pay half.',
    mods: { businessMult: 2, clickMult: 0.5 }
  },
  {
    id: 'gap-year',
    name: 'Gap Year Philanthropist',
    rarity: 'common',
    description: 'Found themselves in three continents and a hedge fund. Boss fights last 50% longer, but the foundation quietly takes 3% of all income.',
    mods: { bossTimeMult: 1.5, incomeDrain: 0.03 }
  },
  {
    id: 'hedge-fund-bro',
    name: 'Hedge Fund Bro',
    rarity: 'common',
    description: 'Lives on the trading floor and three espressos. Opportunities appear twice as often, and a lot more of them are shady.',
    mods: { eventIntervalMult: 0.5, shadyBonus: 0.25 }
  },
  {
    id: 'influencer',
    name: 'Lifestyle Influencer',
    rarity: 'common',
    description: 'Monetises the family\'s every breakfast. Clicks pay double, but everything is bought at the brand-deal markup: purchases cost 15% more.',
    mods: { clickMult: 2, purchaseCostMult: 1.15 }
  },
  {
    id: 'nepo-baby',
    name: 'Nepo Baby',
    rarity: 'rare',
    description: 'Inherits like a professional. The trust fund is tripled, but they refuse to supervise interns, so none of yours turn up.',
    mods: { trustFundMult: 3, internsDisabled: true }
  },
  {
    id: 'reformed-socialist',
    name: 'Reformed Socialist',
    rarity: 'rare',
    description: 'Read one pamphlet at university and never recovered. Legacy is worth half as much, but every Job pays five times over.',
    mods: { legacyScale: 0.5, clickMult: 5 }
  },
  {
    id: 'property-developer',
    name: 'Property Developer',
    rarity: 'rare',
    description: 'Sees a meadow and thinks "luxury flats". Property earns five times as much and costs 25% less; everything else earns 20% less.',
    mods: { businessMult: 0.8, sectorBusinessMult: { property: 5 }, sectorCostMult: { property: 0.75 } }
  },
  {
    id: 'tax-exile',
    name: 'Tax Exile',
    rarity: 'rare',
    description: 'Runs the family from a yacht off Monaco. Boss twists bite half as hard, and windfalls arrive doubled, untouched by HMRC.',
    mods: { twistStrength: 0.5, windfallMult: 2 }
  },
  {
    id: 'landed-gentry',
    name: 'Landed Gentry',
    rarity: 'rare',
    description: 'Has staff for the staff. Automation reaches 5% further towards the frontier, but clicks pay 20% less.',
    mods: { automationShareBonus: 0.05, clickMult: 0.8 }
  },
  {
    id: 'the-favourite',
    name: 'The Favourite',
    rarity: 'legendary',
    description: 'Granny\'s clear favourite and everyone knows it. Clicks and businesses earn 50% more, and boss fights last 25% longer.',
    mods: { clickMult: 1.5, businessMult: 1.5, bossTimeMult: 1.25 }
  },
  {
    id: 'media-baron',
    name: 'Media Baron',
    rarity: 'legendary',
    description: 'Owns three newspapers and the opinions in them. Media earns six times as much, opportunities come faster, and windfalls are 50% bigger.',
    mods: { sectorBusinessMult: { media: 6 }, eventIntervalMult: 0.6, windfallMult: 1.5 }
  }
]

export const TRAITS_BY_ID: Readonly<Record<string, HeirTrait>> = Object.fromEntries(HEIR_TRAITS.map((t) => [t.id, t]))

const FIRST_NAMES: ReadonlyArray<string> = [
  'Araminta', 'Tarquin', 'Clementine', 'Rupert', 'Hugo', 'Ottoline', 'Montgomery', 'Persephone',
  'Barnaby', 'Wilhelmina', 'Peregrine', 'Cressida', 'Jolyon', 'Honoria', 'Ptolemy', 'Saffron',
  'Algernon', 'Philippa', 'Crispin', 'Allegra', 'Fenella', 'Ludo', 'Tamsin', 'Hector'
]

const SURNAME_PARTS: ReadonlyArray<string> = [
  'Fitzwilliam', 'Hobbs', 'Pemberton', 'Ashcombe', 'Thistlewaite', 'Carrington', 'Mountjoy',
  'Featherstonehaugh', 'Rees', 'Montague', 'Crumble', 'Worthington', 'Blythe', 'Smythe', 'Fortescue'
]

const NUMERALS: ReadonlyArray<string> = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']

function pick<T>(rng: () => number, items: ReadonlyArray<T>): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

export function generateSurname(rng: () => number): string {
  const first = pick(rng, SURNAME_PARTS)
  let second = pick(rng, SURNAME_PARTS)
  if (second === first) second = SURNAME_PARTS[(SURNAME_PARTS.indexOf(first) + 1) % SURNAME_PARTS.length]
  return `${first}-${second}`
}

// A first name already used by the family gets the next regnal numeral.
export function heirName(rng: () => number, surname: string, takenNames: ReadonlyArray<string>): string {
  const first = pick(rng, FIRST_NAMES)
  const base = `${first} ${surname}`
  const repeats = takenNames.filter((n) => n === base || n.startsWith(`${base} `)).length
  return `${base}${NUMERALS[Math.min(repeats, NUMERALS.length - 1)]}`
}

export function rollHeirChoices(rng: () => number, surname: string, takenNames: ReadonlyArray<string>, count = 3): Heir[] {
  const choices: Heir[] = []
  const usedTraits = new Set<string>()
  const usedNames = [...takenNames]
  for (let guard = 0; choices.length < count && guard < 50; guard++) {
    const rarity = pickEventRarity(rng())
    const pool = HEIR_TRAITS.filter((t) => t.rarity === rarity && !usedTraits.has(t.id))
    if (pool.length === 0) continue
    const trait = pick(rng, pool)
    usedTraits.add(trait.id)
    const name = heirName(rng, surname, usedNames)
    usedNames.push(name)
    choices.push({ name, traitId: trait.id })
  }
  return choices
}
