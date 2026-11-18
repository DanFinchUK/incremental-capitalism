// After each elevation the new line climbs faster, but only somewhat: each
// line should take about two-thirds as long as the one before it
// (docs/pacing.md). Plays a fast tapper's dynasty from Commoner to Duke.
import { describe, expect, it } from 'vitest'
import { FAST_TAPPER, runCampaign } from './bot'
import { median } from './pacing.shared'

// Five seeds, not three: one line's length swings a lot with the heirs drawn
const SEEDS = [1, 2, 3, 4, 5]

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
  console.log(`line minutes (median): ${medians.map((m) => m.toFixed(0)).join(', ')}`)

  it('plays all five lines to the dukedom', () => {
    expect(runs.every((r) => r.length === 5)).toBe(true)
  })

  it('each line takes about two-thirds as long as the one before (median)', () => {
    for (let i = 1; i < 5; i++) {
      const ratio = medians[i] / medians[i - 1]
      expect(ratio, `line ${i + 1}`).toBeGreaterThanOrEqual(0.5)
      expect(ratio, `line ${i + 1}`).toBeLessThanOrEqual(0.85)
    }
  })
})
