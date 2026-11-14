// Pacing checks against the prestige rule in docs/pacing.md. The player is a
// fast tapper (about five taps a second); a mostly idle player is held to
// looser bounds. Run with `npm run sim`.
//
// "+k" is the k-th gate past the deepest gate the bloodline had beaten before
// the generation began. Heirs and advisors are rolled at random, so each goal
// is checked on a median across three seeded campaigns.
import { describe, expect, it } from 'vitest'
import { JOBS } from '../src/data/items'
import { CASUAL_PACE, FAST_TAPPER, runCampaign, type BotConfig, type GenerationResult } from './bot'

const HOUR = 3_600_000
const MINUTE = 60_000
const SEEDS = [1, 2, 3]

// Normal play: retire after 12 minutes without a new gate
const campaigns: GenerationResult[][] = SEEDS.map((seed) => runCampaign(4, FAST_TAPPER, seed))
// Probes: from this generation on, the player never gives up (8 hours)
const probe = (fromGeneration: number): BotConfig => ({ ...FAST_TAPPER, probe: { fromGeneration, stallMinutes: 480 } })
const firstGenProbes = SEEDS.map((seed) => runCampaign(8, probe(1), seed)[0])
const heirProbes = SEEDS.map((seed) => runCampaign(9, probe(3), seed).find((g) => g.generation === 3)!)
const casualCampaigns: GenerationResult[][] = SEEDS.map((seed) => runCampaign(3, CASUAL_PACE, seed))

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// Minutes into the generation that its "+k" gate fell, or Infinity
function plusMinutes(g: GenerationResult, k: number): number {
  const ms = g.splitsMs[g.bestBefore + k]
  return ms === null || ms === undefined ? Infinity : ms / MINUTE
}

// Hours of play until a gate's boss first falls, or Infinity if it never does
function firstKillHours(gens: GenerationResult[], gate: number): number {
  const gen = gens.find((g) => g.splitsMs[gate] !== null)
  return gen ? (gen.cumulativeActiveMs + gen.splitsMs[gate]!) / HOUR : Infinity
}

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

  it('so a generation retires 1 to 3 gates past its best, and never more', () => {
    const gains = played.map((g) => g.deepestGate - g.bestBefore)
    expect(median(gains)).toBeGreaterThanOrEqual(1)
    expect(median(gains)).toBeLessThanOrEqual(3)
    expect(Math.max(...gains)).toBeLessThanOrEqual(3)
  })

  it('+3 is quite hard: 30 to 150 minutes for a player who never gives up (median)', () => {
    const times = [...firstGenProbes, ...heirProbes].map((g) => plusMinutes(g, 3))
    expect(median(times)).toBeGreaterThanOrEqual(30)
    expect(median(times)).toBeLessThanOrEqual(150)
  })

  it('+4 takes hours of non-stop play: at least 2 hours (median), even for a player who never gives up', () => {
    const times = [...firstGenProbes, ...heirProbes].map((g) => plusMinutes(g, 4))
    expect(median(times)).toBeGreaterThanOrEqual(120)
  })
})

describe('pacing for a fast tapper (median of three campaigns)', () => {
  it('generation 1 beats gate 1 within 2.5 to 8 minutes', () => {
    const minutes = median(campaigns.map((gens) => (gens[0].splitsMs[1] ?? Infinity) / MINUTE))
    expect(minutes).toBeGreaterThanOrEqual(2.5)
    expect(minutes).toBeLessThanOrEqual(8)
  })

  it('generation 1 bosses take real effort: gates 1 and 2 each take 15 seconds or more to kill', () => {
    for (let gate = 1; gate <= 2; gate++) {
      const kills = campaigns.map((gens) => gens[0].killMs[gate]).filter((k): k is number => k !== null)
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
    for (const gens of [...campaigns, firstGenProbes, heirProbes]) {
      for (const g of gens) expect(g.stayedFinite, `generation ${g.generation}`).toBe(true)
    }
  })
})

// A tuning guide rather than a hard rule: on a fresh climb, a rung should
// carry you until you own about 50 of it before the next one is in reach.
describe('the job and business ladders', () => {
  const handovers = (kind: 'jobs' | 'businesses', rungs: number) =>
    firstGenProbes.flatMap((g) => g.rungHandover![kind].slice(1, rungs + 1)).filter((n): n is number => n !== null)

  it('the next Job is first bought with around 50 of the one below (median of the first 8 rungs at least 35)', () => {
    expect(handovers('jobs', 8).length).toBeGreaterThanOrEqual(15)
    expect(median(handovers('jobs', 8))).toBeGreaterThanOrEqual(35)
  })

  it('the next Business is first bought with around 50 of the one below (median of the first 8 rungs at least 35)', () => {
    expect(handovers('businesses', 8).length).toBeGreaterThanOrEqual(15)
    expect(median(handovers('businesses', 8))).toBeGreaterThanOrEqual(35)
  })

  it('the first Job takes a few dozen taps, not one', () => {
    // Tap pay starts at £1 and Hustle builds to x3 over 20 taps
    expect(JOBS[0].baseCost).toBeGreaterThanOrEqual(100)
  })
})

describe('pacing for a mostly idle player (median of three campaigns)', () => {
  const casualPlayed = casualCampaigns.flat().filter((g) => g.bestBefore < 9 && g.activeMinutes > 0)

  it('still gets +1 in under 12 minutes (median)', () => {
    expect(median(casualPlayed.map((g) => plusMinutes(g, 1)))).toBeLessThanOrEqual(12)
  })

  it('still completes the bloodline (gate 9) within 3 hours', () => {
    expect(median(casualCampaigns.map((gens) => firstKillHours(gens, 9)))).toBeLessThanOrEqual(3)
  })
})
