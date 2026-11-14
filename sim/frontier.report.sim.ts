// Prints, per generation, how long each gate past the bloodline's best took.
// Env: SIM_SEED, SIM_HOURS, PROBE_FROM (generation to stop giving up from),
// PROBE_MIN (patience then, minutes), STALL (normal patience, minutes).
declare const process: { env: Record<string, string | undefined> }
import { it } from 'vitest'
import { CASUAL_PACE, FAST_TAPPER, runCampaign } from './bot'

it('prints frontier times', () => {
  const env = process.env
  const cfg = {
    ...(env.SIM_PACE === 'casual' ? CASUAL_PACE : FAST_TAPPER),
    ...(env.STALL ? { stallMinutes: Number(env.STALL), firstGenerationStallMinutes: Number(env.STALL) } : {}),
    ...(env.PROBE_FROM ? { probe: { fromGeneration: Number(env.PROBE_FROM), stallMinutes: Number(env.PROBE_MIN ?? 240) } } : {})
  }
  const gens = runCampaign(Number(env.SIM_HOURS ?? 3), cfg, Number(env.SIM_SEED ?? 1))
  for (const g of gens) {
    const plus = [1, 2, 3, 4].map((k) => {
      const ms = g.splitsMs[g.bestBefore + k]
      return ms === null || ms === undefined ? '.' : (ms / 60000).toFixed(1)
    })
    console.log(`gen ${g.generation} best ${g.bestBefore} -> ${g.deepestGate} len ${g.activeMinutes.toFixed(1)}m | +1..+4: ${plus.join(' ')}`)
  }
})
