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

// A quirk that runs in the family: it stays with the bloodline, stacking
// with every ancestor's, until the family elevates. Kept mild, so a family
// with bad draws is slower but can still beat its gates.
export interface InheritedTrait {
  id: string
  name: string
  description: string
  mods: ModifierSource
}

export interface Heir {
  name: string
  // The heir's own trait, for their lifetime only. null for the founder,
  // who arrived before anyone thought to write it down
  traitId: string | null
  // What they pass down the bloodline. null for the founder and old saves
  inheritId?: string | null
}

// Every personal trait is a trade-off. The joke is always on the dynasty.
export const HEIR_TRAITS: ReadonlyArray<HeirTrait> = [
  {
    id: 'old-etonian',
    name: 'Old Etonian',
    rarity: 'common',
    description: 'The old school tie opens every door: boss twists bite 40% less. The hands have never done a day\'s work, so clicks pay 25% less.',
    mods: { twistStrength: 0.6, clickMult: 0.75 }
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
    id: 'minor-gentry',
    name: 'Minor Gentry',
    rarity: 'common',
    description: 'A rectory, two spaniels and a cleaner called Pam. Your buyers handle 1 more kind of item a second (Pam buys for you if you have no buyers), but businesses earn 10% less.',
    mods: { buyerItemTypes: 1, businessMult: 0.9 }
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
    description: 'Read one pamphlet at university and never recovered. Disapproves of owning the means of production, so businesses earn half; every Job pays five times over.',
    mods: { businessMult: 0.5, clickMult: 5 }
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
    description: 'Has staff for the staff. Your buyers handle 2 more kinds of item a second (the family\'s own staff buy for you if you have none), but clicks pay 20% less.',
    mods: { buyerItemTypes: 2, clickMult: 0.8 }
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
  },
  {
    id: 'old-aristocracy',
    name: 'Old Aristocracy',
    rarity: 'legendary',
    description: 'The family seat has a moat and forty bedrooms nobody has been into since 1952. Your buyers handle 3 more kinds of item a second (the household buys for you if you have no buyers), but the upkeep takes 2% of all income.',
    mods: { buyerItemTypes: 3, incomeDrain: 0.02 }
  }
]

export const TRAITS_BY_ID: Readonly<Record<string, HeirTrait>> = Object.fromEntries(HEIR_TRAITS.map((t) => [t.id, t]))

// Five are plain bonuses; four trade a small downside for a larger upside.
// None touch Legacy and no downside is over 10%, so nine bad draws still
// leave every gate beatable.
export const INHERITED_TRAITS: ReadonlyArray<InheritedTrait> = [
  {
    id: 'old-money',
    name: 'Old Money',
    description: 'Businesses earn 10% more.',
    mods: { businessMult: 1.1 }
  },
  {
    id: 'silver-tongue',
    name: 'Silver Tongue',
    description: 'Clicks pay 15% more.',
    mods: { clickMult: 1.15 }
  },
  {
    id: 'haggler',
    name: 'Born Haggler',
    description: 'Everything costs 3% less.',
    mods: { purchaseCostMult: 0.97 }
  },
  {
    id: 'well-connected',
    name: 'Well Connected',
    description: 'Opportunities turn up 10% more often.',
    mods: { eventIntervalMult: 0.9 }
  },
  {
    id: 'thick-skin',
    name: 'Thick Skin',
    description: 'Boss twists bite 10% less.',
    mods: { twistStrength: 0.9 }
  },
  {
    id: 'snob',
    name: 'Snobbery',
    description: 'Businesses earn 20% more, but clicks pay 10% less.',
    mods: { businessMult: 1.2, clickMult: 0.9 }
  },
  {
    id: 'workaholic',
    name: 'Workaholic',
    description: 'Clicks pay 25% more, but businesses earn 5% less.',
    mods: { clickMult: 1.25, businessMult: 0.95 }
  },
  {
    id: 'flutter',
    name: 'Fond of a Flutter',
    description: 'Windfalls are 25% bigger, but 5% more opportunities are shady.',
    mods: { windfallMult: 1.25, shadyBonus: 0.05 }
  },
  {
    id: 'lawyered-up',
    name: 'Lawyered Up',
    description: 'Boss fights last 10% longer, but legal fees take 1% of all income.',
    mods: { bossTimeMult: 1.1, incomeDrain: 0.01 }
  }
]

export const INHERITED_BY_ID: Readonly<Record<string, InheritedTrait>> = Object.fromEntries(
  INHERITED_TRAITS.map((t) => [t.id, t])
)

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
// avoidFirstNames: brothers and sisters don't share a first name
export function heirName(
  rng: () => number,
  surname: string,
  takenNames: ReadonlyArray<string>,
  avoidFirstNames: ReadonlyArray<string> = []
): string {
  const pool = FIRST_NAMES.filter((n) => !avoidFirstNames.includes(n))
  const first = pick(rng, pool.length > 0 ? pool : FIRST_NAMES)
  const base = `${first} ${surname}`
  const repeats = takenNames.filter((n) => n === base || n.startsWith(`${base} `)).length
  return `${base}${NUMERALS[Math.min(repeats, NUMERALS.length - 1)]}`
}

// onlyRarity limits personal traits to one rarity (a sibling stepping in
// after an abdication is only ever common)
export function rollHeirChoices(
  rng: () => number,
  surname: string,
  takenNames: ReadonlyArray<string>,
  count = 3,
  onlyRarity?: EventRarity,
  avoidFirstNames: ReadonlyArray<string> = []
): Heir[] {
  const choices: Heir[] = []
  const usedTraits = new Set<string>()
  const usedInherits = new Set<string>()
  const usedNames = [...takenNames]
  for (let guard = 0; choices.length < count && guard < 50; guard++) {
    const rarity = onlyRarity ?? pickEventRarity(rng())
    const pool = HEIR_TRAITS.filter((t) => t.rarity === rarity && !usedTraits.has(t.id))
    if (pool.length === 0) continue
    const trait = pick(rng, pool)
    usedTraits.add(trait.id)
    const name = heirName(rng, surname, usedNames, avoidFirstNames)
    usedNames.push(name)
    const inheritPool = INHERITED_TRAITS.filter((t) => !usedInherits.has(t.id))
    const inherit = pick(rng, inheritPool.length > 0 ? inheritPool : INHERITED_TRAITS)
    usedInherits.add(inherit.id)
    choices.push({ name, traitId: trait.id, inheritId: inherit.id })
  }
  return choices
}
