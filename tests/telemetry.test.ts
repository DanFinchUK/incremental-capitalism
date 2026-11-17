import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BASE_CLICK_VALUE, computeSectorSlices, sourceColour, sourceOrder } from '../src/engine/economy'
import { createTelemetryState, observeBalance, realisedMix, recordIncome, resetTelemetry, sampleTelemetry } from '../src/engine/telemetry'
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

  it('splits each second of the cashflow chart by where the money came from', () => {
    const tel = createTelemetryState(1000, 0)
    recordIncome(tel, 1100, 300, 'passive')
    recordIncome(tel, 1200, 40, 'manual')
    recordIncome(tel, 1300, 500, 'windfall')
    // Steady income is shared out in proportion to what each source earns now
    const mix = realisedMix(tel, 1500, { 'biz-1': 20, interns: 10 })
    expect(mix['biz-1']).toBeCloseTo(200)
    expect(mix.interns).toBeCloseTo(100)
    expect(mix.manual).toBe(40)
    expect(mix.windfall).toBe(500)
    // And each sample carries it, adding up to the second's realised money
    const sample = sampleTelemetry(tel, 1500, 30, 0, undefined, 0, { 'biz-1': 20, interns: 10 })
    const sum = Object.values(sample.mix!).reduce((a, v) => a + v, 0)
    expect(sum).toBeCloseTo(sample.realisedPerSec)
  })

  it('gives each source one colour wherever it is drawn, whatever its rank', () => {
    const base = {
      jobsPurchased: {},
      legacyPoints: 0,
      classLevel: 0,
      deregulationRank: 0,
      autoClickers: 0,
      businessBuffMultiplier: 1,
      clickBuffMultiplier: 1,
      hustleMultiplier: 1
    }
    // Two businesses swap places in the mix; each keeps its colour
    const a = computeSectorSlices({ ...base, businessesOwned: { '1': 5000, '2': 1 } }, 0)
    const b = computeSectorSlices({ ...base, businessesOwned: { '1': 1, '2': 100 } }, 0)
    const colourOf = (slices: typeof a, id: string) => slices.find((s) => s.id === id)!.color
    expect(a[0].id).not.toBe(b[0].id)
    expect(colourOf(a, 'biz-1')).toBe(colourOf(b, 'biz-1'))
    expect(colourOf(a, 'biz-2')).toBe(colourOf(b, 'biz-2'))
    // Neighbouring rungs never share one, and the staff and the help never look like a business
    expect(sourceColour('biz-1')).not.toBe(sourceColour('biz-2'))
    expect(sourceColour('interns')).not.toBe(sourceColour('biz-1'))
    // Taps sit on top of every stack, businesses at the bottom
    expect(sourceOrder('manual')).toBeGreaterThan(sourceOrder('favours'))
    expect(sourceOrder('biz-9')).toBeLessThan(sourceOrder('interns'))
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
      expect(store.manualRealisedPerSecond).toBeGreaterThan(2 * BASE_CLICK_VALUE)
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
