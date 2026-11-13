// Store side of the play log: stamps each entry with the time, generation
// and active time, and samples boss fights while they run.
import { markRaw, shallowRef, type ShallowRef } from 'vue'
import { countTap, createPlayLog, logEvent, noteNetWorth, savePlayLog, touchSession, type PlayLog } from '../../engine/playLog'
import type { AttemptEnded } from './bosses'

// Seconds between samples during a boss fight
export const BOSS_SAMPLE_SEC = 5
// How often the log is written to storage while playing
export const PLAY_LOG_SAVE_MS = 30_000

interface PlayLogDeps {
  generation: () => number
  activeMs: () => number
  netWorth: () => number
  // The open gate's number, or null while it is still locked
  openGate: () => number | null
  attempt: () => { gate: number; startedActiveMs: number; progress: number } | null
  hustle: () => number
}

type Fields = Record<string, string | number | boolean>

export function createPlayLogModule(initial: PlayLog, deps: PlayLogDeps) {
  // Nothing on screen reads the log, so it stays out of Vue's reactivity:
  // tracking thousands of rows each tick is slow and holds memory
  const playLog: ShallowRef<PlayLog> = shallowRef(markRaw(initial))
  let lastOpenGate = 0
  let nextSampleSec = BOSS_SAMPLE_SEC
  let tapsSinceSample = 0
  let lastWrittenMs = 0

  function flush(ts: number): void {
    lastWrittenMs = ts
    savePlayLog(playLog.value)
  }

  // A hard reset starts the log over
  function clear(ts: number): void {
    playLog.value = markRaw(createPlayLog())
    flush(ts)
  }

  function log(ts: number, e: string, fields: Fields = {}): void {
    logEvent(playLog.value, { t: ts, g: deps.generation(), a: Math.round(deps.activeMs()), e, ...fields })
  }

  function onTap(fullHustle: boolean): void {
    countTap(playLog.value, deps.generation(), deps.activeMs(), fullHustle)
    tapsSinceSample += 1
  }

  function onTick(ts: number): void {
    touchSession(playLog.value, ts)
    if (ts - lastWrittenMs >= PLAY_LOG_SAVE_MS) flush(ts)
    noteNetWorth(playLog.value, deps.generation(), deps.activeMs(), deps.netWorth())
    const open = deps.openGate()
    if (open !== null && open > lastOpenGate) {
      lastOpenGate = open
      log(ts, 'gate-open', { gate: open })
    }
    const attempt = deps.attempt()
    if (attempt) {
      const sec = (deps.activeMs() - attempt.startedActiveMs) / 1000
      if (sec >= nextSampleSec) {
        log(ts, 'boss-sample', {
          gate: attempt.gate,
          sec: Math.round(sec),
          progress: Number(attempt.progress.toFixed(4)),
          hustle: Number(deps.hustle().toFixed(2)),
          taps: tapsSinceSample
        })
        nextSampleSec += BOSS_SAMPLE_SEC
        tapsSinceSample = 0
      }
    }
  }

  function onBossStart(ts: number, gate: number, fields: Fields): void {
    nextSampleSec = BOSS_SAMPLE_SEC
    tapsSinceSample = 0
    log(ts, 'boss-start', { gate, ...fields })
  }

  function onAttemptEnded(ts: number, ended: AttemptEnded): void {
    log(ts, 'boss-end', { gate: ended.gate, result: ended.result, ms: Math.round(ended.ms), progress: Number(ended.progress.toFixed(4)) })
  }

  // A new generation, a reload or a reset: gates are counted afresh
  function resetGateWatch(gatesBeaten: number): void {
    lastOpenGate = gatesBeaten
  }

  return { playLog, log, onTap, onTick, onBossStart, onAttemptEnded, resetGateWatch, flush, clear }
}
