import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FIRST_LEGACY_LIFETIME, computeLegacyBracket, computeSectorSlices } from '../src/engine/economy'
import { createTelemetryState, observeBalance, recordIncome, resetTelemetry, sampleTelemetry } from '../src/engine/telemetry'
import { useGameStore } from '../src/stores/game'

describe('telemetry engine & sector breakdown', () => {
  it('peaks during rapid clicks in 1s rolling window and tapers off after stopping', () => {
    const tel = createTelemetryState(1000, 0)
    // Click 5 times x £100 within 1000ms..1800ms
    recordIncome(tel, 1100, 100, 'manual')
    recordIncome(tel, 1300, 100, 'manual')
    recordIncome(tel, 1500, 100, 'manual')
    recordIncome(tel, 1700, 100, 'manual')
    recordIncome(tel, 1900, 100, 'manual')

    sampleTelemetry(tel, 1950, 50, 500)
    const peak = tel.samples[tel.samples.length - 1]
    expect(peak.realisedPerSec).toBe(500)
    expect(peak.passivePerSec).toBe(50)

    // 600ms later (at 2500ms): clicks at 1100, 1300, 1500 aged out; 1700 & 1900 remain -> £200/s taper!
    sampleTelemetry(tel, 2500, 50, 500)
    const midTaper = tel.samples[tel.samples.length - 1]
    expect(midTaper.realisedPerSec).toBe(200)

    // At 3100ms (>1s after last click), manual bursts have fully tapered to £0
    sampleTelemetry(tel, 3100, 50, 500)
    expect(tel.samples[tel.samples.length - 1].realisedPerSec).toBe(0)
  })

  it('builds 2s green and red OHLC candles with intra-bucket highs and lows and caps buffer sizes', () => {
    const tel = createTelemetryState(0, 1000)
    // Bucket [0..2000): rises to 1800, then buys an item dropping to 600 -> red candle (open 1000, high 1800, low 600, close 600)
    observeBalance(tel, 800, 1800)
    observeBalance(tel, 1500, 600)

    // Bucket [2000..4000): recovers from 600 to 1400 -> green candle
    observeBalance(tel, 2500, 1400)

    expect(tel.candles).toHaveLength(2)
    expect(tel.candles[0]).toMatchObject({ open: 1000, high: 1800, low: 600, close: 600 })
    expect(tel.candles[1]).toMatchObject({ open: 600, high: 1400, low: 600, close: 1400 })

    // Ring buffer caps at 40 candles and 240 samples
    for (let i = 3; i <= 60; i++) {
      observeBalance(tel, i * 2000 + 100, i * 100)
    }
    expect(tel.candles.length).toBeLessThanOrEqual(40)

    for (let i = 1; i <= 300; i++) {
      sampleTelemetry(tel, 200_000 + i * 250, 10, 1000)
    }
    expect(tel.samples.length).toBeLessThanOrEqual(240)

    resetTelemetry(tel, 500_000, 25_000)
    expect(tel.samples).toHaveLength(1)
    expect(tel.candles).toHaveLength(1)
    expect(tel.candles[0].open).toBe(25_000)
  })

  it('computes sorted sector revenue mix across businesses, interns, and manual hustle', () => {
    const slices = computeSectorSlices(
      {
        jobsPurchased: { '1': 10 },
        businessesOwned: { '1': 2, '2': 1 },
        legacyPoints: 0,
        classLevel: 0,
        deregulationRank: 0,
        autoClickers: 2,
        businessBuffMultiplier: 1,
        clickBuffMultiplier: 1,
        hustleMultiplier: 1
      },
      3000
    )
    const labels = slices.map((s) => s.label)
    expect(labels).toContain('Freelance website design')
    expect(labels).toContain('Etsy store')
    expect(labels).toContain('Unpaid Interns')
    expect(labels).toContain('Manual Hustle')
    const pctSum = slices.reduce((acc, s) => acc + s.pct, 0)
    expect(pctSum).toBeCloseTo(100, 2)

    const bracketHalf = computeLegacyBracket(FIRST_LEGACY_LIFETIME * 0.5, 0)
    expect(bracketHalf.pendingGain).toBe(0)
    expect(bracketHalf.progress).toBeCloseTo(0.5, 4)

    const bracketNext = computeLegacyBracket(FIRST_LEGACY_LIFETIME * 2.5, 0)
    // pendingGain = 1 (floor 1*B, next 4*B, span 3*B -> (2.5 - 1)/3 = 0.5)
    expect(bracketNext.pendingGain).toBe(1)
    expect(bracketNext.progress).toBeCloseTo(0.5, 4)
  })

  describe('store telemetry integration', () => {
    beforeEach(() => {
      localStorage.clear()
      setActivePinia(createPinia())
    })

    it('records clicks, purchases, and collapse state cleanly in useGameStore', () => {
      const store = useGameStore()
      store.hydrateFromStorage(1000)
      store.manualClick(1100)
      store.manualClick(1200)
      store.tick(1300)
      expect(store.manualRealisedPerSecond).toBeGreaterThan(60)
      expect(store.telemetry.candles.length).toBeGreaterThanOrEqual(1)

      store.toggleTradingDesk()
      expect(store.tradingDeskCollapsed).toBe(true)

      setActivePinia(createPinia())
      const reloaded = useGameStore()
      reloaded.hydrateFromStorage(2000)
      expect(reloaded.tradingDeskCollapsed).toBe(true)
    })
  })
})
