// Prints a campaign summary (SIM_HOURS, SIM_SEED env vars) for tuning.
declare const process: { env: Record<string, string | undefined> }
import { it } from 'vitest'
import { runCampaign } from './bot'

it('prints a campaign report', () => {
  const t0 = Date.now()
  const gens = runCampaign(Number(process.env.SIM_HOURS ?? 3), undefined, Number(process.env.SIM_SEED ?? 1))
  for (const g of gens) {
    const splits = g.splitsMs.map((s, i) => (s === null ? null : `${i}:${(s / 60000).toFixed(1)}m`)).filter(Boolean).join(' ')
    console.log(`gen ${g.generation} start ${(g.cumulativeActiveMs / 3.6e6).toFixed(2)}h len ${g.activeMinutes.toFixed(1)}m depth ${g.deepestGate} +${g.legacyEarned}L nw10 ${g.netWorthAt10Min.toExponential(1)} finite ${g.stayedFinite} | ${splits}`)
  }
  for (let gate = 1; gate <= 9; gate++) {
    const g = gens.find((x) => x.splitsMs[gate] !== null)
    if (g) console.log(`first gate ${gate}: ${((g.cumulativeActiveMs + g.splitsMs[gate]!) / 3.6e6).toFixed(2)}h (gen ${g.generation})`)
  }
  for (let gate = 1; gate <= 9; gate++) {
    const kills = gens.map((g) => (g.killMs[gate] === null ? '.' : Math.round(g.killMs[gate]! / 1000))).join(' ')
    console.log(`kills gate ${gate}: ${kills}`)
  }
  console.log(`runtime ${(Date.now() - t0) / 1000}s`)
})
