import { describe, expect, it } from 'vitest'
import { FIRST_LEGACY_LIFETIME } from '../src/engine/economy'
import { parseSavedState, serializeState } from '../src/engine/migration'

const REAL_V1_SAVE = JSON.stringify({
  scene: {
    money: 295024779.95931214,
    jobsPurchased: {
      '1': 120, '2': 64, '3': 45, '4': 36, '5': 28, '6': 25,
      '7': 22, '8': 19, '9': 15, '10': 13, '11': 11, '12': 10
    },
    businessesOwned: { '1': 35, '2': 26, '3': 17, '4': 10, '5': 10 },
    legacyPoints: 34,
    legacySpent: 34,
    autoClickers: 17,
    lifetimePurchases: {
      jobs: {
        '1': 554, '2': 271, '3': 185, '4': 143, '5': 109, '6': 95,
        '7': 82, '8': 69, '9': 49, '10': 44, '11': 32, '12': 26,
        '13': 7, '14': 2, '15': 1
      },
      businesses: {
        '1': 158, '2': 99, '3': 55, '4': 33, '5': 27,
        '6': 5, '7': 1, '8': 2, '9': 1
      }
    },
    autoBuyDisabled: {
      jobs: { '6': false, '7': false, '8': false, '9': false, '10': false, '12': false },
      businesses: { '5': false }
    },
    lastUpdate: null
  }
})

describe('v1 -> v2 save migration', () => {
  it('migrates real 34-Legacy v1 Vuex save seamlessly without point loss or free points', () => {
    const state = parseSavedState(REAL_V1_SAVE)
    expect(state.legacyPoints).toBe(34)
    expect(state.legacySpent).toBe(34)
    expect(state.perks.autoClicker).toBe(17)
    expect(state.perks.trustFund).toBe(0)
    expect(state.lifetimeEarned).toBe(FIRST_LEGACY_LIFETIME * 34 * 34)
    expect(state.spentThisRun).toBeGreaterThan(2_000_000_000)
    expect(state.seenItems.jobs['15']).toBe(true)
    expect(state.seenItems.businesses['9']).toBe(true)
    expect(state.seenItems.businesses['19']).toBeFalsy()
  })

  it('round-trips v2 state cleanly and recovers safely from corrupt JSON', () => {
    const migrated = parseSavedState(REAL_V1_SAVE)
    migrated.bulkBuyMode = 'next'
    migrated.muted = true
    const encoded = serializeState(migrated)
    const reloaded = parseSavedState(encoded)
    expect(reloaded.bulkBuyMode).toBe('next')
    expect(reloaded.muted).toBe(true)
    expect(reloaded.perks.autoClicker).toBe(17)

    const fallback = parseSavedState('{not-valid-json')
    expect(fallback.money).toBe(0)
    expect(fallback.legacyPoints).toBe(0)
  })
})
