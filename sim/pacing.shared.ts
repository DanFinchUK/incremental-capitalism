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
