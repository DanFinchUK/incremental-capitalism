// Pacing checks for a player who never gives up: +3 and +4 past the family's
// best (docs/pacing.md), and the job and business ladders on a fresh climb.
//
// The probes stop after a few hours: the checks only need +3 within 150
// minutes and +4 not before 2 hours, and "never reached" passes the second.
import { describe, expect, it } from 'vitest'
import { JOBS } from '../src/data/items'
import { FAST_TAPPER, runCampaign, type BotConfig } from './bot'
import { SEEDS, median, plusMinutes } from './pacing.shared'

// From this generation on, the player never gives up
const probe = (fromGeneration: number): BotConfig => ({ ...FAST_TAPPER, probe: { fromGeneration, stallMinutes: 480 } })
const firstGenProbes = SEEDS.map((seed) => runCampaign(3, probe(1), seed)[0])
// Generations 1 and 2 play normally first (about 40 minutes)
const heirProbes = SEEDS.map((seed) => runCampaign(4, probe(3), seed).find((g) => g.generation === 3)!)

describe('the prestige rule for a player who never gives up', () => {
  it('+3 is quite hard: 30 to 150 minutes for a player who never gives up (median)', () => {
    const times = [...firstGenProbes, ...heirProbes].map((g) => plusMinutes(g, 3))
    expect(median(times)).toBeGreaterThanOrEqual(30)
    expect(median(times)).toBeLessThanOrEqual(150)
  })

  it('+4 takes hours of non-stop play: at least 2 hours (median), even for a player who never gives up', () => {
    const times = [...firstGenProbes, ...heirProbes].map((g) => plusMinutes(g, 4))
    expect(median(times)).toBeGreaterThanOrEqual(120)
  })

  it('money and income stay finite', () => {
    for (const g of [...firstGenProbes, ...heirProbes]) expect(g.stayedFinite, `generation ${g.generation}`).toBe(true)
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
