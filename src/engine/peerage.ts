// The Peerage: once the family has survived the Royal Garden Party, it can
// be elevated to the Lords, trading Legacy for permanent Titles.
import { LADDER_TRIAL } from '../data/trial'
import type { ModifierSource } from './modifiers'

// Legacy is one point per gate past the family's best, so a bloodline that
// has climbed all nine gates holds nine: one title
export const LEGACY_PER_TITLE = 9
// Each title multiplies all income by this, and they compound: each new
// line takes about two-thirds as long as the last (docs/pacing.md)
// (x2.5 on the ladder trial, data/trial.ts, whose classes sit closer)
export const INCOME_PER_TITLE = LADDER_TRIAL ? 2.5 : 3

export function titlesFor(legacyPoints: number): number {
  return Math.floor(Math.max(0, legacyPoints) / LEGACY_PER_TITLE)
}

const RANKS: ReadonlyArray<string> = ['Commoner', 'Baron', 'Viscount', 'Earl', 'Marquess', 'Duke']

// The top rank: reaching it ends the dynasty
export const DUKE_TITLES = RANKS.length - 1

// How a line holding a rank is named on the roll: "The Barons"
export function rankLine(titles: number): string {
  const rank = peerageRank(titles)
  if (rank === 'Commoner') return 'The commoners'
  if (rank === 'Duke') return 'The Duke'
  return `The ${rank === 'Marquess' ? 'Marquesses' : `${rank}s`}`
}

export function peerageRank(titles: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.max(0, Math.floor(titles)))]
}

// What the family's titles do, for good
export function titleSource(titles: number): ModifierSource {
  const mult = Math.pow(INCOME_PER_TITLE, Math.max(0, Math.floor(titles)))
  return { clickMult: mult, businessMult: mult }
}

// One PA chair, and one more per title: more of the office stays through
// every retirement
export function titlePaChairs(titles: number): number {
  return 1 + Math.max(0, Math.floor(titles))
}

export function heirChoiceCount(titles: number): number {
  return titles >= 2 ? 4 : 3
}
