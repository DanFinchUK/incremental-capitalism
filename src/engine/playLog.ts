// A record of how the game is actually played, for balancing. It lives in
// localStorage under its own key (so the frequent game saves stay small)
// and is merged into the save JSON when the save is copied. It never leaves
// the browser. Every list is capped.

export const PLAY_LOG_KEY = 'playLog'
export const MAX_LOG_EVENTS = 2500
export const MAX_LOG_MINUTES = 3000
export const MAX_LOG_SESSIONS = 500
// A gap longer than this between ticks starts a new session
export const SESSION_GAP_MS = 5 * 60_000

// One logged moment. t: wall-clock ms. g: generation. a: active ms into the
// generation. e: what happened. Any other fields describe it.
export interface PlayEvent {
  t: number
  g: number
  a: number
  e: string
  [field: string]: string | number | boolean
}

// [generation, active minute, taps, taps at full Hustle, net worth at the latest tick]
export type MinuteRow = [number, number, number, number, number]

export interface PlayLog {
  // [start, last seen], wall-clock ms
  sessions: Array<[number, number]>
  minutes: MinuteRow[]
  events: PlayEvent[]
}

export function createPlayLog(): PlayLog {
  return { sessions: [], minutes: [], events: [] }
}

function capped<T>(list: T[], max: number): void {
  if (list.length > max) list.splice(0, list.length - max)
}

export function logEvent(log: PlayLog, event: PlayEvent): void {
  log.events.push(event)
  capped(log.events, MAX_LOG_EVENTS)
}

// The row for this generation's current active minute, created if needed
function minuteRow(log: PlayLog, generation: number, activeMs: number): MinuteRow {
  const minute = Math.floor(activeMs / 60_000)
  const last = log.minutes[log.minutes.length - 1]
  if (last && last[0] === generation && last[1] === minute) {
    return last
  }
  const row: MinuteRow = [generation, minute, 0, 0, 0]
  log.minutes.push(row)
  capped(log.minutes, MAX_LOG_MINUTES)
  return row
}

export function countTap(log: PlayLog, generation: number, activeMs: number, fullHustle: boolean): void {
  const row = minuteRow(log, generation, activeMs)
  row[2] += 1
  if (fullHustle) row[3] += 1
}

export function noteNetWorth(log: PlayLog, generation: number, activeMs: number, netWorth: number): void {
  minuteRow(log, generation, activeMs)[4] = netWorth
}

export function touchSession(log: PlayLog, ts: number): void {
  const last = log.sessions[log.sessions.length - 1]
  // Phones resync their clocks now and then, so the wall clock can step back
  // a little mid-session. Only a long gap either way starts a new session.
  if (last && Math.abs(ts - last[1]) <= SESSION_GAP_MS) {
    last[1] = Math.max(last[1], ts)
    return
  }
  log.sessions.push([ts, ts])
  capped(log.sessions, MAX_LOG_SESSIONS)
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

function readEvent(raw: unknown): PlayEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isNum(r.t) || !isNum(r.g) || !isNum(r.a) || typeof r.e !== 'string') return null
  const out: PlayEvent = { t: r.t, g: r.g, a: r.a, e: r.e }
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'string' || typeof v === 'boolean' || isNum(v)) out[k] = v
  }
  return out
}

// Read a saved log, keeping only well-formed rows
export function readPlayLog(raw: unknown): PlayLog {
  const log = createPlayLog()
  if (!raw || typeof raw !== 'object') return log
  const r = raw as Record<string, unknown>
  if (Array.isArray(r.sessions)) {
    for (const s of r.sessions) {
      if (Array.isArray(s) && s.length === 2 && isNum(s[0]) && isNum(s[1])) log.sessions.push([s[0], s[1]])
    }
  }
  if (Array.isArray(r.minutes)) {
    for (const m of r.minutes) {
      if (Array.isArray(m) && m.length === 5 && m.every(isNum)) log.minutes.push(m as MinuteRow)
    }
  }
  if (Array.isArray(r.events)) {
    for (const e of r.events) {
      const ev = readEvent(e)
      if (ev) log.events.push(ev)
    }
  }
  capped(log.sessions, MAX_LOG_SESSIONS)
  capped(log.minutes, MAX_LOG_MINUTES)
  capped(log.events, MAX_LOG_EVENTS)
  return log
}

export function loadPlayLog(): PlayLog {
  try {
    const raw = localStorage.getItem(PLAY_LOG_KEY)
    return raw ? readPlayLog(JSON.parse(raw)) : createPlayLog()
  } catch {
    return createPlayLog()
  }
}

export function savePlayLog(log: PlayLog): void {
  try {
    localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(log))
  } catch {
    // Ignore storage quota or private-browsing write errors
  }
}

// The save JSON with the play log folded into its scene, for export
export function withPlayLog(saveJson: string, log: PlayLog): string {
  try {
    const save = JSON.parse(saveJson)
    if (save && typeof save === 'object' && save.scene && typeof save.scene === 'object') {
      save.scene.playLog = log
      return JSON.stringify(save)
    }
  } catch {
    // Fall through and export the save as it is
  }
  return saveJson
}
