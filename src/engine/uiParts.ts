// Parts of the screen a brand new player can't do anything with yet. Each
// stays hidden until the game first gives it a use, then stays for good: the
// list of those shown is the player's own (kept in the save and the profile),
// so a later family, a new bloodline or a reset doesn't hide them again.

export const UI_PARTS = [
  // The Old Boys' Network: Legacy to spend
  'network',
  // Retiring, and the Legacy income multiplier beside Money
  'retire',
  // The family office: staff come with the first ordeal won
  'office',
  // King's Awards: a group of five on offer
  'awards',
  // The family tree: a generation to look back on
  'familyTree',
  // How many to buy at once: something bought
  'bulk',
  // The City Trading Desk: income that comes in by itself
  'tradingDesk'
] as const

export type UiPart = (typeof UI_PARTS)[number]

export interface UiRevealState {
  generation: number
  legacyPoints: number
  gatesBeaten: number
  minRetireGate: number
  officeFilled: boolean
  awardsHeld: number
  seenJobs: number
  seenBusinesses: number
  anyOwned: boolean
  moneyPerSecond: number
}

// Items to a King's Award group
const AWARD_GROUP = 5

// Whether a part has a use yet, from where the family stands now
export function partDue(part: UiPart, s: UiRevealState): boolean {
  const later = s.generation > 1
  switch (part) {
    case 'network':
      return later || s.legacyPoints > 0
    case 'retire':
      return later || s.gatesBeaten >= s.minRetireGate
    case 'office':
      return later || s.gatesBeaten > 0 || s.officeFilled
    case 'awards':
      return s.awardsHeld > 0 || s.seenJobs >= AWARD_GROUP || s.seenBusinesses >= AWARD_GROUP
    case 'familyTree':
      return later
    case 'bulk':
      return later || s.anyOwned
    case 'tradingDesk':
      return later || s.moneyPerSecond > 0
  }
}

// Every part, in order, from a saved list: unknown entries dropped, and a
// save or profile from before parts were hidden shows them all
export function readUiParts(raw: unknown): UiPart[] {
  if (!Array.isArray(raw)) return [...UI_PARTS]
  return UI_PARTS.filter((p) => raw.includes(p))
}

export function mergeUiParts(...lists: ReadonlyArray<readonly UiPart[]>): UiPart[] {
  return UI_PARTS.filter((p) => lists.some((l) => l.includes(p)))
}
