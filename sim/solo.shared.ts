// Solo runs: how much each heir trait, inherited trait and advisor is worth
// over a whole bloodline (or a whole dynasty to Duke), with nothing else on
// offer. Every heir has the trait being measured (none in the baseline), and
// the headhunter only ever brings the advisor being measured, one copy at
// most. Each is scored against the same runs with all income multiplied by
// 1.1, 1.25, 1.5, 2 and 3, so every result reads as "worth about xN income",
// whatever the effect is.
//
// Unlike the 15-minute replays (sim/strength.shared.ts), these see slow and
// late effects: campaigns, ordeals, Legacy, PA chairs and, run to Duke,
// titles. They are noisier, so each variant plays several seeds; the
// teardown (sim/solo.teardown.ts) prints the standard error beside each.
//
// `npm run sim:solo`. SOLO_SEEDS (default 4) sets the seeds; SOLO_TO=duke
// plays every run to the dukedom; SOLO_ONLY is a pattern on variant ids.
declare const process: { env: Record<string, string | undefined> }
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ADVISORS } from '../src/data/advisors'
import { HEIR_TRAITS, INHERITED_TRAITS } from '../src/data/heirs'
import { FAST_TAPPER, runCampaign, type BotConfig } from './bot'

export const SOLO_DIR = join(tmpdir(), 'ic-solo')
export const SOLO_SEEDS = Array.from({ length: Number(process.env.SOLO_SEEDS ?? 4) }, (_, i) => i + 1)
const TO_DUKE = process.env.SOLO_TO === 'duke'
export const INCOME_LADDER = [1.1, 1.25, 1.5, 2, 3]

export interface SoloVariant {
  kind: 'none' | 'income' | 'trait' | 'inherited' | 'advisor'
  id: string
  name: string
  // What the bot plays with
  solo: NonNullable<BotConfig['solo']>
  incomeMult?: number
}

const NOBODY = { trait: null, inherit: null, advisor: null }
const ONLY = process.env.SOLO_ONLY ? new RegExp(process.env.SOLO_ONLY) : null

export const SOLO_VARIANTS: ReadonlyArray<SoloVariant> = [
  { kind: 'none' as const, id: 'baseline', name: 'Nothing', solo: NOBODY },
  ...INCOME_LADDER.map((k) => ({ kind: 'income' as const, id: `income-${k}`, name: `All income x${k}`, solo: NOBODY, incomeMult: k })),
  ...HEIR_TRAITS.map((t) => ({ kind: 'trait' as const, id: t.id, name: t.name, solo: { ...NOBODY, trait: t.id } })),
  ...INHERITED_TRAITS.map((t) => ({ kind: 'inherited' as const, id: t.id, name: t.name, solo: { ...NOBODY, inherit: t.id } })),
  ...ADVISORS.map((a) => ({ kind: 'advisor' as const, id: a.id, name: a.name, solo: { ...NOBODY, advisor: a.id } }))
].filter((v) => v.kind === 'none' || v.kind === 'income' || !ONLY || ONLY.test(v.id))

export interface SoloResult {
  id: string
  seed: number
  // Active hours to the first class 9, or to Duke; Infinity if not reached
  hours: number
}

function playOne(v: SoloVariant, seed: number): SoloResult {
  const cfg: BotConfig = { ...FAST_TAPPER, solo: v.solo, incomeMult: v.incomeMult, ...(TO_DUKE ? { elevations: 4 } : {}) }
  const gens = runCampaign(TO_DUKE ? 16 : 8, cfg, seed)
  let ms = 0
  let reached = false
  let lines = 0
  for (const g of gens) {
    ms += g.activeMinutes * 60_000
    if (g.deepestGate === 9) {
      lines += 1
      if (!TO_DUKE || lines === 5) {
        reached = true
        break
      }
    }
  }
  return { id: v.id, seed, hours: reached ? ms / 3_600_000 : Infinity }
}

// One shard of the variants, every seed; the teardown puts the shards together
export async function runSoloShard(shard: number, shards: number): Promise<void> {
  const variants = SOLO_VARIANTS.filter((_, i) => i % shards === shard)
  const rows: Array<SoloResult & { kind: string; name: string }> = []
  for (const v of variants) {
    for (const seed of SOLO_SEEDS) rows.push({ ...playOne(v, seed), kind: v.kind, name: v.name })
    // Let Vitest's worker answer its runner between variants, or it times out
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  mkdirSync(SOLO_DIR, { recursive: true })
  writeFileSync(join(SOLO_DIR, `shard-${shard}.json`), JSON.stringify(rows))
}
