// Pacing for a mostly idle player (docs/pacing.md)
import { describe, expect, it } from 'vitest'
import { CASUAL_PACE, runCampaign, type GenerationResult } from './bot'
import { SEEDS, firstKillHours, median, plusMinutes } from './pacing.shared'

const casualCampaigns: GenerationResult[][] = SEEDS.map((seed) => runCampaign(3, CASUAL_PACE, seed))

describe('pacing for a mostly idle player (median of three campaigns)', () => {
  const casualPlayed = casualCampaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)

  it('still gets +1 in under 12 minutes (median)', () => {
    expect(median(casualPlayed.map((g) => plusMinutes(g, 1)))).toBeLessThanOrEqual(12)
  })

  it('still completes the bloodline (gate 9) within 3 hours', () => {
    expect(median(casualCampaigns.map((gens) => firstKillHours(gens, 9)))).toBeLessThanOrEqual(3)
  })
})
