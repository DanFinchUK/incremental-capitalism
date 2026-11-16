import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Node 25+ ships its own global localStorage, which hides jsdom's and is
// undefined without --localstorage-file. Turn it off so tests get jsdom's.
const nodeMajor = Number(process.versions.node.split('.')[0])
const testExecArgv = nodeMajor >= 25 ? ['--no-experimental-webstorage'] : []

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      // The game, and the card index beside it
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        cards: fileURLToPath(new URL('./cards.html', import.meta.url))
      }
    }
  },
  test: {
    environment: 'jsdom',
    poolOptions: {
      forks: { execArgv: testExecArgv },
      threads: { execArgv: testExecArgv }
    }
  }
})
