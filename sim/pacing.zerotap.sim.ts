// Pacing for a player who never taps Get paid (docs/pacing.md)
import { describe, expect, it } from 'vitest'
import { ZERO_TAP, runCampaign, type GenerationResult } from './bot'
import { SEEDS, firstKillHours, median, plusMinutes } from './pacing.shared'

const zeroTapCampaigns: GenerationResult[][] = SEEDS.map((seed) => runCampaign(4, ZERO_TAP, seed))

// Someone who can't tap quickly, or at all, can still play: the allowance,
// Interns and businesses carry them, at about half a fast tapper's pace
describe('pacing for a player who never taps Get paid (median of three campaigns)', () => {
  const played = zeroTapCampaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)

  it('the founder beats gate 1 within 15 minutes (median)', () => {
    expect(median(zeroTapCampaigns.map((gens) => plusMinutes(gens[0], 1)))).toBeLessThanOrEqual(15)
  })

  it('gets +1 in under 15 minutes (median)', () => {
    expect(median(played.map((g) => plusMinutes(g, 1)))).toBeLessThanOrEqual(15)
  })

  it('completes the bloodline (gate 9) within 4 hours', () => {
    expect(median(zeroTapCampaigns.map((gens) => firstKillHours(gens, 9)))).toBeLessThanOrEqual(4)
  })
})
