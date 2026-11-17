export type IncomeSource = 'passive' | 'manual' | 'windfall'
// Pins on the cashflow chart, in words
export type TelemetryMarker = 'Milestone' | 'Class' | 'Opportunity'

export interface IncomeEntry {
  ts: number
  amount: number
  source: IncomeSource
}

export interface CashflowSample {
  ts: number
  realisedPerSec: number
  passivePerSec: number
  // What favours bring in a second
  favourPerSec?: number
  // Where the second's realised money came from, by income source id
  // (economy.ts computeIncomeSources, plus 'manual' and 'windfall')
  mix?: Record<string, number>
  marker?: TelemetryMarker
}

export interface OhlcCandle {
  bucketStart: number
  open: number
  high: number
  low: number
  close: number
  // What the buyers bought in this candle, in words, for its marker
  buys?: string[]
}

export interface TelemetryState {
  ledger: IncomeEntry[]
  samples: CashflowSample[]
  candles: OhlcCandle[]
  lastSampleTs: number
  pendingMarker: TelemetryMarker | null
}

const WINDOW_MS = 1000
const CANDLE_BUCKET_MS = 2000
export const MAX_SAMPLES = 240
export const MAX_CANDLES = 40

function bucketFor(ts: number): number {
  return Math.floor(ts / CANDLE_BUCKET_MS) * CANDLE_BUCKET_MS
}

export function createTelemetryState(nowMs: number, initialCash: number): TelemetryState {
  const b = bucketFor(nowMs)
  return {
    ledger: [],
    samples: [{ ts: nowMs, realisedPerSec: 0, passivePerSec: 0 }],
    candles: [{ bucketStart: b, open: initialCash, high: initialCash, low: initialCash, close: initialCash }],
    lastSampleTs: nowMs,
    pendingMarker: null
  }
}

export function resetTelemetry(state: TelemetryState, nowMs: number, initialCash: number): void {
  const b = bucketFor(nowMs)
  state.ledger = []
  state.samples = [{ ts: nowMs, realisedPerSec: 0, passivePerSec: 0 }]
  state.candles = [{ bucketStart: b, open: initialCash, high: initialCash, low: initialCash, close: initialCash }]
  state.lastSampleTs = nowMs
  state.pendingMarker = null
}

export function pruneLedger(state: TelemetryState, nowMs: number): void {
  const cutoff = nowMs - WINDOW_MS
  let dropCount = 0
  while (dropCount < state.ledger.length && state.ledger[dropCount].ts <= cutoff) {
    dropCount += 1
  }
  if (dropCount > 0) {
    state.ledger.splice(0, dropCount)
  }
}

export function recordIncome(state: TelemetryState, ts: number, amount: number, source: IncomeSource): void {
  if (amount <= 0 || !Number.isFinite(amount)) {
    return
  }
  state.ledger.push({ ts, amount, source })
  pruneLedger(state, ts)
}

export function currentRealisedPerSec(state: TelemetryState, nowMs: number): number {
  pruneLedger(state, nowMs)
  let sum = 0
  for (const entry of state.ledger) {
    sum += entry.amount
  }
  return sum
}

export function currentManualPerSec(state: TelemetryState, nowMs: number): number {
  pruneLedger(state, nowMs)
  let sum = 0
  for (const entry of state.ledger) {
    if (entry.source === 'manual') {
      sum += entry.amount
    }
  }
  return sum
}

// The last second's realised money, split by where it came from: taps and
// windfalls as the ledger has them, and steady income shared out among its
// sources in proportion to what each earns a second now
export function realisedMix(state: TelemetryState, nowMs: number, passiveSources: Readonly<Record<string, number>>): Record<string, number> {
  pruneLedger(state, nowMs)
  const sums: Record<IncomeSource, number> = { passive: 0, manual: 0, windfall: 0 }
  for (const entry of state.ledger) sums[entry.source] += entry.amount
  const mix: Record<string, number> = {}
  const theoretical = Object.values(passiveSources).reduce((a, v) => a + v, 0)
  if (sums.passive > 0) {
    if (theoretical > 0) {
      const scale = sums.passive / theoretical
      for (const [id, v] of Object.entries(passiveSources)) if (v > 0) mix[id] = v * scale
    } else {
      mix.other = sums.passive
    }
  }
  if (sums.manual > 0) mix.manual = sums.manual
  if (sums.windfall > 0) mix.windfall = sums.windfall
  return mix
}

export function observeBalance(state: TelemetryState, ts: number, cash: number): void {
  const safeCash = Number.isFinite(cash) ? Math.max(0, cash) : 0
  const b = bucketFor(ts)
  const last = state.candles[state.candles.length - 1]

  if (!last || b > last.bucketStart) {
    const open = last ? last.close : safeCash
    state.candles.push({
      bucketStart: b,
      open,
      high: Math.max(open, safeCash),
      low: Math.min(open, safeCash),
      close: safeCash
    })
    if (state.candles.length > MAX_CANDLES) {
      state.candles.splice(0, state.candles.length - MAX_CANDLES)
    }
    return
  }

  if (safeCash > last.high) last.high = safeCash
  if (safeCash < last.low) last.low = safeCash
  last.close = safeCash
}

// A buyer's purchase lands on the current candle
export function noteCandlePurchase(state: TelemetryState, text: string): void {
  const candle = state.candles[state.candles.length - 1]
  if (!candle) return
  candle.buys = [...(candle.buys ?? []), text].slice(-6)
}

export function markTelemetryEvent(state: TelemetryState, marker: TelemetryMarker): void {
  // An opportunity outranks a milestone landing in the same sample
  if (state.pendingMarker !== 'Opportunity') {
    state.pendingMarker = marker
  }
}

export function sampleTelemetry(
  state: TelemetryState,
  ts: number,
  passivePerSec: number,
  cash: number,
  explicitMarker?: TelemetryMarker,
  favourPerSec = 0,
  passiveSources?: Readonly<Record<string, number>>
): CashflowSample {
  observeBalance(state, ts, cash)
  const realisedPerSec = currentRealisedPerSec(state, ts)
  const marker = explicitMarker ?? state.pendingMarker ?? undefined
  state.pendingMarker = null
  state.lastSampleTs = ts

  const sample: CashflowSample = { ts, realisedPerSec, passivePerSec }
  if (marker) sample.marker = marker
  if (favourPerSec > 0) sample.favourPerSec = favourPerSec
  if (passiveSources) sample.mix = realisedMix(state, ts, passiveSources)

  state.samples.push(sample)
  if (state.samples.length > MAX_SAMPLES) {
    state.samples.splice(0, state.samples.length - MAX_SAMPLES)
  }
  return sample
}
