// The Hall of Dynasties: every family that reached Duke, kept apart from the
// save so founding a new dynasty never loses it
import { readGenerationRecord, titlesHeld, type GenerationRecord } from './family'
import { rankLine } from './peerage'

export const HALL_KEY = 'hall'
export const MAX_HALL_ENTRIES = 50

export interface DynastyRecord {
  surname: string
  // When the dukedom came, wall-clock
  finishedAt: number
  // Active play time from the founder to the dukedom
  activeMs: number
  // Everyone in it, founder first
  roll: GenerationRecord[]
}

function readDynasty(raw: unknown): DynastyRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.surname !== 'string' || typeof r.activeMs !== 'number' || !Number.isFinite(r.activeMs)) return null
  return {
    surname: r.surname,
    finishedAt: typeof r.finishedAt === 'number' && Number.isFinite(r.finishedAt) ? r.finishedAt : 0,
    activeMs: Math.max(0, r.activeMs),
    roll: Array.isArray(r.roll) ? r.roll.map(readGenerationRecord).filter((g): g is GenerationRecord => g !== null) : []
  }
}

export function parseHall(raw: string | null): DynastyRecord[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(readDynasty).filter((d): d is DynastyRecord => d !== null) : []
  } catch {
    return []
  }
}

// Newest first
export function addToHall(hall: ReadonlyArray<DynastyRecord>, record: DynastyRecord): DynastyRecord[] {
  return [record, ...hall].slice(0, MAX_HALL_ENTRIES)
}

// The quickest dynasty, or null
export function bestDynasty(hall: ReadonlyArray<DynastyRecord>): DynastyRecord | null {
  let best: DynastyRecord | null = null
  for (const d of hall) if (!best || d.activeMs < best.activeMs) best = d
  return best
}

export interface RollLine {
  // "The Barons"
  rank: string
  people: Array<{ record: GenerationRecord; became: number | null }>
  activeMs: number
}

// The roll, line by line: whoever took the family up a rank heads that
// rank's line, so a line is everyone who held the rank, starting with the
// one who earned it. Ranks past Duke stay with the Duke.
export function rollLines(roll: ReadonlyArray<GenerationRecord>): RollLine[] {
  const held = titlesHeld(roll)
  const lines: RollLine[] = []
  roll.forEach((record, i) => {
    const { became } = held[i]
    const rank = rankLine(became ?? held[i].held)
    const last = lines[lines.length - 1]
    if (!last || (became !== null && last.rank !== rank)) {
      lines.push({ rank, people: [], activeMs: 0 })
    }
    const line = lines[lines.length - 1]
    line.people.push({ record, became })
    line.activeMs += record.activeMs
  })
  return lines
}
