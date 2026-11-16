// The first climb after elevating to the Lords: plays a bloodline to gate 9,
// elevates, and plays the new line. Env vars: SIM_HOURS (default 5), SIM_SEED.
declare const process: { env: Record<string, string | undefined> }
import { it } from 'vitest'
import { FAST_TAPPER, runCampaign } from './bot'

it('prints the climb after an elevation', () => {
  const gens = runCampaign(Number(process.env.SIM_HOURS ?? 5), { ...FAST_TAPPER, elevations: 1 }, Number(process.env.SIM_SEED ?? 1))
  let line = 1
  for (const g of gens) {
    const splits = g.splitsMs.map((s, i) => (s === null ? null : `${i}:${(s / 60000).toFixed(1)}m`)).filter(Boolean).join(' ')
    console.log(`line ${line} gen ${g.generation} len ${g.activeMinutes.toFixed(1)}m depth ${g.deepestGate} | ${splits}`)
    if (g.deepestGate === 9 && line === 1) line = 2
  }
})
