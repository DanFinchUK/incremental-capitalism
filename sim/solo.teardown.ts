// Ranks the solo runs (sim/solo.shared.ts) once every shard is done. Each
// variant's time is compared with the baseline's seed by seed, then read
// against the income ladder: "worth about xN income" is the plain income
// boost that would have saved as much time.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

declare const process: { env: Record<string, string | undefined> }

const DIR = join(tmpdir(), 'ic-solo')

interface Row {
  id: string
  kind: string
  name: string
  of?: string
  family?: string
  copies?: number
  seed: number
  hours: number
  held?: number
}

export function setup(): void {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const stdErr = (xs: number[]) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1) / xs.length))

// Read a time ratio (variant / baseline) as the income multiplier that gives
// the same ratio, between the ladder's points, on log scales; beyond the
// ladder's ends, along the nearest segment
function incomeFor(logRatio: number, ladder: Array<{ logMult: number; logRatio: number }>): number {
  const pts = [{ logMult: 0, logRatio: 0 }, ...ladder].sort((a, b) => a.logMult - b.logMult)
  let i = 0
  while (i < pts.length - 2 && logRatio < pts[i + 1].logRatio) i++
  const a = pts[i]
  const b = pts[i + 1]
  const t = (logRatio - a.logRatio) / (b.logRatio - a.logRatio)
  return Math.exp(a.logMult + t * (b.logMult - a.logMult))
}

export function teardown(): void {
  if (!existsSync(DIR)) return
  const rows: Row[] = readdirSync(DIR)
    .filter((f) => f.startsWith('shard-'))
    .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Row[])
  const base = new Map(rows.filter((r) => r.id === 'baseline').map((r) => [r.seed, r.hours]))
  const byId = new Map<string, Row[]>()
  for (const r of rows) byId.set(r.id, [...(byId.get(r.id) ?? []), r])
  // Seed by seed, the log of the time against the baseline's
  const logRatios = (rs: Row[]) => rs.filter((r) => Number.isFinite(r.hours) && base.has(r.seed)).map((r) => Math.log(r.hours / base.get(r.seed)!))
  const ladder = [...byId.values()]
    .filter((rs) => rs[0].kind === 'income')
    .map((rs) => ({ logMult: Math.log(Number(rs[0].id.replace('income-', ''))), logRatio: mean(logRatios(rs)) }))
  const table = [...byId.values()]
    .filter((rs) => rs[0].kind !== 'none')
    .map((rs) => {
      const lr = logRatios(rs)
      const m = mean(lr)
      return {
        id: rs[0].id,
        kind: rs[0].kind,
        name: rs[0].name,
        of: rs[0].of,
        family: rs[0].family,
        copies: rs[0].copies,
        held: mean(rs.map((r) => r.held ?? 0)),
        saved: 1 - Math.exp(m),
        err: stdErr(lr),
        income: incomeFor(m, ladder),
        missed: rs.length - lr.length
      }
    })
    .sort((a, b) => b.income - a.income)
  const baseHours = mean([...base.values()])
  const KIND: Record<string, string> = { income: 'Yardstick', trait: 'Heir trait', inherited: 'Inherited', advisor: 'Advisor', copies: 'Copies', favour: 'Favoured' }
  const pct = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}%`
  const lines = [
    `Solo runs: one thing on offer for the whole run, against nothing (${baseHours.toFixed(2)} h on average)`,
    `Time saved, seed by seed against the baseline (± one standard error), and the plain income boost that saves as much`,
    '',
    ['Kind'.padEnd(11), 'Name'.padEnd(28), 'Time saved'.padStart(11), '±'.padStart(6), 'Worth'.padStart(8), 'Unfinished'.padStart(11)].join(' ')
  ]
  for (const t of table) {
    lines.push(
      [
        KIND[t.kind].padEnd(11),
        t.name.padEnd(28),
        pct(t.saved).padStart(11),
        `${(100 * t.err).toFixed(1)}%`.padStart(6),
        `x${t.income.toFixed(2)}`.padStart(8),
        String(t.missed).padStart(11)
      ].join(' ')
    )
  }
  const text = lines.join('\n')
  writeFileSync(join(DIR, 'report.txt'), text)
  // The same, as data, for the balance ledger (scripts/ledger.mjs)
  writeFileSync(
    join(DIR, 'results.json'),
    JSON.stringify({
      to: process.env.SOLO_TO === 'duke' ? 'duke' : 'class9',
      // Where the ledger files it: singles under the run's length, the rest
      // under their set's name as well
      key: `${process.env.SOLO_SET === 'copies' || process.env.SOLO_SET === 'favour' ? `${process.env.SOLO_SET}-` : ''}${process.env.SOLO_TO === 'duke' ? 'duke' : 'class9'}`,
      seeds: Math.max(...rows.map((r) => r.seed)),
      baselineHours: baseHours,
      rows: table.map((t) => ({
        id: t.id,
        kind: t.kind,
        name: t.name,
        ...(t.of ? { of: t.of, family: t.family, copies: t.copies } : {}),
        ...(t.kind === 'favour' ? { family: t.family } : {}),
        ...(t.kind === 'advisor' || t.kind === 'copies' || t.kind === 'favour' ? { held: Number(t.held.toFixed(2)) } : {}),
        worth: t.income,
        saved: t.saved,
        err: t.err,
        unfinished: t.missed
      }))
    })
  )
  console.log('\n' + text + `\n\n(also in ${join(DIR, 'report.txt')})`)
}
