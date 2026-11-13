import { describe, expect, it } from 'vitest'

const DATA_COPY = ['items', 'headlines', 'classes', 'events', 'perks', 'intro', 'bosses'].map((f) => `../src/data/${f}.ts`)
const SOURCES = {
  ...import.meta.glob<string>('../src/data/*.ts', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../src/components/*.vue', { query: '?raw', import: 'default', eager: true }),
  // Store announcements are player-facing banners
  ...import.meta.glob<string>('../src/stores/**/*.ts', { query: '?raw', import: 'default', eager: true })
}
const COPY_FILES = Object.keys(SOURCES).filter(
  (path) => path.endsWith('.vue') || path.includes('/stores/') || DATA_COPY.includes(path)
)

describe('copy rules', () => {
  it('uses no em dashes in player-facing copy', () => {
    expect(COPY_FILES.length).toBeGreaterThan(15)
    for (const file of COPY_FILES) {
      expect(SOURCES[file].includes('—'), file).toBe(false)
    }
  })
})
