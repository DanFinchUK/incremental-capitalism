import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Node 25+ ships its own global localStorage, which hides jsdom's and is
// undefined without --localstorage-file. Turn it off so tests get jsdom's.
const nodeMajor = Number(process.versions.node.split('.')[0])
const testExecArgv = nodeMajor >= 25 ? ['--no-experimental-webstorage'] : []

export default defineConfig({
  base: './',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    poolOptions: {
      forks: { execArgv: testExecArgv },
      threads: { execArgv: testExecArgv }
    }
  }
})
