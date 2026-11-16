// The Peerage: once the family has survived the Royal Garden Party, it can
// be elevated to the Lords, trading Legacy for permanent Titles.
import type { ModifierSource } from './modifiers'

// Legacy is one point per gate past the family's best, so a bloodline that
// has climbed all nine gates holds nine: one title
export const LEGACY_PER_TITLE = 9
export const INCOME_PER_TITLE = 0.5
// Each title makes Legacy worth this much more, from the first. Legacy resets
// each bloodline, so this speeds every climb without compounding forever.
export const LEGACY_SCALE_PER_TITLE = 0.15

export function titlesFor(legacyPoints: number): number {
  return Math.floor(Math.max(0, legacyPoints) / LEGACY_PER_TITLE)
}

const RANKS: ReadonlyArray<string> = ['Commoner', 'Baron', 'Viscount', 'Earl', 'Marquess', 'Duke']

export function peerageRank(titles: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.max(0, Math.floor(titles)))]
}

// What the family's titles do, for good
export function titleSource(titles: number): ModifierSource {
  const t = Math.max(0, titles)
  const mult = 1 + INCOME_PER_TITLE * t
  return {
    clickMult: mult,
    businessMult: mult,
    legacyScale: 1 + LEGACY_SCALE_PER_TITLE * t
  }
}

// One PA chair, and one more per title: more of the office stays through
// every retirement
export function titlePaChairs(titles: number): number {
  return 1 + Math.max(0, Math.floor(titles))
}

export function heirChoiceCount(titles: number): number {
  return titles >= 2 ? 4 : 3
}
