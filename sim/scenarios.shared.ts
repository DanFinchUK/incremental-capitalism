// Each scenario (src/data/scenarios.ts) must be winnable: over three seeded
// campaigns, the first bloodline is completed in reasonable time, without
// breaking the prestige rule (docs/pacing.md). One file per scenario
// (scenarios.*.sim.ts), so their campaigns run in parallel.
import { describe, expect, it } from 'vitest'
import { SCENARIO_PLAYS, runCampaign } from './bot'
import { SEEDS, firstKillHours, median, rarelyPastThree } from './pacing.shared'

export function checkScenario(index: number): void {
  const play = SCENARIO_PLAYS[index]
  describe(`scenario: ${play.cfg.scenario}`, () => {
    const campaigns = SEEDS.map((seed) => runCampaign(play.finishWithinHours + 1, play.cfg, seed))
    const played = campaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)
    console.log(`${play.cfg.scenario}: gate 9 at ${campaigns.map((gens) => firstKillHours(gens, 9).toFixed(2)).join(', ')} hours`)

    it(`completes the bloodline (gate 9) within ${play.finishWithinHours} hours (median)`, () => {
      expect(median(campaigns.map((gens) => firstKillHours(gens, 9)))).toBeLessThanOrEqual(play.finishWithinHours)
    })

    it('retires more than 3 gates past the family best only rarely, and never more than 4', () => {
      const r = rarelyPastThree(played.map((g) => g.deepestGate - g.bestBefore))
      expect(r.fours).toBeLessThanOrEqual(r.allowed)
      expect(r.max).toBeLessThanOrEqual(4)
    })

    it('keeps money and income finite', () => {
      expect(campaigns.flat().every((g) => g.stayedFinite)).toBe(true)
    })
  })
}
