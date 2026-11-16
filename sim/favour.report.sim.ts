// What a favour would be worth: once a minute of a campaign, without calling
// one in, it draws the three events the game would offer and records what
// each would add to income, as a share of income. Env vars: SIM_HOURS
// (default 3), SIM_PACE (fast or zero).
declare const process: { env: Record<string, string | undefined> }
import { it } from 'vitest'
import { FAVOUR_EVENTS, pickFavourOffer } from '../src/data/favours'
import { FAST_TAPPER, ZERO_TAP, runCampaign } from './bot'

type Stage = 'gates 0-3' | 'gates 4-6' | 'gates 7-9'

function stageOf(gates: number): Stage {
  return gates <= 3 ? 'gates 0-3' : gates <= 6 ? 'gates 4-6' : 'gates 7-9'
}

function pct(xs: number[], p: number): number {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

function fmt(share: number): string {
  return `${Math.round(share * 100)}%`
}

// Its own generator, so drawing sample offers doesn't change the campaign
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

it('prints what a favour would be worth', () => {
  const pace = process.env.SIM_PACE === 'zero' ? ZERO_TAP : FAST_TAPPER
  const draw = rng(7)
  const best: Record<Stage, number[]> = { 'gates 0-3': [], 'gates 4-6': [], 'gates 7-9': [] }
  const worst: Record<Stage, number[]> = { 'gates 0-3': [], 'gates 4-6': [], 'gates 7-9': [] }
  const offered: Record<string, number> = {}
  runCampaign(Number(process.env.SIM_HOURS ?? 3), pace, 1, (store) => {
    const weights = Object.fromEntries(FAVOUR_EVENTS.map((e) => [e.id, Math.max(0, store.favourEventValue(e.id))]))
    const offer = pickFavourOffer(draw, weights)
    if (offer.length === 0) return
    const values = offer.map((id) => weights[id])
    const stage = stageOf(store.gatesBeaten)
    best[stage].push(Math.max(...values))
    worst[stage].push(Math.min(...values))
    for (const id of offer) offered[id] = (offered[id] ?? 0) + 1
  })

  console.log('A favour, as extra income on top of what you earn now (best and worst of the three offered)')
  console.log('stage        best: median   p10   p90 | worst: median   p10   p90')
  for (const stage of ['gates 0-3', 'gates 4-6', 'gates 7-9'] as const) {
    const b = best[stage]
    const w = worst[stage]
    if (b.length === 0) continue
    console.log(
      `${stage.padEnd(13)}${fmt(pct(b, 0.5)).padStart(12)}${fmt(pct(b, 0.1)).padStart(6)}${fmt(pct(b, 0.9)).padStart(6)} |${fmt(pct(w, 0.5)).padStart(14)}${fmt(pct(w, 0.1)).padStart(6)}${fmt(pct(w, 0.9)).padStart(6)}`
    )
  }
  const total = Object.values(offered).reduce((a, b) => a + b, 0)
  console.log('How often each event is offered:')
  for (const e of FAVOUR_EVENTS) console.log(`  ${e.title.padEnd(50)}${fmt((offered[e.id] ?? 0) / total).padStart(5)}`)
})
