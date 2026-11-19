// The comment a balance pull request gets (.github/workflows/balance.yml):
// whether the sim's checks passed, and how the pull request's solo runs
// compare with the latest version in the ledger on the same ladder.
//
//   node scripts/balance-report.mjs <sim-output.txt> <results.json>... > comment.md
//
// A change counts only when it is bigger than twice the two runs' noise
// together (their standard errors of time saved, added in quadrature).
import { existsSync, readFileSync } from 'node:fs'

const [simFile, ...resultFiles] = process.argv.slice(2)
const ledger = JSON.parse(readFileSync('public/balance/ledger.json', 'utf8'))
const latest = ledger.versions.at(-1)
const out = []
const say = (line = '') => out.push(line)

const LADDER = { classic: 'original ladder', trial: 'new ladder' }
const RUN = (r) => `${LADDER[r.ladder ?? 'classic']}, ${r.key.includes('copies') ? 'copies' : 'one of each'}, played to ${r.to === 'duke' ? 'Duke' : 'the first class 9'}`
const pct = (x) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}%`
const times = (x) => `x${x.toFixed(2)}`

say('## Balance report')
say()

// The sim's checks
if (simFile && existsSync(simFile)) {
  // Without the terminal's colour codes
  const sim = readFileSync(simFile, 'utf8').replace(/\x1b\[[0-9;]*m/g, '')
  const tests = sim.match(/Tests\s+(.*)/)?.[1]?.trim() ?? 'no result'
  const failed = [...sim.matchAll(/ FAIL (.*)\n(AssertionError: .*)?/g)].map((m) => `- ${m[1].trim()}${m[2] ? `: ${m[2].replace('AssertionError: ', '')}` : ''}`)
  const lines = sim.match(/line minutes \(median\): (.*)/)?.[1]
  say(`**\`npm run sim\`:** ${failed.length > 0 ? 'failed' : 'passed'} (${tests})`)
  if (failed.length > 0) say(failed.join('\n'))
  if (lines) say(`\nLine minutes, Commoner to Marquess: ${lines}`)
  say()
}

say(`Compared with **${latest.version}** (${latest.label}, ${latest.date}), where it has a matching run.`)
say()

for (const f of resultFiles) {
  if (!existsSync(f)) continue
  const run = JSON.parse(readFileSync(f, 'utf8'))
  const base = latest.runs[run.key]
  say(`### ${RUN(run)}`)
  say()
  say(`${run.seeds} seeds; baseline ${run.baselineHours.toFixed(2)} h.`)
  if (!base) {
    const top = run.rows.filter((r) => r.kind !== 'income').slice(0, 10)
    say(`No ${latest.version} run to compare with. Top ten:`)
    say()
    say('| Name | Worth | Time saved |')
    say('|---|---|---|')
    for (const r of top) say(`| ${r.name} | ${times(r.worth)} | ${pct(r.saved)} ± ${(100 * r.err).toFixed(1)}% |`)
    say()
    continue
  }
  const before = new Map(base.rows.map((r) => [r.id, r]))
  const moved = []
  for (const r of run.rows) {
    if (r.kind === 'income') continue
    const b = before.get(r.id)
    if (!b) continue
    const noise = 2 * Math.hypot(r.err, b.err)
    const change = r.saved - b.saved
    if (Math.abs(change) > noise) moved.push({ ...r, was: b.worth, change, noise })
  }
  moved.sort((a, b) => b.change - a.change)
  if (moved.length === 0) {
    say('Nothing moved by more than the noise.')
  } else {
    say(`${moved.length} moved by more than the noise:`)
    say()
    say(`| Name | ${latest.version} | This PR | Time saved change |`)
    say('|---|---|---|---|')
    for (const r of moved.slice(0, 25)) say(`| ${r.name} | ${times(r.was)} | ${times(r.worth)} | ${pct(r.change)} (noise ±${(100 * r.noise).toFixed(1)}%) |`)
    if (moved.length > 25) say(`\n…and ${moved.length - 25} more.`)
  }
  say()
}

say('<sub>From `.github/workflows/balance.yml`. The bot plays better than most people; see "What these runs assume" on the Balance Ledger page.</sub>')
console.log(out.join('\n'))
