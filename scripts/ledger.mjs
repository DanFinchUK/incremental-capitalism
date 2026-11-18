// The balance ledger (public/balance/ledger.json): what every heir trait, inherited trait and advisor was
// worth at each balance patch, from the solo runs (npm run sim:solo). Each
// version keeps the runs filed under it, so patches can be compared.
//
//   node scripts/ledger.mjs add <version> "<label>" <results.json>...
//     Files solo results (the results.json a run writes, one to the first
//     class 9 and one to Duke) under a version, with today's date and the
//     commit checked out. Adding to a version that exists replaces those runs.
//
// The Balance Ledger page (public/balance/index.html) reads the ledger as it
// is, so a version filed and pushed is a version on the page.
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const LEDGER = 'public/balance/ledger.json'

function load() {
  return existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { versions: [] }
}

function save(ledger) {
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n')
}

const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'add') {
  const [version, label, ...files] = args
  if (!version || !label || files.length === 0) throw new Error('usage: add <version> "<label>" <results.json>...')
  const ledger = load()
  let entry = ledger.versions.find((v) => v.version === version)
  if (!entry) {
    entry = { version, label, runs: {} }
    ledger.versions.push(entry)
  }
  entry.label = label
  entry.date = new Date().toISOString().slice(0, 10)
  entry.commit = execSync('git rev-parse --short HEAD').toString().trim()
  for (const f of files) {
    const run = JSON.parse(readFileSync(f, 'utf8'))
    entry.runs[run.to] = run
  }
  save(ledger)
  console.log(`${version}: ${Object.keys(entry.runs).join(', ')} filed`)
} else {
  throw new Error('commands: add')
}
