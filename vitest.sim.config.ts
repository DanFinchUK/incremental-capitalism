import { availableParallelism } from 'node:os'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Pacing simulator: `npm run sim`. Kept out of `npm test` because it plays
// hours of simulated game time.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // `npm run sim` runs the checks; `npm run sim:reports` prints the
      // tuning reports, which check nothing
      // `npm run sim:strength` plays sim/strength*.strength.ts and ranks
      // the results in sim/strength.teardown.ts
      include:
        process.env.npm_lifecycle_event === 'sim:solo'
          ? ['sim/**/*.solo.ts']
          : process.env.npm_lifecycle_event === 'sim:strength'
          ? ['sim/**/*.strength.ts']
          : process.env.npm_lifecycle_event === 'sim:reports'
            ? ['sim/**/*.report.sim.ts']
            : ['sim/**/*.sim.ts'],
      exclude: ['sim:reports', 'sim:strength', 'sim:solo'].includes(process.env.npm_lifecycle_event ?? '') ? [] : ['sim/**/*.report.sim.ts'],
      globalSetup:
        process.env.npm_lifecycle_event === 'sim:strength'
          ? ['sim/strength.teardown.ts']
          : process.env.npm_lifecycle_event === 'sim:solo'
            ? ['sim/solo.teardown.ts']
            : [],
      // Every file is a long, single-threaded campaign: run one per core
      // (Vitest's default leaves half of them idle)
      maxWorkers: availableParallelism(),
      minWorkers: availableParallelism(),
      testTimeout: 3_600_000,
      hookTimeout: 3_600_000
    }
  })
)
