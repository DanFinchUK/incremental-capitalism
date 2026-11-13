// The Peerage: once the family has survived the Royal Garden Party, it can
// be elevated to the Lords, trading Legacy for permanent Titles.
import type { ModifierSource } from './modifiers'

export const LEGACY_PER_TITLE_SQUARED = 100
export const INCOME_PER_TITLE = 0.5

export function titlesFor(legacyPoints: number): number {
  return Math.floor(Math.sqrt(Math.max(0, legacyPoints) / LEGACY_PER_TITLE_SQUARED))
}

const RANKS: ReadonlyArray<string> = ['Commoner', 'Baron', 'Viscount', 'Earl', 'Marquess', 'Duke']

export function peerageRank(titles: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.max(0, Math.floor(titles)))]
}

// What the family's titles do, for good
export function titleSource(titles: number): ModifierSource {
  const mult = 1 + INCOME_PER_TITLE * titles
  return {
    clickMult: mult,
    businessMult: mult,
    legacyScale: titles >= 3 ? 1.5 : 1,
    automationShareBonus: titles >= 5 ? 0.05 : 0
  }
}

export function titleExtraSeats(titles: number): number {
  return titles >= 1 ? 1 : 0
}

export function heirChoiceCount(titles: number): number {
  return titles >= 2 ? 4 : 3
}
