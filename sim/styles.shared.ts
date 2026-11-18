// Different ways to play (sim/bot.ts PLAYSTYLES), each over three seeded
// campaigns. They needn't be equally strong, but each one must finish a
// bloodline in reasonable time and none may break the prestige rule
// (docs/pacing.md). One file per playstyle (styles.*.sim.ts), so their
// campaigns run in parallel.
import { describe, expect, it } from 'vitest'
import { PLAYSTYLES, runCampaign } from './bot'
import { SEEDS, firstKillHours, median, rarelyPastThree } from './pacing.shared'

export function checkPlaystyle(index: number): void {
  const style = PLAYSTYLES[index]
  describe(`playstyle: ${style.name}`, () => {
    const campaigns = SEEDS.map((seed) => runCampaign(style.finishWithinHours + 1, style.cfg, seed))
    const played = campaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)
    const gate9 = campaigns.map((gens) => firstKillHours(gens, 9).toFixed(2)).join(', ')
    const abdications = campaigns.flat().filter((g) => g.abdicated).length
    console.log(`${style.name}: gate 9 at ${gate9} hours; ${abdications} abdication(s)`)

    it(`completes the bloodline (gate 9) within ${style.finishWithinHours} hours (median)`, () => {
      expect(median(campaigns.map((gens) => firstKillHours(gens, 9)))).toBeLessThanOrEqual(style.finishWithinHours)
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
