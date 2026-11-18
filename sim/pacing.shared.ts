// Shared by the pacing checks, which are split across files so their
// campaigns run in parallel.
import type { GenerationResult } from './bot'

export const HOUR = 3_600_000
export const MINUTE = 60_000
export const SEEDS = [1, 2, 3]

export function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// Minutes into the generation that its "+k" gate fell, or Infinity
export function plusMinutes(g: GenerationResult, k: number): number {
  const ms = g.splitsMs[g.bestBefore + k]
  return ms === null || ms === undefined ? Infinity : ms / MINUTE
}

// Hours of play until a gate's boss first falls, or Infinity if it never does
export function firstKillHours(gens: GenerationResult[], gate: number): number {
  const gen = gens.find((g) => g.splitsMs[gate] !== null)
  return gen ? (gen.cumulativeActiveMs + gen.splitsMs[gate]!) / HOUR : Infinity
}

// A generation retires 1 to 3 gates past its best. A lucky heir may reach +4
// now and then (about one generation in 100 in the sim), which is a good
// story rather than a broken game: so +4 at most one generation in 20 (one,
// for fewer than 40), and never +5.
export function rarelyPastThree(gains: number[]): { fours: number; allowed: number; max: number } {
  return {
    fours: gains.filter((g) => g >= 4).length,
    allowed: Math.max(1, Math.floor(gains.length / 20)),
    max: Math.max(...gains)
  }
}
