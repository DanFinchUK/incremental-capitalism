import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDuration } from '../src/utils/format'

describe('formatCurrency', () => {
  it('shows pennies below £1M', () => {
    expect(formatCurrency(0)).toBe('£0.00')
    expect(formatCurrency(4999)).toBe('£4,999.00')
    expect(formatCurrency(123456.789)).toBe('£123,456.79')
  })

  it('shows whole pounds with commas from £1M up to £1T', () => {
    expect(formatCurrency(1_000_000)).toBe('£1,000,000')
    expect(formatCurrency(12_500_000.95)).toBe('£12,500,000')
    expect(formatCurrency(250_000_000_000)).toBe('£250,000,000,000')
  })

  it('uses compact suffixes from £1T upwards', () => {
    expect(formatCurrency(3e12)).toBe('£3.00T')
    expect(formatCurrency(15.2e15)).toBe('£15.20Qa')
    expect(formatCurrency(4.5e18)).toBe('£4.50Qi')
    expect(formatCurrency(2e37)).toBe('£20.00Ud')
    expect(formatCurrency(3.4e53)).toBe('£340.00Sxd')
    expect(formatCurrency(1e63)).toBe('£1.00Vg')
  })

  it('falls back to an exponent past the last suffix', () => {
    expect(formatCurrency(1.5e70)).toBe('£1.50e+70')
  })

  it('handles non-finite values safely', () => {
    expect(formatCurrency(Number.NaN)).toBe('£0.00')
  })
})

describe('formatDuration', () => {
  it('formats seconds, minutes, and hours cleanly', () => {
    expect(formatDuration(15)).toBe('15s')
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(125)).toBe('2m 5s')
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(11_520)).toBe('3h 12m')
  })
})
