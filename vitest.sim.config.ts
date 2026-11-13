import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Pacing simulator: `npm run sim`. Kept out of `npm test` because it plays
// hours of simulated game time.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['sim/**/*.sim.ts'],
      testTimeout: 3_600_000,
      hookTimeout: 3_600_000
    }
  })
)
