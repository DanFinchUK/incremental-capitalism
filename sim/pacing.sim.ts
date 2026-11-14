// Pacing checks for ~60-90 minute bloodlines. The targets are set for a
// player who keeps tapping about five times a second, as playtesters do; a
// mostly idle player is held to looser bounds. Run with `npm run sim`.
//
// Heirs and advisors are rolled at random, so one campaign can be lucky or
// unlucky. Each goal is checked on the median of three seeded campaigns.
import { describe, expect, it } from 'vitest'
import { JOBS } from '../src/data/items'
import { CASUAL_PACE, FAST_TAPPER, runCampaign, type GenerationResult } from './bot'

const HOUR = 3_600_000
const MINUTE = 60_000
const SEEDS = [1, 2, 3]

const campaigns: GenerationResult[][] = SEEDS.map((seed) => runCampaign(2.5, FAST_TAPPER, seed))
const casualFirstGens: GenerationResult[] = SEEDS.map((seed) => runCampaign(1, CASUAL_PACE, seed)[0])

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// Hours of play until a gate's boss first falls, or Infinity if it never does
function firstKillHours(gens: GenerationResult[], gate: number): number {
  const gen = gens.find((g) => g.splitsMs[gate] !== null)
  return gen ? (gen.cumulativeActiveMs + gen.splitsMs[gate]!) / HOUR : Infinity
}

function gen1SplitMinutes(gens: GenerationResult[], gate: number): number {
  return (gens[0].splitsMs[gate] ?? Infinity) / MINUTE
}

describe('pacing for a fast tapper (median of three ~60-90m bloodline campaigns)', () => {
  it('generation 1 beats gate 1 within 2.5 to 7 minutes', () => {
    const minutes = median(campaigns.map((gens) => gen1SplitMinutes(gens, 1)))
    expect(minutes).toBeGreaterThanOrEqual(2.5)
    expect(minutes).toBeLessThanOrEqual(7)
  })

  it('generation 1 beats gate 2 within 6 to 14 minutes', () => {
    const minutes = median(campaigns.map((gens) => gen1SplitMinutes(gens, 2)))
    expect(minutes).toBeGreaterThanOrEqual(6)
    expect(minutes).toBeLessThanOrEqual(14)
  })

  it('generation 1 beats gate 3 within 14 to 25 minutes', () => {
    const minutes = median(campaigns.map((gens) => gen1SplitMinutes(gens, 3)))
    expect(minutes).toBeGreaterThanOrEqual(14)
    expect(minutes).toBeLessThanOrEqual(25)
  })

  it('generation 1 bosses take real effort: gates 1 to 3 each take 15 seconds or more to kill', () => {
    for (let gate = 1; gate <= 3; gate++) {
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

  it('the first gate 6 kill lands between 40 and 75 minutes', () => {
    const minutes = median(campaigns.map((gens) => firstKillHours(gens, 6) * 60))
    expect(minutes).toBeGreaterThanOrEqual(40)
    expect(minutes).toBeLessThanOrEqual(75)
  })

  it('the first gate 9 kill lands between 60 and 95 minutes', () => {
    const minutes = median(campaigns.map((gens) => firstKillHours(gens, 9) * 60))
    expect(minutes).toBeGreaterThanOrEqual(60)
    expect(minutes).toBeLessThanOrEqual(95)
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

// A tuning guide rather than a hard rule: on a fresh climb, a rung should
// carry you until you own about 50 of it before the next one is in reach.
describe('the job and business ladders', () => {
  const handovers = (kind: 'jobs' | 'businesses', rungs: number) =>
    campaigns.flatMap((gens) => gens[0].rungHandover![kind].slice(1, rungs + 1)).filter((n): n is number => n !== null)

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

describe('pacing for a mostly idle player (median of three first generations)', () => {
  it('beats gate 1 within 12 minutes', () => {
    expect(median(casualFirstGens.map((g) => (g.splitsMs[1] ?? Infinity) / MINUTE))).toBeLessThanOrEqual(12)
  })

  it('beats gate 2 within 30 minutes', () => {
    expect(median(casualFirstGens.map((g) => (g.splitsMs[2] ?? Infinity) / MINUTE))).toBeLessThanOrEqual(30)
  })
})
