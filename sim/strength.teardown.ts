// Ranks what the strength shards played (sim/strength.shared.ts) and prints
// the table once every shard is done. Each variant's score is how many
// minutes ahead of the baseline it is at the end of a replay: how much
// sooner it reached the baseline's final net worth, or (behind) how much
// sooner the baseline reached its own.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DIR = join(tmpdir(), 'ic-strength')

interface Row {
  variant: { kind: string; id: string; name: string; ids?: string[] }
  style: string
  seed: number
  generation: number
  path: number[]
  gates: number
  catchUpMinutes: number | null
  disgraced: boolean
}

export function setup(): void {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// Minutes ahead of the baseline at the end of the replay (negative: behind)
function minutesAhead(v: Row, base: Row): number {
  const n = base.path.length
  if (v.disgraced || v.path.length < n) return -n / 6
  const endB = base.path[n - 1]
  const endV = v.path[n - 1]
  if (endV >= endB) return (n - 1 - v.path.findIndex((x) => x >= endB)) / 6
  return -(n - 1 - base.path.findIndex((x) => x >= endV)) / 6
}

const KIND_LABEL: Record<string, string> = { trait: 'Heir trait', inherited: 'Inherited', advisor: 'Advisor', pair: 'Pair' }

export function teardown(): void {
  if (!existsSync(DIR)) return
  const rows: Row[] = readdirSync(DIR)
    .filter((f) => f.startsWith('shard-'))
    .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Row[])
  const key = (r: Row) => `${r.style}/${r.seed}/${r.generation}`
  const baselines = new Map(rows.filter((r) => r.variant.kind === 'none').map((r) => [key(r), r]))
  const styles = [...new Set(rows.map((r) => r.style))]
  const byVariant = new Map<string, Row[]>()
  for (const r of rows) {
    if (r.variant.kind === 'none') continue
    byVariant.set(r.variant.id, [...(byVariant.get(r.variant.id) ?? []), r])
  }
  const table = [...byVariant.values()].map((rs) => {
    const scored = rs.map((r) => ({ r, ahead: minutesAhead(r, baselines.get(key(r))!) }))
    const perStyle = Object.fromEntries(styles.map((s) => [s, median(scored.filter((x) => x.r.style === s).map((x) => x.ahead))]))
    const gates = median(scored.map((x) => x.r.gates - baselines.get(key(x.r))!.gates))
    return {
      id: rs[0].variant.id,
      ids: rs[0].variant.ids,
      kind: rs[0].variant.kind,
      name: rs[0].variant.name,
      overall: median(scored.map((x) => x.ahead)),
      perStyle,
      gates,
      disgraced: rs.filter((r) => r.disgraced).length
    }
  })
  const overallOf = new Map(table.map((t) => [t.id, t.overall]))
  const singles = table.filter((t) => t.kind !== 'pair').sort((a, b) => b.overall - a.overall)
  // A pair against its two advisors' own gains added together
  const pairRows = table
    .filter((t) => t.kind === 'pair')
    .map((t) => ({ ...t, stacking: t.overall - t.ids!.reduce((a, id) => a + (overallOf.get(id) ?? 0), 0) }))
    .sort((a, b) => b.stacking - a.stacking)
  const minutes = baselines.size > 0 ? [...baselines.values()][0].path.length / 6 : 0
  const fmt = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(1)
  const lines = [
    `Minutes ahead of an heir with no trait and an empty office, after ${minutes} minutes of a new generation`,
    `(median over seeds and successions; gates: classes beaten beyond the baseline)`,
    '',
    ['Kind'.padEnd(11), 'Name'.padEnd(26), 'All'.padStart(6), ...styles.map((s) => s.padStart(11)), 'Classes'.padStart(8), 'Disgraced'.padStart(10)].join(' ')
  ]
  for (const t of singles) {
    lines.push(
      [
        KIND_LABEL[t.kind].padEnd(11),
        t.name.padEnd(26),
        fmt(t.overall).padStart(6),
        ...styles.map((s) => fmt(t.perStyle[s]).padStart(11)),
        fmt(t.gates).padStart(8),
        String(t.disgraced).padStart(10)
      ].join(' ')
    )
  }
  if (pairRows.length > 0) {
    lines.push('', 'Groups: together, against their own gains added up (Stacking above 0: more than the sum)', '')
    lines.push(['Group'.padEnd(58), 'Together'.padStart(9), 'Stacking'.padStart(9), ...styles.map((s) => s.padStart(11))].join(' '))
    for (const t of pairRows) {
      lines.push([t.name.padEnd(58), fmt(t.overall).padStart(9), fmt(t.stacking).padStart(9), ...styles.map((s) => fmt(t.perStyle[s]).padStart(11))].join(' '))
    }
  }
  const text = lines.join('\n')
  writeFileSync(join(DIR, 'report.txt'), text)
  console.log('\n' + text + `\n\n(also in ${join(DIR, 'report.txt')})`)
}
