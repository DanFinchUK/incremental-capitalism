import { describe, expect, it } from 'vitest'
import { BUSINESSES, JOBS } from '../src/data/items'
import { storageKey } from '../src/data/trial'
import { AWARD_MULT, awardMultiplier, awardsHeld, awardText } from '../src/engine/awards'

const owning = (list: ReadonlyArray<{ id: string }>, counts: number[]) =>
  Object.fromEntries(list.map((item, i) => [item.id, counts[i] ?? 0]))

describe("King's Awards (the ladder trial)", () => {
  it('waits on the weakest item in a block of five rungs', () => {
    // The first five Jobs at 120, 300, 100, 99, 500: the weakest has 99, so only the award at 25
    const held = awardsHeld(owning(JOBS, [120, 300, 100, 99, 500]), {})
    expect(held).toEqual([{ kind: 'jobs', from: 0, to: 4, level: 25 }])
    // At 100 apiece, the award at 100 too; nothing yet for the next block
    expect(awardsHeld(owning(JOBS, [100, 100, 100, 100, 100, 1000]), {})).toHaveLength(2)
  })

  it('counts Jobs and Businesses separately, and every block, the short last one included', () => {
    const allJobs = owning(JOBS, JOBS.map(() => 1000))
    const allBusinesses = owning(BUSINESSES, BUSINESSES.map(() => 25))
    const held = awardsHeld(allJobs, allBusinesses)
    const blocks = Math.ceil(JOBS.length / 5)
    expect(held.filter((a) => a.kind === 'jobs')).toHaveLength(blocks * 5)
    expect(held.filter((a) => a.kind === 'businesses')).toHaveLength(Math.ceil(BUSINESSES.length / 5))
    expect(held.at(-1)?.to).toBe(BUSINESSES.length - 1)
  })

  it('multiplies all income, compounding, and names the rungs it was won for', () => {
    expect(awardMultiplier(0)).toBe(1)
    expect(awardMultiplier(3)).toBeCloseTo(AWARD_MULT ** 3)
    expect(awardText({ kind: 'jobs', from: 0, to: 4, level: 100 })).toBe(
      `King's Award for Enterprise: every Job from ${JOBS[0].label} to ${JOBS[4].label} at 100. All income x${AWARD_MULT}.`
    )
  })

  it('keeps nothing in storage for a family not yet begun', () => {
    expect(storageKey('state')).toBeNull()
  })
})

describe('the ladder trial', () => {
  it('swaps in its own ladder, classes and milestones when a family plays it', async () => {
    const { vi } = await import('vitest')
    vi.resetModules()
    vi.stubEnv('LADDER', 'trial')
    try {
      const items = await import('../src/data/items')
      const classes = await import('../src/data/classes')
      const perks = await import('../src/data/perks')
      const trial = await import('../src/data/trial')
      expect(trial.LADDER_TRIAL).toBe(true)
      expect(perks.MILESTONE_BASE_STEP).toBe(4)
      // Dearer each rung, each unit's step falling up the ladder
      for (let k = 1; k < items.JOBS.length; k++) {
        expect(items.JOBS[k].baseCost).toBeGreaterThan(items.JOBS[k - 1].baseCost)
        expect(items.JOBS[k].scaleFactor).toBeLessThan(items.JOBS[k - 1].scaleFactor)
      }
      // The Garden Party a rung from the 10th Job's price; classes a rung apart
      const g = classes.GATE_NET_WORTH
      expect(g[9]).toBeCloseTo(items.trialJobCostAt(10.4), -Math.floor(Math.log10(g[9])) + 6)
      expect(g[9]).toBeGreaterThan(items.JOBS[10].baseCost)
      expect(g[9]).toBeLessThan(items.JOBS[11].baseCost)
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })
})

describe("King's Awards progress", () => {
  it('shows each group bought into, with what the next award waits on', async () => {
    const { awardProgress } = await import('../src/engine/awards')
    const jobs = Object.fromEntries(JOBS.slice(0, 5).map((j, i) => [j.id, [120, 300, 100, 212, 500][i]]))
    const rows = awardProgress(jobs, {})
    expect(rows).toEqual([{ kind: 'jobs', from: 0, to: 4, held: 2, next: 250, laggard: { label: JOBS[2].label, owned: 100 } }])
    // A group with all five awards waits on nothing
    const full = awardProgress(Object.fromEntries(JOBS.slice(0, 5).map((j) => [j.id, 1000])), {})
    expect(full[0]).toMatchObject({ held: 5, next: null, laggard: null })
  })
})
