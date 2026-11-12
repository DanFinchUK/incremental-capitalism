const COMPACT_TIERS: ReadonlyArray<{ threshold: number; suffix: string }> = [
  { threshold: 1e33, suffix: 'Dc' },
  { threshold: 1e30, suffix: 'No' },
  { threshold: 1e27, suffix: 'Oc' },
  { threshold: 1e24, suffix: 'Sp' },
  { threshold: 1e21, suffix: 'Sx' },
  { threshold: 1e18, suffix: 'Qi' },
  { threshold: 1e15, suffix: 'Qa' },
  { threshold: 1e12, suffix: 'T' }
]

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return '£0.00'
  }
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  if (abs >= 1e36) {
    return `${sign}£${abs.toExponential(2)}`
  }
  for (const tier of COMPACT_TIERS) {
    if (abs >= tier.threshold) {
      return `${sign}£${(abs / tier.threshold).toFixed(2)}${tier.suffix}`
    }
  }
  if (abs >= 1_000_000) {
    return `${sign}£${Math.floor(abs).toLocaleString('en-GB')}`
  }
  return `${sign}£${abs.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export function formatDuration(seconds: number): string {
  const s = Math.max(1, Math.floor(seconds))
  if (s < 60) {
    return `${s}s`
  }
  if (s < 3600) {
    const mins = Math.floor(s / 60)
    const remSec = s % 60
    return remSec === 0 ? `${mins}m` : `${mins}m ${remSec}s`
  }
  const hours = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}
