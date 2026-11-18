// Solo runs: how much each heir trait, inherited trait and advisor is worth
// over a whole bloodline (or a whole dynasty to Duke), with nothing else on
// offer. Each is scored against the same runs with all income multiplied by
// 1.1, 1.25, 1.5, 2 and 3, so every result reads as "worth about xN income",
// whatever the effect is.
//
// Only the game's random draws are fixed; the bot does nothing a player
// couldn't. Every heir the game drafts carries the trait being measured
// (src/utils/simHeirs.ts), every introduction offers only the advisor being
// measured (src/utils/simOffer.ts), and the baseline turns every
// introduction down. Played over whole runs, these see slow and late
// effects: campaigns, ordeals, Legacy, PA chairs and, run to Duke, titles.
// They are noisy, so each variant plays several seeds; the teardown
// (sim/solo.teardown.ts) prints the standard error beside each.
//
// `npm run sim:solo`. SOLO_SEEDS (default 4) sets the seeds; SOLO_TO=duke
// plays every run to the dukedom; SOLO_ONLY is a pattern on variant ids.
// SOLO_SET=copies plays every advisor taken from every introduction until
// the office holds 1, 2, 3... of the family, up to SOLO_MAX_COPIES (6 to
// class 9, 10 to Duke: a full office in the last line). Introductions come
// when the game sends them and seats empty at retirement, so a run may
// never hold that many: each records how many it held on average.
// SOLO_SET=favour plays the game as it is, real introductions and heirs,
// with the bot favouring one advisor family whenever one is on offer,
// against the same bot favouring nothing: what chasing a family really gets.
declare const process: { env: Record<string, string | undefined> }
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ADVISORS, ADVISORS_BY_ID } from '../src/data/advisors'
import { HEIR_TRAITS, INHERITED_TRAITS } from '../src/data/heirs'
import { FAST_TAPPER, runCampaign, type BotConfig } from './bot'

export const SOLO_DIR = join(tmpdir(), 'ic-solo')
export const SOLO_SEEDS = Array.from({ length: Number(process.env.SOLO_SEEDS ?? 4) }, (_, i) => i + 1)
const TO_DUKE = process.env.SOLO_TO === 'duke'
export const INCOME_LADDER = [1.1, 1.25, 1.5, 2, 3]

export interface SoloVariant {
  kind: 'none' | 'income' | 'trait' | 'inherited' | 'advisor' | 'copies' | 'favour'
  id: string
  name: string
  // Copies runs: the advisor, their family and how many
  of?: string
  family?: string
  copies?: number
  // What the bot plays with (favoured-family runs play without solo)
  solo: NonNullable<BotConfig['solo']>
  favour?: string
  incomeMult?: number
}

const NOBODY = { trait: null, inherit: null, advisor: null }
const ONLY = process.env.SOLO_ONLY ? new RegExp(process.env.SOLO_ONLY) : null

const SET = process.env.SOLO_SET === 'copies' || process.env.SOLO_SET === 'favour' ? process.env.SOLO_SET : 'singles'
const FAMILIES = [...new Set(ADVISORS.map((a) => a.family))]
const MAX_COPIES = Number(process.env.SOLO_MAX_COPIES ?? (TO_DUKE ? 10 : 6))

export const SOLO_VARIANTS: ReadonlyArray<SoloVariant> = [
  { kind: 'none' as const, id: 'baseline', name: 'Nothing', solo: NOBODY },
  ...INCOME_LADDER.map((k) => ({ kind: 'income' as const, id: `income-${k}`, name: `All income x${k}`, solo: NOBODY, incomeMult: k })),
  ...(SET === 'favour'
    ? FAMILIES.map((f) => ({ kind: 'favour' as const, id: `favour-${f}`, name: f, family: f, favour: f, solo: NOBODY }))
    : SET === 'copies'
    ? ADVISORS.flatMap((a) =>
        Array.from({ length: MAX_COPIES }, (_, i) => ({
          kind: 'copies' as const,
          id: `${a.id}*${i + 1}`,
          name: `${a.name} x${i + 1}`,
          of: a.id,
          family: a.family,
          copies: i + 1,
          solo: { ...NOBODY, advisor: a.id, copies: i + 1 }
        }))
      )
    : [
        ...HEIR_TRAITS.map((t) => ({ kind: 'trait' as const, id: t.id, name: t.name, solo: { ...NOBODY, trait: t.id } })),
        ...INHERITED_TRAITS.map((t) => ({ kind: 'inherited' as const, id: t.id, name: t.name, solo: { ...NOBODY, inherit: t.id } })),
        ...ADVISORS.map((a) => ({ kind: 'advisor' as const, id: a.id, name: a.name, solo: { ...NOBODY, advisor: a.id } }))
      ])
].filter((v) => v.kind === 'none' || v.kind === 'income' || !ONLY || ONLY.test(v.id))

export interface SoloResult {
  id: string
  seed: number
  // Advisors of the measured family on staff, averaged over the minutes played
  held: number
  // Active hours to the first class 9, or to Duke; Infinity if not reached
  hours: number
}

function playOne(v: SoloVariant, seed: number): SoloResult {
  const cfg: BotConfig = {
    ...FAST_TAPPER,
    ...(SET === 'favour' ? { favour: v.favour } : { solo: v.solo }),
    incomeMult: v.incomeMult,
    ...(TO_DUKE ? { elevations: 4 } : {})
  }
  let staffMinutes = 0
  let minutes = 0
  const family = v.favour ?? (v.solo.advisor ? ADVISORS_BY_ID[v.solo.advisor].family : null)
  const gens = runCampaign(TO_DUKE ? 16 : 8, cfg, seed, (store) => {
    minutes += 1
    if (family) staffMinutes += [...store.officeSeats, ...store.paChairs].filter((a) => a && ADVISORS_BY_ID[a.advisorId]?.family === family).length
  })
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
  return { id: v.id, seed, hours: reached ? ms / 3_600_000 : Infinity, held: minutes > 0 ? staffMinutes / minutes : 0 }
}

// One shard of the variants, every seed; the teardown puts the shards together
export async function runSoloShard(shard: number, shards: number): Promise<void> {
  const variants = SOLO_VARIANTS.filter((_, i) => i % shards === shard)
  const rows: Array<SoloResult & { kind: string; name: string; of?: string; family?: string; copies?: number }> = []
  for (const v of variants) {
    for (const seed of SOLO_SEEDS) rows.push({ ...playOne(v, seed), kind: v.kind, name: v.name, of: v.of, family: v.family, copies: v.copies })
    // Let Vitest's worker answer its runner between variants, or it times out
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  mkdirSync(SOLO_DIR, { recursive: true })
  writeFileSync(join(SOLO_DIR, `shard-${shard}.json`), JSON.stringify(rows))
}
