// King's Awards for Enterprise, on the ladder trial (data/trial.ts): every
// Job, or every Business, in a block of five rungs held at a count earns an
// award, and each award multiplies all income. The old rungs stay worth
// buying because the next award waits on the weakest of them.
import { BUSINESSES, JOBS, type ItemKind } from '../data/items'

export const AWARD_BLOCK = 5
export const AWARD_LEVELS: ReadonlyArray<number> = [25, 100, 250, 500, 1000]
// Two ladders earn awards, so each is worth a little less than one would be
export const AWARD_MULT = 1.25

export interface Award {
  kind: ItemKind
  // Rungs from and to, counted from 0
  from: number
  to: number
  level: number
}

function blocks(count: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let from = 0; from < count; from += AWARD_BLOCK) out.push([from, Math.min(count, from + AWARD_BLOCK) - 1])
  return out
}

export function awardsHeld(jobs: Readonly<Record<string, number>>, businesses: Readonly<Record<string, number>>): Award[] {
  const held: Award[] = []
  for (const [kind, list, owned] of [
    ['jobs', JOBS, jobs],
    ['businesses', BUSINESSES, businesses]
  ] as const) {
    for (const [from, to] of blocks(list.length)) {
      const weakest = Math.min(...list.slice(from, to + 1).map((item) => owned[item.id] ?? 0))
      for (const level of AWARD_LEVELS) if (weakest >= level) held.push({ kind, from, to, level })
    }
  }
  return held
}

export function awardMultiplier(count: number): number {
  return Math.pow(AWARD_MULT, Math.max(0, count))
}

// The announcement: which rungs, at what count
export function awardText(award: Award): string {
  const list = award.kind === 'jobs' ? JOBS : BUSINESSES
  const noun = award.kind === 'jobs' ? 'Job' : 'Business'
  return `King's Award for Enterprise: every ${noun} from ${list[award.from].label} to ${list[award.to].label} at ${award.level.toLocaleString('en-GB')}. All income x${AWARD_MULT}.`
}
