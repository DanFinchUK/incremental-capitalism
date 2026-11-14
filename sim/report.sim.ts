// Prints a campaign summary for tuning. Env vars: SIM_HOURS, SIM_SEED, and
// SIM_PACE (fast, casual or onetap; default fast).
declare const process: { env: Record<string, string | undefined> }
import { it } from 'vitest'
import { CASUAL_PACE, FAST_TAPPER, ONE_TAP_PACE, runCampaign } from './bot'

const PACES = { fast: FAST_TAPPER, casual: CASUAL_PACE, onetap: ONE_TAP_PACE }

it('prints a campaign report', () => {
  const t0 = Date.now()
  const pace = PACES[(process.env.SIM_PACE ?? 'fast') as keyof typeof PACES]
  const gens = runCampaign(Number(process.env.SIM_HOURS ?? 3), pace, Number(process.env.SIM_SEED ?? 1))
  for (const g of gens) {
    const splits = g.splitsMs.map((s, i) => (s === null ? null : `${i}:${(s / 60000).toFixed(1)}m`)).filter(Boolean).join(' ')
    console.log(`gen ${g.generation} start ${(g.cumulativeActiveMs / 3.6e6).toFixed(2)}h len ${g.activeMinutes.toFixed(1)}m depth ${g.deepestGate} +${g.legacyEarned}L nw4 ${g.netWorthAt4Min.toExponential(1)} finite ${g.stayedFinite} | ${splits}`)
  }
  for (let gate = 1; gate <= 9; gate++) {
    const g = gens.find((x) => x.splitsMs[gate] !== null)
    if (g) console.log(`first gate ${gate}: ${((g.cumulativeActiveMs + g.splitsMs[gate]!) / 3.6e6).toFixed(2)}h (gen ${g.generation})`)
  }
  for (let gate = 1; gate <= 9; gate++) {
    const kills = gens.map((g) => (g.killMs[gate] === null ? '.' : Math.round(g.killMs[gate]! / 1000))).join(' ')
    console.log(`kills gate ${gate}: ${kills}`)
  }
  const handover = gens[0].rungHandover
  if (handover) {
    const show = (xs: (number | null)[]) => xs.slice(1).map((n) => (n === null ? '.' : n)).join(' ')
    console.log(`rung handover, jobs: ${show(handover.jobs)}`)
    console.log(`rung handover, businesses: ${show(handover.businesses)}`)
  }
  console.log(`runtime ${(Date.now() - t0) / 1000}s`)
})
