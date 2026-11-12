import { describe, expect, it } from 'vitest'
import { computeLegacyBracket, computeLegacyGain, legacyLifetimeThreshold } from '../src/engine/economy'
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

describe('v1-v5 -> v6 save migration', () => {
  it('migrates real 34-Legacy v1 Vuex save seamlessly without point loss or free points', () => {
    const state = parseSavedState(REAL_V1_SAVE)
    expect(state.legacyPoints).toBe(34)
    expect(state.legacySpent).toBe(34)
    expect(state.perks.autoClicker).toBe(17)
    expect(state.perks.hustleCap).toBe(0)
    expect(state.compactAutoBuy).toBe(false)
    expect(state.lifetimeEarned).toBe(legacyLifetimeThreshold(34))
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(0)
    expect(state.spentThisRun).toBeGreaterThan(2_000_000_000)
    expect(state.seenItems.jobs['15']).toBe(true)
    expect(state.seenItems.businesses['9']).toBe(true)
    expect(state.seenItems.businesses['19']).toBeFalsy()
  })

  it('keeps the pending +1 for a 1-Legacy v3 £1.44T save and migrates old trustFund ranks into hustleCap', () => {
    const v3OneLegacy = JSON.stringify({
      schemaVersion: 3,
      scene: {
        ...createInitialSceneState(),
        money: 8_023_025_787,
        spentThisRun: 247_845_175_636,
        lifetimeEarned: 1_440_000_000_000,
        legacyPoints: 1,
        legacySpent: 1,
        perks: {
          autoClicker: 0,
          trustFund: 1,
          offshore: 0,
          nepotism: 0,
          deregulation: 0,
          insider: 0
        }
      }
    })
    const state = parseSavedState(v3OneLegacy)
    expect(state.perks.hustleCap).toBe(1)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(1)
    // £1.44T was 1/15 of the way from P=2 (£1.35T) to P=3 (£2.7T) on the Triangular curve
    expect(computeLegacyBracket(state.lifetimeEarned, state.legacyPoints).progress).toBeCloseTo(1 / 15, 5)
  })

  it('remaps v5 Cubic saves onto the geometric curve keeping earned points and bracket %', () => {
    const lifetime = 4.5e11 * (64 + 0.25 * (125 - 64))
    const v5 = JSON.stringify({
      schemaVersion: 5,
      scene: { ...createInitialSceneState(), lifetimeEarned: lifetime, legacyPoints: 3, legacySpent: 1 }
    })
    const state = parseSavedState(v5)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(1)
    expect(computeLegacyBracket(state.lifetimeEarned, state.legacyPoints).progress).toBeCloseTo(0.25, 5)
  })

  it('remaps v4 Triangular saves onto the geometric curve keeping earned points and bracket %', () => {
    const triangular = (p: number) => 4.5e11 * ((p * (p + 1)) / 2)
    const lifetime = triangular(7) + 0.4 * (triangular(8) - triangular(7))
    const v4 = JSON.stringify({
      schemaVersion: 4,
      scene: {
        ...createInitialSceneState(),
        lifetimeEarned: lifetime,
        legacyPoints: 5,
        legacySpent: 2
      }
    })
    const state = parseSavedState(v4)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(2)
    expect(computeLegacyBracket(state.lifetimeEarned, state.legacyPoints).progress).toBeCloseTo(0.4, 5)
  })

  it('remaps >1-Legacy v2/v3 saves onto the Triangular curve preserving bracket % with zero free Legacy', () => {
    const oldV3Base = 5.0e11
    const floor34 = oldV3Base * 34 * 34
    const next35 = oldV3Base * 35 * 35
    const halfway = floor34 + 0.5 * (next35 - floor34)

    const v3WithLegacy = JSON.stringify({
      schemaVersion: 3,
      scene: {
        ...createInitialSceneState(),
        money: 1_000_000,
        spentThisRun: 2_000_000,
        lifetimeEarned: halfway,
        legacyPoints: 34,
        legacySpent: 10
      }
    })
    const state = parseSavedState(v3WithLegacy)
    expect(computeLegacyGain(state.lifetimeEarned, state.legacyPoints)).toBe(0)
    const bracket = computeLegacyBracket(state.lifetimeEarned, state.legacyPoints)
    expect(bracket.progress).toBeCloseTo(0.5, 5)
  })

  it('round-trips v4 state including compactAutoBuy without double-scaling and recovers from corrupt JSON', () => {
    const migrated = parseSavedState(REAL_V1_SAVE)
    migrated.bulkBuyMode = 'next'
    migrated.muted = true
    migrated.compactAutoBuy = true
    const encoded = serializeState(migrated)
    expect(JSON.parse(encoded).schemaVersion).toBe(6)

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
