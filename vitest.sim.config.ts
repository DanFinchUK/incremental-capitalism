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
      include: process.env.npm_lifecycle_event === 'sim:reports' ? ['sim/**/*.report.sim.ts'] : ['sim/**/*.sim.ts'],
      exclude: process.env.npm_lifecycle_event === 'sim:reports' ? [] : ['sim/**/*.report.sim.ts'],
      testTimeout: 3_600_000,
      hookTimeout: 3_600_000
    }
  })
)
