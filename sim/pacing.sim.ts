// Pacing goals from docs/superpowers/specs/2026-11-12-dynasty-roguelike-design.md,
// checked against a scripted human-paced player. Run with `npm run sim`.
import { describe, expect, it } from 'vitest'
import { runCampaign, type GenerationResult } from './bot'

const HOUR = 3_600_000
const MINUTE = 60_000

const gens = runCampaign(21)

function firstKill(gate: number): { gen: GenerationResult; atMs: number } | null {
  const gen = gens.find((g) => g.splitsMs[gate] !== null)
  return gen ? { gen, atMs: gen.cumulativeActiveMs + gen.splitsMs[gate]! } : null
}

describe('pacing', () => {
  it('generation 1 beats gate 3 within 30 to 45 minutes', () => {
    const t = gens[0].splitsMs[3]
    expect(t).not.toBeNull()
    expect(t! / MINUTE).toBeGreaterThanOrEqual(30)
    expect(t! / MINUTE).toBeLessThanOrEqual(45)
  })

  it('generation 2 reaches generation 1 depth at least 20% sooner', () => {
    const depth = gens[0].deepestGate
    expect(gens[1].splitsMs[depth]).not.toBeNull()
    expect(gens[1].splitsMs[depth]!).toBeLessThanOrEqual(0.8 * gens[0].splitsMs[depth]!)
  })

  it('generation 2 is well ahead at the 10-minute mark', () => {
    expect(gens[1].netWorthAt10Min).toBeGreaterThanOrEqual(2 * gens[0].netWorthAt10Min)
  })

  it('the first gate 6 kill lands between hours 5 and 6', () => {
    const kill = firstKill(6)
    expect(kill).not.toBeNull()
    expect(kill!.atMs / HOUR).toBeGreaterThanOrEqual(5)
    expect(kill!.atMs / HOUR).toBeLessThanOrEqual(6)
  })

  it('the first gate 9 kill lands between hours 15 and 20', () => {
    const kill = firstKill(9)
    expect(kill).not.toBeNull()
    expect(kill!.atMs / HOUR).toBeGreaterThanOrEqual(15)
    expect(kill!.atMs / HOUR).toBeLessThanOrEqual(20)
  })

  // With phase 2's linear Legacy and three perks, the early gates collapse
  // within a few generations. Deep gates take far longer; phase 4's advisors
  // and heir traits are meant to bring them into range and tighten this.
  it('bosses at gates 1 to 5 first killed in generation N die within 5 seconds by generation N+5', () => {
    let judged = 0
    for (let gate = 1; gate <= 5; gate++) {
      const first = gens.findIndex((g) => g.killMs[gate] !== null)
      const later = gens[first + 5]
      if (first < 0 || !later || later.killMs[gate] === null) continue
      judged += 1
      expect(later.killMs[gate]!, `gate ${gate}`).toBeLessThanOrEqual(5000)
    }
    expect(judged).toBe(5)
  })

  it('deep-gate kill times still fall: gates 6 and 7 halve (by median) eight to twelve generations on', () => {
    const median = (xs: number[]) => [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)]
    for (let gate = 6; gate <= 7; gate++) {
      const kills = gens.map((g) => g.killMs[gate])
      const first = kills.findIndex((k) => k !== null)
      expect(first, `gate ${gate} never killed`).toBeGreaterThanOrEqual(0)
      const early = kills.slice(first, first + 3).filter((k): k is number => k !== null)
      const later = kills.slice(first + 8, first + 13).filter((k): k is number => k !== null)
      expect(later.length, `gate ${gate} later kills`).toBeGreaterThan(0)
      expect(median(later), `gate ${gate}`).toBeLessThanOrEqual(median(early) / 2)
    }
  })

  it('money and income stay finite for the whole campaign', () => {
    for (const g of gens) expect(g.stayedFinite, `generation ${g.generation}`).toBe(true)
  })
})
