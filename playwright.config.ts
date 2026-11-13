import { defineConfig } from '@playwright/test'

// Browser play tests: `npm run e2e`. They play in real time against the dev
// server, so they stay out of `npm test`.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 240_000,
  use: { baseURL: 'http://localhost:5179', actionTimeout: 10_000 },
  webServer: {
    command: 'npx vite --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: true
  }
})
