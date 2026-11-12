import { describe, expect, it } from 'vitest'
import { FIRST_LEGACY_LIFETIME, computeLegacyBracket, computeLegacyGain } from '../src/engine/economy'
import { createInitialSceneState, parseSavedState, serializeState } from '../src/engine/migration'

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

describe('v1/v2 -> v3 save migration', () => {
  it('migrates real 34-Legacy v1 Vuex save seamlessly without point loss or free points', () => {
    const state = parseSavedState(REAL_V1_SAVE)
    expect(state.legacyPoints).toBe(34)
    expect(state.legacySpent).toBe(34)
    expect(state.perks.autoClicker).toBe(17)
    expect(state.perks.trustFund).toBe(0)
    expect(state.compactAutoBuy).toBe(false)
    expect(state.lifetimeEarned).toBe(FIRST_LEGACY_LIFETIME * 34 * 34)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(0)
    expect(state.spentThisRun).toBeGreaterThan(2_000_000_000)
    expect(state.seenItems.jobs['15']).toBe(true)
    expect(state.seenItems.businesses['9']).toBe(true)
    expect(state.seenItems.businesses['19']).toBeFalsy()
  })

  it('preserves 0-Legacy v2 lifetimeEarned unscaled so a £500B run immediately unlocks +1 Legacy', () => {
    const v2ZeroLegacy = JSON.stringify({
      schemaVersion: 2,
      scene: {
        ...createInitialSceneState(),
        money: 40_000_000_000,
        spentThisRun: 460_000_000_000,
        lifetimeEarned: 500_000_000_000,
        legacyPoints: 0
      }
    })
    const state = parseSavedState(v2ZeroLegacy)
    expect(state.lifetimeEarned).toBe(500_000_000_000)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(1)
  })

  it('rescales >0-Legacy v2 saves from £3T curve to £500B curve preserving bracket % with zero free Legacy', () => {
    const oldBase = 3.0e12
    const floor34 = oldBase * 34 * 34
    const next35 = oldBase * 35 * 35
    const halfway = floor34 + 0.5 * (next35 - floor34)

    const v2WithLegacy = JSON.stringify({
      schemaVersion: 2,
      scene: {
        ...createInitialSceneState(),
        money: 1_000_000,
        spentThisRun: 2_000_000,
        lifetimeEarned: halfway,
        legacyPoints: 34,
        legacySpent: 10
      }
    })
    const state = parseSavedState(v2WithLegacy)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(0)
    const bracket = computeLegacyBracket(state.lifetimeEarned, state.legacyPoints)
    expect(bracket.progress).toBeCloseTo(0.5, 5)
  })

  it('round-trips v3 state including compactAutoBuy without double-scaling and recovers from corrupt JSON', () => {
    const migrated = parseSavedState(REAL_V1_SAVE)
    migrated.bulkBuyMode = 'next'
    migrated.muted = true
    migrated.compactAutoBuy = true
    const encoded = serializeState(migrated)
    expect(JSON.parse(encoded).schemaVersion).toBe(3)

    const reloaded = parseSavedState(encoded)
    expect(reloaded.bulkBuyMode).toBe('next')
    expect(reloaded.muted).toBe(true)
    expect(reloaded.compactAutoBuy).toBe(true)
    expect(reloaded.perks.autoClicker).toBe(17)
    expect(reloaded.lifetimeEarned).toBe(migrated.lifetimeEarned)

    const fallback = parseSavedState('{not-valid-json')
    expect(fallback.money).toBe(0)
    expect(fallback.legacyPoints).toBe(0)
  })
})
