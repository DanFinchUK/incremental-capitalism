// How much a favour would be worth, under different rules for what it lends.
// Once a minute of a campaign it works out, without calling one in, what one
// lent unit would add to income, as a share of income, for each rule. Env
// vars: SIM_HOURS (default 3), SIM_PACE (fast or zero).
declare const process: { env: Record<string, string | undefined> }
import { it } from 'vitest'
import { BUSINESSES, JOBS, type ItemKind } from '../src/data/items'
import { computeClickIncome, computePassivePerSecond, type EconomySnapshotInput } from '../src/engine/economy'
import { FAST_TAPPER, ZERO_TAP, runCampaign } from './bot'

type Store = Parameters<NonNullable<Parameters<typeof runCampaign>[3]>>[0]
type Rule = 'bottom card' | 'above highest owned' | 'above highest affordable'
const RULES: Rule[] = ['bottom card', 'above highest owned', 'above highest affordable']

interface Sample {
  stage: 'gates 0-3' | 'gates 4-6' | 'gates 7-9'
  kind: ItemKind
  rule: Rule
  share: number
}

function itemsOf(kind: ItemKind) {
  return kind === 'jobs' ? JOBS : BUSINESSES
}

function ownedOf(store: Store, kind: ItemKind): Record<string, number> {
  return kind === 'jobs' ? store.jobsPurchased : store.businessesOwned
}

function lendTarget(store: Store, kind: ItemKind, rule: Rule): string | null {
  const items = itemsOf(kind)
  if (rule === 'bottom card') return store.favourTarget(kind)
  let top = -1
  items.forEach((item, i) => {
    const counts =
      rule === 'above highest owned'
        ? (ownedOf(store, kind)[item.id] ?? 0) > 0
        : store.itemQuote(kind, item.id, 1).canAfford
    if (counts) top = i
  })
  return items[top + 1]?.id ?? null
}

// Income a second: passive, plus taps at the player's rate
function income(input: EconomySnapshotInput, tapsPerSec: number): number {
  return computePassivePerSecond(input) + tapsPerSec * computeClickIncome(input, true)
}

function stageOf(gates: number): Sample['stage'] {
  return gates <= 3 ? 'gates 0-3' : gates <= 6 ? 'gates 4-6' : 'gates 7-9'
}

function pct(xs: number[], p: number): number {
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
}

function fmt(share: number): string {
  return share >= 10 ? `${share.toFixed(0)}x` : `${(share * 100).toFixed(0)}%`
}

it('prints what a favour would be worth', () => {
  const pace = process.env.SIM_PACE === 'zero' ? ZERO_TAP : FAST_TAPPER
  const tapsPerSec = pace.noTap ? 0 : pace.casualClicksPerSec
  const samples: Sample[] = []
  runCampaign(Number(process.env.SIM_HOURS ?? 3), pace, 1, (store) => {
    const base: EconomySnapshotInput = { ...store.economyInput, loans: undefined }
    const before = income(base, tapsPerSec)
    if (before <= 0) return
    for (const kind of ['jobs', 'businesses'] as const) {
      for (const rule of RULES) {
        const id = lendTarget(store, kind, rule)
        if (!id) continue
        const loans = { jobs: {}, businesses: {}, [kind]: { [id]: 1 } }
        const after = income({ ...base, loans }, tapsPerSec)
        samples.push({ stage: stageOf(store.gatesBeaten), kind, rule, share: after / before - 1 })
      }
    }
  })

  console.log('One lent unit, as extra income on top of what you earn now')
  console.log('rule                      list        stage      median   p90    max   >50%  >100%')
  for (const rule of RULES) {
    for (const kind of ['jobs', 'businesses'] as const) {
      for (const stage of ['gates 0-3', 'gates 4-6', 'gates 7-9'] as const) {
        const xs = samples.filter((s) => s.rule === rule && s.kind === kind && s.stage === stage).map((s) => s.share)
        if (xs.length === 0) continue
        const over = (t: number) => `${Math.round((xs.filter((x) => x > t).length / xs.length) * 100)}%`
        console.log(
          `${rule.padEnd(26)}${kind.padEnd(12)}${stage.padEnd(11)}${fmt(pct(xs, 0.5)).padStart(6)}${fmt(pct(xs, 0.9)).padStart(7)}${fmt(Math.max(...xs)).padStart(7)}${over(0.5).padStart(6)}${over(1).padStart(7)}`
        )
      }
    }
  }
})
