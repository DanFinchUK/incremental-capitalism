// After each elevation the new line climbs faster, but only somewhat: each
// line should take about two-thirds as long as the one before it
// (docs/pacing.md). Plays a fast tapper's dynasty from Commoner to Duke.
import { describe, expect, it } from 'vitest'
import { FAST_TAPPER, runCampaign } from './bot'
import { median } from './pacing.shared'

// Fifteen seeds: one line's length swings a lot with the heirs drawn
const SEEDS = Array.from({ length: 15 }, (_, i) => i + 1)

// Active minutes each line took, Commoner first
function lineMinutes(seed: number): number[] {
  const gens = runCampaign(12, { ...FAST_TAPPER, elevations: 4 }, seed)
  const lines: number[] = [0]
  for (const g of gens) {
    lines[lines.length - 1] += g.activeMinutes
    if (g.deepestGate === 9) lines.push(0)
  }
  return lines.filter((m) => m > 0)
}

describe('lines after elevation', () => {
  const runs = SEEDS.map(lineMinutes)
  const medians = [0, 1, 2, 3, 4].map((i) => median(runs.map((r) => r[i] ?? Infinity)))
  // Each run's own line-to-line ratio, averaged geometrically across runs.
  // Two lines in one run share that run's heirs and advisors, so comparing
  // them run by run cancels much of the luck that a ratio of two medians
  // (each from different runs) adds together: 15 seeds land within about
  // 0.07 of the truth, where 40 seeds of the ratio of medians didn't
  const ratios = [1, 2, 3, 4].map((i) =>
    Math.exp(runs.reduce((a, r) => a + Math.log((r[i] ?? Infinity) / (r[i - 1] ?? Infinity)), 0) / runs.length)
  )
  console.log(`line minutes (median): ${medians.map((m) => m.toFixed(0)).join(', ')}; each against the one before: ${ratios.map((x) => x.toFixed(2)).join(', ')}`)

  it('plays all five lines to the dukedom', () => {
    expect(runs.every((r) => r.length === 5)).toBe(true)
  })

  it('each line takes about two-thirds as long as the one before (run by run)', () => {
    ratios.forEach((ratio, i) => {
      expect(ratio, `line ${i + 2}`).toBeGreaterThanOrEqual(0.5)
      expect(ratio, `line ${i + 2}`).toBeLessThanOrEqual(0.9)
    })
  })
})
