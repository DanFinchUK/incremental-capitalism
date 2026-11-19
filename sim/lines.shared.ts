// The line check's campaigns (sim/pacing.lines.sim.ts), shared out between
// Vitest's workers. Fifteen Duke campaigns in one file took longer than the
// rest of the sim together, so each seed is up for grabs: a worker claims
// one by creating its claim file, which only one can do, plays it, and
// writes what it found. The helper files (sim/pacing.lines.help*.sim.ts)
// only claim and play; the check claims whatever is left, then waits for the
// seeds others are still playing. Run on its own, the check plays them all.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inject } from 'vitest'
import { FAST_TAPPER, runCampaign } from './bot'

declare module 'vitest' {
  export interface ProvidedContext {
    // This run's own folder name, so a claim from an earlier run counts for nothing
    linesRun: string
  }
}

// Fifteen seeds: one line's length swings a lot with the heirs drawn
export const LINE_SEEDS = Array.from({ length: 15 }, (_, i) => i + 1)

// Active minutes each line took, Commoner first
function lineMinutes(seed: number): number[] {
  const gens = runCampaign(12, { ...FAST_TAPPER, elevations: 4 }, seed)
  const lines: number[] = [0]
  for (const g of gens) {
    lines[lines.length - 1] += g.activeMinutes
    if (g.deepestGate === 9) lines.push(0)
  }
  return lines.filter((m) => m > 0)
}

function runDir(): string {
  const dir = join(tmpdir(), 'ic-lines', inject('linesRun'))
  mkdirSync(dir, { recursive: true })
  return dir
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Plays every seed nobody has claimed yet
export async function playUnclaimedLines(): Promise<void> {
  const dir = runDir()
  for (const seed of LINE_SEEDS) {
    try {
      writeFileSync(join(dir, `${seed}.claim`), '', { flag: 'wx' })
    } catch {
      continue
    }
    const done = join(dir, `${seed}.json`)
    // Written whole, then renamed, so nobody reads half of it
    writeFileSync(`${done}.part`, JSON.stringify(lineMinutes(seed)))
    renameSync(`${done}.part`, done)
    // Let Vitest's worker answer its runner between campaigns
    await pause(0)
  }
}

// Every seed's lines, once all are played
export async function allLines(): Promise<number[][]> {
  await playUnclaimedLines()
  const dir = runDir()
  const file = (seed: number) => join(dir, `${seed}.json`)
  while (!LINE_SEEDS.every((seed) => existsSync(file(seed)))) await pause(100)
  return LINE_SEEDS.map((seed) => JSON.parse(readFileSync(file(seed), 'utf8')) as number[])
}
