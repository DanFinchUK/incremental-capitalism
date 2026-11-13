// Split times per class gate, indexed by gate (0..9; index 0 is unused).
// Values are active play time in ms since the generation started, or null.
export type Splits = ReadonlyArray<number | null>

export const SPLIT_SLOTS = 10

export function emptySplits(): (number | null)[] {
  return Array(SPLIT_SLOTS).fill(null)
}

export function withSplit(s: Splits, gate: number, ms: number): (number | null)[] {
  const next = [...s]
  next[gate] = ms
  return next
}

// Per gate, the lower of the two non-null times.
export function mergeBests(best: Splits, current: Splits): (number | null)[] {
  return emptySplits().map((_, i) => {
    const a = best[i] ?? null
    const b = current[i] ?? null
    if (a === null) return b
    if (b === null) return a
    return Math.min(a, b)
  })
}

// Negative means ahead of the best.
export function splitDelta(current: number | null, best: number | null): number | null {
  return current === null || best === null ? null : current - best
}
