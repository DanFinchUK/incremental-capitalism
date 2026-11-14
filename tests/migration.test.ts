import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, createInitialSceneState, parseSavedState, serializeState } from '../src/engine/migration'

describe('schema 8 saves', () => {
  it('converts a schema 7 save: Legacy becomes the bloodline\'s deepest gate and perks are refunded', () => {
    const tree = [1, 3, 2].map((deepestGate, i) => ({
      generation: i + 1,
      name: `Heir ${i}`,
      traitId: null,
      deepestGate,
      legacyEarned: 7,
      activeMs: 60_000,
      advisors: [],
      splits: []
    }))
    const raw = JSON.stringify({
      schemaVersion: 7,
      scene: { ...createInitialSceneState(), money: 999, legacyPoints: 40, legacySpent: 9, perks: { hustleCap: 3 }, familyTree: tree, introSeen: true }
    })
    const back = parseSavedState(raw)
    expect(back.money).toBe(999)
    expect(back.legacyPoints).toBe(3)
    expect(back.legacySpent).toBe(0)
    expect(back.perks.hustleCap).toBe(0)
    expect(back.familyTree).toHaveLength(3)
  })

  it('resets any pre-7 save to a new game', () => {
    for (const v of [1, 2, 3, 4, 5, 6]) {
      const raw = JSON.stringify({
        schemaVersion: v,
        scene: { ...createInitialSceneState(), money: 999, legacyPoints: 12, introSeen: true }
      })
      expect(parseSavedState(raw)).toEqual(createInitialSceneState())
    }
    // A v1 save had no schemaVersion at all
    expect(parseSavedState(JSON.stringify({ scene: { money: 5 } }))).toEqual(createInitialSceneState())
  })

  it('writes schema 8 and round-trips', () => {
    expect(SCHEMA_VERSION).toBe(8)
    const s = { ...createInitialSceneState(), money: 123, legacyPoints: 2, introSeen: true, compactAutoBuy: true, bulkBuyMode: 'next' as const }
    const encoded = serializeState(s)
    expect(JSON.parse(encoded).schemaVersion).toBe(8)
    const back = parseSavedState(encoded)
    expect(back.money).toBe(123)
    expect(back.legacyPoints).toBe(2)
    expect(back.introSeen).toBe(true)
    expect(back.compactAutoBuy).toBe(true)
    expect(back.bulkBuyMode).toBe('next')
  })

  it('recomputes Legacy spent from owned perk ranks', () => {
    const raw = serializeState({
      ...createInitialSceneState(),
      legacyPoints: 10,
      legacySpent: 9,
      perks: { autoClicker: 2, hustleCap: 1, offshore: 0, nepotism: 0, deregulation: 0, insider: 0, officeSeats: 0 }
    })
    // Interns 0 + 1, Grindset 1
    expect(parseSavedState(raw).legacySpent).toBe(2)
  })

  it('recovers from corrupt JSON', () => {
    expect(parseSavedState('{nope')).toEqual(createInitialSceneState())
    expect(parseSavedState(null)).toEqual(createInitialSceneState())
  })
})
