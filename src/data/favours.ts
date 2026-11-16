// Old School Tie: calling in a favour. Someone you were at school with lends
// you a unit of the bottom rung of a list, whatever it is (even one above the
// current gate), for a few minutes. It earns, but it isn't yours.

export const FAVOUR_LOAN_MS = 180_000

// Where the helper goes once the favour is done. Picked at random, never
// repeated on the same card.
export const FAVOUR_DEPARTURES: ReadonlyArray<string> = [
  'Flew back to Dubai',
  'Headed back to Mayfair',
  'Signing in at the Lords',
  'Gone to Davos to fight inequality',
  'Took a non-exec at a water firm',
  'Now advising your rivals',
  'Left a card and an invoice',
  'Lunch at the club ran to dinner',
  'Called away to a shoot',
  'Recalled to the Treasury',
  'Back on the yacht',
  'Off to a select committee'
]

export function pickDeparture(rng: () => number, taken: ReadonlyArray<string>): string {
  const free = FAVOUR_DEPARTURES.filter((t) => !taken.includes(t))
  const pool = free.length > 0 ? free : FAVOUR_DEPARTURES
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}

export type FavourKind = 'jobs' | 'businesses'

export interface FavourLoan {
  kind: FavourKind
  id: string
  // Active generation time when the helper leaves
  untilMs: number
}

export interface FavourDeparture {
  kind: FavourKind
  id: string
  text: string
}

// Favours called in this generation, the help still here, and where the rest went
export interface FavourState {
  used: number
  loans: FavourLoan[]
  departures: FavourDeparture[]
}

export function emptyFavours(): FavourState {
  return { used: 0, loans: [], departures: [] }
}
