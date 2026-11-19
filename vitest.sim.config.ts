import { availableParallelism } from 'node:os'
import { defineConfig, mergeConfig } from 'vitest/config'
import { BaseSequencer, type TestSpecification } from 'vitest/node'
import viteConfig from './vite.config'

// The line check's files start first: between them they share out fifteen
// Duke campaigns (sim/lines.shared.ts), the longest work in the sim, and the
// shorter files fill the other workers around them.
class LinesFirst extends BaseSequencer {
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const sorted = await super.sort(files)
    const lines = (f: TestSpecification) => (f.moduleId.includes('/sim/pacing.lines') ? 0 : 1)
    return [...sorted].sort((a, b) => lines(a) - lines(b))
  }
}

// Pacing simulator: `npm run sim`. Kept out of `npm test` because it plays
// hours of simulated game time.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // `npm run sim` runs the checks; `npm run sim:reports` prints the
      // tuning reports, which check nothing
      // `npm run sim:solo` plays sim/solo*.solo.ts and ranks the results in
      // sim/solo.teardown.ts
      include:
        process.env.npm_lifecycle_event === 'sim:solo'
          ? ['sim/**/*.solo.ts']
          : process.env.npm_lifecycle_event === 'sim:reports'
            ? ['sim/**/*.report.sim.ts']
            : ['sim/**/*.sim.ts'],
      exclude: ['sim:reports', 'sim:solo'].includes(process.env.npm_lifecycle_event ?? '') ? [] : ['sim/**/*.report.sim.ts'],
      globalSetup:
        process.env.npm_lifecycle_event === 'sim:solo'
          ? ['sim/solo.teardown.ts']
          : process.env.npm_lifecycle_event === 'sim:reports'
            ? []
            : ['sim/lines.setup.ts'],
      sequence: { sequencer: LinesFirst },
      // Every file is a long, single-threaded campaign: run one per core
      // (Vitest's default leaves half of them idle)
      maxWorkers: availableParallelism(),
      minWorkers: availableParallelism(),
      testTimeout: 3_600_000,
      hookTimeout: 3_600_000
    }
  })
)
