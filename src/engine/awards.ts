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

export interface AwardBlock {
  kind: ItemKind
  from: number
  to: number
  // Awards this block holds, of AWARD_LEVELS.length
  held: number
  // The next count to reach, and the item furthest from it (null: all held)
  next: number | null
  laggard: { label: string; owned: number } | null
}

// Each block whose items are all on offer (seen: revealed so far, by kind),
// with its awards and what the next one waits on
export function awardProgress(
  jobs: Readonly<Record<string, number>>,
  businesses: Readonly<Record<string, number>>,
  seen: Readonly<Record<ItemKind, Readonly<Record<string, boolean>>>>
): AwardBlock[] {
  const out: AwardBlock[] = []
  for (const [kind, list, owned] of [
    ['jobs', JOBS, jobs],
    ['businesses', BUSINESSES, businesses]
  ] as const) {
    for (const [from, to] of blocks(list.length)) {
      const items = list.slice(from, to + 1)
      if (!items.every((item) => seen[kind][item.id])) continue
      const counts = items.map((item) => owned[item.id] ?? 0)
      const weakest = Math.min(...counts)
      const held = AWARD_LEVELS.filter((level) => weakest >= level).length
      const next = AWARD_LEVELS[held] ?? null
      const at = counts.indexOf(weakest)
      out.push({ kind, from, to, held, next, laggard: next === null ? null : { label: items[at].label, owned: weakest } })
    }
  }
  return out
}
