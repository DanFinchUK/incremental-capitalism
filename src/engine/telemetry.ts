export type IncomeSource = 'passive' | 'manual' | 'windfall'
export type TelemetryMarker = 'M' | '★'

export interface IncomeEntry {
  ts: number
  amount: number
  source: IncomeSource
}

export interface CashflowSample {
  ts: number
  realisedPerSec: number
  passivePerSec: number
  marker?: TelemetryMarker
}

export interface OhlcCandle {
  bucketStart: number
  open: number
  high: number
  low: number
  close: number
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

export function markTelemetryEvent(state: TelemetryState, marker: TelemetryMarker): void {
  if (state.pendingMarker !== '★') {
    state.pendingMarker = marker
  }
}

export function sampleTelemetry(
  state: TelemetryState,
  ts: number,
  passivePerSec: number,
  cash: number,
  explicitMarker?: TelemetryMarker
): CashflowSample {
  observeBalance(state, ts, cash)
  const realisedPerSec = currentRealisedPerSec(state, ts)
  const marker = explicitMarker ?? state.pendingMarker ?? undefined
  state.pendingMarker = null
  state.lastSampleTs = ts

  const sample: CashflowSample = marker
    ? { ts, realisedPerSec, passivePerSec, marker }
    : { ts, realisedPerSec, passivePerSec }

  state.samples.push(sample)
  if (state.samples.length > MAX_SAMPLES) {
    state.samples.splice(0, state.samples.length - MAX_SAMPLES)
  }
  return sample
}
