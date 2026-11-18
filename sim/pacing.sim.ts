// Pacing checks against the prestige rule in docs/pacing.md. The player is a
// fast tapper (about five taps a second); a mostly idle player and one who
// never taps Get paid are held to looser bounds. Run with `npm run sim`.
//
// "+k" is the k-th gate past the deepest gate the bloodline had beaten before
// the generation began. Heirs and advisors are rolled at random, so each goal
// is checked across twelve seeded campaigns: with three, one unlucky run of
// heirs and advisors could flip a check either way.
import { describe, expect, it } from 'vitest'
import { FAST_TAPPER, runCampaign, type GenerationResult } from './bot'
import { MINUTE, firstKillHours, median, plusMinutes, rarelyPastThree } from './pacing.shared'

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// Normal play: retire after 12 minutes without a new gate
const campaigns: GenerationResult[][] = SEEDS.map((seed) => runCampaign(4, FAST_TAPPER, seed))

// Generations of normal play that had a gate left to beat
const played = campaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)

describe('the prestige rule: +1 easy, +2 more effort, +3 quite hard, +4 about a day', () => {
  it('+1 is reasonably easy: most generations get it, in under 8 minutes (median)', () => {
    const reached = played.filter((g) => g.deepestGate > g.bestBefore)
    expect(reached.length / played.length).toBeGreaterThanOrEqual(0.8)
    expect(median(played.map((g) => plusMinutes(g, 1)))).toBeLessThanOrEqual(8)
  })

  it('+2 takes a bit more effort: 5 to 30 minutes (median, where reached)', () => {
    const times = played.map((g) => plusMinutes(g, 2)).filter(Number.isFinite)
    expect(times.length).toBeGreaterThanOrEqual(played.length / 2)
    expect(median(times)).toBeGreaterThanOrEqual(5)
    expect(median(times)).toBeLessThanOrEqual(30)
  })

  it('so a generation retires 1 to 3 gates past its best, +4 rarely and never more', () => {
    const gains = played.map((g) => g.deepestGate - g.bestBefore)
    expect(median(gains)).toBeGreaterThanOrEqual(1)
    expect(median(gains)).toBeLessThanOrEqual(3)
    const r = rarelyPastThree(gains)
    expect(r.fours).toBeLessThanOrEqual(r.allowed)
    expect(r.max).toBeLessThanOrEqual(4)
  })
})

describe('pacing for a fast tapper (median of twelve campaigns)', () => {
  it('generation 1 beats gate 1 within 2.5 to 8 minutes', () => {
    const minutes = median(campaigns.map((gens) => (gens[0].splitsMs[1] ?? Infinity) / MINUTE))
    expect(minutes).toBeGreaterThanOrEqual(2.5)
    expect(minutes).toBeLessThanOrEqual(8)
  })

  it('the first two boss fights take real effort: gates 1 and 2 each take 15 seconds or more on their first kill', () => {
    for (let gate = 1; gate <= 2; gate++) {
      // Whichever generation first beats the gate; generation 1 often retires after gate 1
      const kills = campaigns
        .map((gens) => gens.find((g) => g.killMs[gate] !== null)?.killMs[gate] ?? null)
        .filter((k): k is number => k !== null)
      expect(kills.length, `gate ${gate}`).toBeGreaterThan(0)
      expect(median(kills), `gate ${gate}`).toBeGreaterThanOrEqual(15_000)
    }
  })

  it('generation 2 reaches generation 1 depth at least 20% sooner', () => {
    const ratios = campaigns.map((gens) => {
      const depth = gens[0].deepestGate
      return (gens[1].splitsMs[depth] ?? Infinity) / gens[0].splitsMs[depth]!
    })
    expect(median(ratios)).toBeLessThanOrEqual(0.8)
  })

  it('generation 2 is well ahead at the 4-minute mark', () => {
    expect(median(campaigns.map((gens) => gens[1].netWorthAt4Min / gens[0].netWorthAt4Min))).toBeGreaterThanOrEqual(2)
  })

  it('the first gate 9 kill lands between 75 and 160 minutes', () => {
    const minutes = median(campaigns.map((gens) => firstKillHours(gens, 9) * 60))
    expect(minutes).toBeGreaterThanOrEqual(75)
    expect(minutes).toBeLessThanOrEqual(160)
  })

  it('bosses at gates 1 to 5 first killed in generation N die within 5 seconds by generation N+4', () => {
    for (let gate = 1; gate <= 5; gate++) {
      let passing = 0
      for (const gens of campaigns) {
        const first = gens.findIndex((g) => g.killMs[gate] !== null)
        const later = gens[first + 4] ?? gens.at(-1)
        if (first >= 0 && later && later.killMs[gate] !== null && later.killMs[gate]! <= 5000) passing += 1
      }
      expect(passing, `gate ${gate}: campaigns where it fell within 5 s`).toBeGreaterThanOrEqual(2)
    }
  })

  it('money and income stay finite in every campaign', () => {
    for (const gens of campaigns) {
      for (const g of gens) expect(g.stayedFinite, `generation ${g.generation}`).toBe(true)
    }
  })
})
