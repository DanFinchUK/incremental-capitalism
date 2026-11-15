// Different ways to play (sim/bot.ts PLAYSTYLES), each over three seeded
// campaigns. They needn't be equally strong, but each one must finish a
// bloodline in reasonable time and none may break the prestige rule
// (docs/pacing.md). Run with `npm run sim`.
import { describe, expect, it } from 'vitest'
import { PLAYSTYLES, runCampaign, type GenerationResult } from './bot'

const HOUR = 3_600_000
const SEEDS = [1, 2, 3]

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function firstKillHours(gens: GenerationResult[], gate: number): number {
  const gen = gens.find((g) => g.splitsMs[gate] !== null)
  return gen ? (gen.cumulativeActiveMs + gen.splitsMs[gate]!) / HOUR : Infinity
}

for (const style of PLAYSTYLES) {
  describe(`playstyle: ${style.name}`, () => {
    const campaigns = SEEDS.map((seed) => runCampaign(style.finishWithinHours + 1, style.cfg, seed))
    const played = campaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)
    const gate9 = campaigns.map((gens) => firstKillHours(gens, 9).toFixed(2)).join(', ')
    const abdications = campaigns.flat().filter((g) => g.abdicated).length
    console.log(`${style.name}: gate 9 at ${gate9} hours; ${abdications} abdication(s)`)

    it(`completes the bloodline (gate 9) within ${style.finishWithinHours} hours (median)`, () => {
      expect(median(campaigns.map((gens) => firstKillHours(gens, 9)))).toBeLessThanOrEqual(style.finishWithinHours)
    })

    it('never retires more than 3 gates past the family best', () => {
      expect(Math.max(...played.map((g) => g.deepestGate - g.bestBefore))).toBeLessThanOrEqual(3)
    })

    it('keeps money and income finite', () => {
      expect(campaigns.flat().every((g) => g.stayedFinite)).toBe(true)
    })
  })
}
