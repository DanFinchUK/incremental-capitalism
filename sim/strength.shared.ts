// How strong each heir trait, inherited trait and advisor is, measured the
// same way for all of them: play a bloodline to a succession, save it there,
// then play the next generation's first minutes again and again from that
// save, changing one thing each time. Every replay uses the same seed, so
// the luck is shared and the difference is down to the one thing changed.
//
// The office is emptied at the save (PAs let go, no introductions taken), so
// an advisor is measured alone; a trait is measured with nobody hired.
// `npm run sim:strength` plays every variant and prints the table
// (sim/strength.teardown.ts).
declare const process: { env: Record<string, string | undefined> }
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { ADVISORS, ADVISORS_BY_ID } from '../src/data/advisors'
import { HEIR_TRAITS, INHERITED_TRAITS } from '../src/data/heirs'
import { useGameStore } from '../src/stores/game'
import { FAST_TAPPER, ZERO_TAP, buyPerks, decide, runCampaign, seededRandom, type BotConfig, type Store } from './bot'

export const STRENGTH_DIR = join(tmpdir(), 'ic-strength')

// Who plays, and from which successions (the generation about to start)
export const STRENGTH_STYLES: ReadonlyArray<{ name: string; cfg: BotConfig }> = [
  { name: 'tapper', cfg: FAST_TAPPER },
  { name: 'non-tapper', cfg: ZERO_TAP }
]
export const STRENGTH_SEEDS = [1, 2, 3]
export const STRENGTH_GENERATIONS = [2, 4]
// How long each replay plays
export const STRENGTH_MINUTES = Number(process.env.STRENGTH_MINUTES ?? 15)

export type Variant =
  | { kind: 'none'; id: 'baseline'; name: string }
  | { kind: 'trait'; id: string; name: string }
  | { kind: 'inherited'; id: string; name: string }
  | { kind: 'advisor'; id: string; name: string }
  | { kind: 'pair'; id: string; name: string; ids: string[] }

// Advisors together, to see how they stack: every pair within a family
// (Day Trader with Stockbroker), and any group named in STRENGTH_PAIRS
// ("day-trader+stockbroker+hedge-fund-founder,proxy+head-butler")
function pairs(): Variant[] {
  const out = new Map<string, string[]>()
  for (let i = 0; i < ADVISORS.length; i++) {
    for (let j = i + 1; j < ADVISORS.length; j++) {
      if (ADVISORS[i].family === ADVISORS[j].family) out.set(`${ADVISORS[i].id}+${ADVISORS[j].id}`, [ADVISORS[i].id, ADVISORS[j].id])
    }
  }
  for (const p of (process.env.STRENGTH_PAIRS ?? '').split(',').filter(Boolean)) {
    const ids = p.split('+')
    if (ids.length > 1 && ids.every((a) => ADVISORS_BY_ID[a])) out.set(p, ids)
  }
  return [...out.entries()].map(([id, ids]) => ({
    kind: 'pair' as const,
    id,
    name: ids.map((a) => ADVISORS_BY_ID[a].name).join(' + '),
    ids
  }))
}

// STRENGTH_ONLY: a pattern; only variants whose id matches are played
// (the baseline always is). STRENGTH_DEREG: every replay, baseline
// included, starts with this many ranks of Light-Touch Regulation.
const ONLY = process.env.STRENGTH_ONLY ? new RegExp(process.env.STRENGTH_ONLY) : null
const DEREG = process.env.STRENGTH_DEREG === undefined ? null : Number(process.env.STRENGTH_DEREG)

export const VARIANTS: ReadonlyArray<Variant> = [
  { kind: 'none', id: 'baseline', name: 'Nobody' },
  ...HEIR_TRAITS.map((t) => ({ kind: 'trait' as const, id: t.id, name: t.name })),
  ...INHERITED_TRAITS.map((t) => ({ kind: 'inherited' as const, id: t.id, name: t.name })),
  ...ADVISORS.map((a) => ({ kind: 'advisor' as const, id: a.id, name: a.name })),
  ...pairs()
]

interface Checkpoint {
  style: string
  seed: number
  generation: number
  ts: number
  storage: Array<[string, string]>
}

function copyStorage(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!
    out.push([k, localStorage.getItem(k)!])
  }
  return out
}

