// Minimum stage times: the game must not hand progress to a player who
// isn't making choices, and the early gates must take real play to reach.
// Run with `npm run sim`.
import { describe, expect, it } from 'vitest'
import { GATE_NET_WORTH } from '../src/data/classes'
import { ONE_TAP_PACE, runCampaign, runTapOnly } from './bot'

const MINUTE = 60_000
const SEEDS = [1, 2, 3]

describe('a player who only taps once a second', () => {
  const result = runTapOnly(30)

  it('owns nothing after 30 minutes, because nothing buys itself', () => {
    expect(result.itemsOwned).toBe(0)
  })

  it('is still short of the first gate after 30 minutes', () => {
    expect(result.netWorth).toBeLessThan(GATE_NET_WORTH[1])
  })
})

describe('minimum stage times for a player tapping once a second', () => {
  const firstGens = SEEDS.map((seed) => runCampaign(1.5, ONE_TAP_PACE, seed)[0])
  const earliest = (gate: number) => Math.min(...firstGens.map((g) => g.splitsMs[gate] ?? Infinity)) / MINUTE

  it('gate 1 takes at least 3 minutes', () => {
    expect(earliest(1)).toBeGreaterThanOrEqual(3)
  })

  it('gate 2 takes at least 10 minutes', () => {
    expect(earliest(2)).toBeGreaterThanOrEqual(10)
  })

  it('gate 3 takes at least 25 minutes', () => {
    expect(earliest(3)).toBeGreaterThanOrEqual(25)
  })
})
