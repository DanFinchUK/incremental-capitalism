// Gives each `npm run sim` its own folder for the line check's shared
// campaigns (sim/lines.shared.ts), and clears it away afterwards.
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestProject } from 'vitest/node'

export default function setup(project: TestProject): () => void {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  project.provide('linesRun', run)
  return () => rmSync(join(tmpdir(), 'ic-lines', run), { recursive: true, force: true })
}
