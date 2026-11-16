// Old School Tie: calling in a favour. Someone you were at school with
// arranges for Britain, briefly, to work, and it mostly works for you.
import type { Sector } from './items'
import type { ModifierSource } from '../engine/modifiers'

export const FAVOUR_EVENT_MS = 180_000
// Options in the dialog
export const FAVOUR_CHOICES = 3
// The rare all-round events turn up this much less often than their worth suggests
export const RARE_EVENT_WEIGHT = 0.35

export type FavourTarget =
  | { kind: 'sector'; sector: Sector }
  | { kind: 'taps' }
  | { kind: 'interns' }
  | { kind: 'all' }

export interface FavourEventDef {
  id: string
  // Story: what happens in the country
  title: string
  // Rules: what it does, stated plainly
  effectText: string
  target: FavourTarget
  rare?: boolean
}

const SECTOR_DOUBLE = 2
const TAPS_MULT = 1.5
const INTERNS_MULT = 2
const ALL_MULT = 1.25

function sector(id: string, title: string, s: Sector, label: string): FavourEventDef {
  return { id, title, effectText: `${label} businesses earn double.`, target: { kind: 'sector', sector: s } }
}

export const FAVOUR_EVENTS: ReadonlyArray<FavourEventDef> = [
  sector('trains-on-time', 'All trains run on time', 'infrastructure', 'Infrastructure'),
  sector('potholes', 'Potholes fixed overnight, nationwide', 'infrastructure', 'Infrastructure'),
  sector('planning', 'Planning permission granted by return of post', 'property', 'Property'),
  sector('regulator-lunch', 'The regulator goes on a long lunch', 'finance', 'Finance'),
  sector('sunny-bank-holiday', "A bank holiday that's actually sunny", 'food', 'Food and drink'),
  sector('licence-fee', 'The licence fee quietly redirected', 'media', 'Media'),
  sector('friend-of-a-friend', 'Every contract goes to a friend of a friend', 'services', 'Services'),
  {
    id: 'no-meetings',
    title: 'Meetings that could have been an email outlawed',
    effectText: 'Clicks pay 50% more.',
    target: { kind: 'taps' }
  },
  {
    id: 'no-reply-all',
    title: 'Nobody replies-all for a whole week',
    effectText: 'Clicks pay 50% more.',
    target: { kind: 'taps' }
  },
  {
    id: 'coffee-machine',
    title: 'The interns find the coffee machine',
    effectText: 'Interns earn double.',
    target: { kind: 'interns' }
  },
  {
    id: 'trains-and-wifi',
    title: 'The trains and the Wi-Fi both work',
    effectText: 'All income 25% higher.',
    target: { kind: 'all' },
    rare: true
  },
  {
    id: 'strong-pound',
    title: 'The pound strengthens and nobody knows why',
    effectText: 'All income 25% higher.',
    target: { kind: 'all' },
    rare: true
  }
]

export const FAVOUR_EVENTS_BY_ID: Readonly<Record<string, FavourEventDef>> = Object.fromEntries(
  FAVOUR_EVENTS.map((e) => [e.id, e])
)

export function favourEventSource(def: FavourEventDef): ModifierSource {
  switch (def.target.kind) {
    case 'sector':
      return { sectorBusinessMult: { [def.target.sector]: SECTOR_DOUBLE } }
    case 'taps':
      return { clickMult: TAPS_MULT }
    case 'interns':
      return { internMult: INTERNS_MULT }
    case 'all':
      return { clickMult: ALL_MULT, businessMult: ALL_MULT }
  }
}

// How it ends, in the news
export const FAVOUR_ENDINGS: ReadonlyArray<string> = [
  'quietly reversed after the election',
  'ruled unlawful by the Supreme Court',
  'rebranded as a levelling-up fund',
  'scrapped in the next reshuffle',
  'paused pending a review',
  'blamed on the previous government',
  'leaked to the Guardian',
  'sunk by a select committee'
]

export function pickEnding(rng: () => number): string {
  return FAVOUR_ENDINGS[Math.min(FAVOUR_ENDINGS.length - 1, Math.floor(rng() * FAVOUR_ENDINGS.length))]
}

// Pick up to `count` different events, each in proportion to its weight;
// events worth nothing are never offered
export function pickFavourOffer(rng: () => number, weights: Readonly<Record<string, number>>, count = FAVOUR_CHOICES): string[] {
  const pool = FAVOUR_EVENTS.filter((e) => (weights[e.id] ?? 0) > 0).map((e) => ({
    id: e.id,
    w: (weights[e.id] ?? 0) * (e.rare ? RARE_EVENT_WEIGHT : 1)
  }))
  const offer: string[] = []
  while (offer.length < count && pool.length > 0) {
    const total = pool.reduce((a, p) => a + p.w, 0)
    let r = rng() * total
    let i = 0
    for (; i < pool.length - 1; i++) {
      r -= pool[i].w
      if (r < 0) break
    }
    offer.push(pool[i].id)
    pool.splice(i, 1)
  }
  return offer
}

export interface FavourEvent {
  id: string
  // Active generation time when it ends
  untilMs: number
}

// Favours called in this generation, events running, and an offer on the table
export interface FavourState {
  used: number
  active: FavourEvent[]
  offer: string[]
}

export function emptyFavours(): FavourState {
  return { used: 0, active: [], offer: [] }
}