// Play to the start of a generation and keep the save, heirs still on offer
export function makeCheckpoint(style: string, cfg: BotConfig, seed: number, generation: number): Checkpoint | null {
  let found: Checkpoint | null = null
  runCampaign(6, cfg, seed, undefined, (store, next, ts) => {
    if (next < generation) return false
    store.flushSave(ts)
    found = { style, seed, generation, ts, storage: copyStorage() }
    return true
  })
  return found
}

export interface StretchResult {
  // log10 of net worth every 10 seconds, from the start
  path: number[]
  gates: number
  // Minutes to beat the bloodline's best gate so far, or null if not within the stretch
  catchUpMinutes: number | null
  disgraced: boolean
}

export function playStretch(cp: Checkpoint, cfg: BotConfig, v: Variant): StretchResult {
  const realRandom = Math.random
  Math.random = seededRandom(cp.seed * 1000 + cp.generation)
  try {
    localStorage.clear()
    for (const [k, val] of cp.storage) localStorage.setItem(k, val)
    setActivePinia(createPinia())
    const store: Store = useGameStore()
    let ts = cp.ts
    store.hydrateFromStorage(ts)
    // An empty office: the family's PAs go, so only the variant is on staff
    for (let i = store.paChairs.length - 1; i >= 0; i--) if (store.paChairs[i]) store.firePA(i)
    const name = store.heirChoices[0]?.name ?? 'Heir'
    store.heirChoices = [
      {
        name,
        traitId: v.kind === 'trait' ? v.id : null,
        inheritId: v.kind === 'inherited' ? v.id : null
      }
    ]
    store.pickHeir(0)
    const playCfg: BotConfig = { ...cfg, noHiring: true }
    buyPerks(store, playCfg)
    if (DEREG !== null) store.perks.deregulation = DEREG
    // Into the empty PA chair first, then an office seat
    for (const id of v.kind === 'advisor' ? [v.id] : v.kind === 'pair' ? v.ids : []) {
      store.headhunterOffer = [id]
      store.hireAdvisor(0)
    }
    const target = store.bloodlineDeepestGate
    let catchUp: number | null = null
    let clickCredit = 0
    const path: number[] = []
    for (let sec = 0; sec < STRENGTH_MINUTES * 60; sec++) {
      const hard = store.activeGenerationMs < playCfg.openingMinutes * 60_000 || store.bossAttempt !== null
      clickCredit += hard ? playCfg.clicksPerSec : playCfg.casualClicksPerSec
      const clicks = Math.floor(clickCredit)
      clickCredit -= clicks
      for (let c = 0; c < clicks; c++) store.manualClick(ts + Math.floor((c * 1000) / clicks))
      ts += 1000
      store.tick(ts)
      if (store.classModalOpen) store.closeClassModal()
      if (sec % 10 === 9) path.push(Math.log10(Math.max(1, store.netWorth)))
      if (store.disgraceReport) return { path, gates: store.gatesBeaten, catchUpMinutes: null, disgraced: true }
      if (catchUp === null && store.gatesBeaten > target) catchUp = (sec + 1) / 60
      if ((ts / 1000) % playCfg.decideEverySec === 0) decide(store, playCfg)
    }
    return { path, gates: store.gatesBeaten, catchUpMinutes: catchUp, disgraced: false }
  } finally {
    Math.random = realRandom
  }
}

// One shard of the variants, every style, seed and succession; the results
// go to a file for the teardown to rank
export function runShard(shard: number, shards: number): void {
  const variants = VARIANTS.filter((v) => v.kind === 'none' || !ONLY || ONLY.test(v.id)).filter(
    (v, i) => v.kind === 'none' || i % shards === shard
  )
  const rows: Array<{ variant: Variant; style: string; seed: number; generation: number } & StretchResult> = []
  for (const { name, cfg } of STRENGTH_STYLES) {
    for (const seed of STRENGTH_SEEDS) {
      for (const generation of STRENGTH_GENERATIONS) {
        const cp = makeCheckpoint(name, cfg, seed, generation)
        if (!cp) continue
        for (const v of variants) rows.push({ variant: v, style: name, seed, generation, ...playStretch(cp, cfg, v) })
      }
    }
  }
  mkdirSync(STRENGTH_DIR, { recursive: true })
  writeFileSync(join(STRENGTH_DIR, `shard-${shard}.json`), JSON.stringify(rows))
}
