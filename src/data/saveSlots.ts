// Save slots ("seats"): up to five families on the go, at most one in
// residence (played) at a time, and quite possibly none. A family takes a
// seat when it is written into the register, and gives it up when it is
// abandoned or its finished dynasty goes into the Hall. Each seat keeps its
// own game and play log under its own keys, so saving writes only the family
// in residence; a small index lists them, with a summary for the menu. The
// Hall, achievements and settings are shared (engine/profile.ts).
//
// The seat 'main' uses the game's original keys and 'trial' the keys the
// ladder trial used, so saves from before seats carry on where they were.
declare const process: { env: Record<string, string | undefined> } | undefined

export const SAVES_KEY = 'saves'
export const MAX_SAVES = 5
const INDEX_VERSION = 2

// How the game is tuned for a family, fixed when it begins. A playtest option
// for now (the trial ladder); difficulty settings later.
export type Tuning = 'classic' | 'trial'
export const TUNINGS: ReadonlyArray<Tuning> = ['classic', 'trial']

export interface SaveSummary {
  surname: string
  // Not yet written into the register
  fresh: boolean
  generation: number
  titles: number
  scenario: string
  dynastyMs: number
  dynastyComplete: boolean
}

export interface SaveSlot {
  id: string
  tuning: Tuning
  createdAt: number
  lastPlayed: number
  summary: SaveSummary | null
  // All play, across every family, when this one was last saved: what has
  // been played since elsewhere doesn't count as this family's time away
  playedAt?: number
}

// What the next family will be, when none is in residence: chosen on the way
// to the register, and kept across the reload a different tuning needs
export interface NextFamily {
  tuning: Tuning
  scenario: string
}

export interface SaveIndex {
  version?: number
  active: string | null
  slots: SaveSlot[]
  next?: NextFamily | null
}

export function slotPrefix(id: string): string {
  return id === 'main' ? '' : `${id}:`
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function readTuning(raw: unknown): Tuning {
  return raw === 'trial' ? 'trial' : 'classic'
}

// Whether a seat's save shows any play at all, read lightly
function played(raw: string | null): boolean {
  if (!raw) return false
  try {
    const s = (JSON.parse(raw) as { scene?: Record<string, unknown> }).scene ?? {}
    return (
      Number(s.lifetimeEarned) > 0 ||
      Number(s.generation) > 1 ||
      Number(s.titles) > 0 ||
      Number(s.dynastyMs) >= 1000 ||
      (Array.isArray(s.familyTree) && s.familyTree.length > 0)
    )
  } catch {
    return false
  }
}

function parseIndex(raw: string | null): SaveIndex | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<SaveIndex>
    if (!v || !Array.isArray(v.slots)) return null
    const slots: SaveSlot[] = v.slots
      .filter((s): s is SaveSlot => !!s && typeof s.id === 'string' && /^[a-z0-9-]{1,24}$/.test(s.id))
      .slice(0, MAX_SAVES)
      .map((s) => ({
        id: s.id,
        tuning: readTuning(s.tuning),
        createdAt: Number(s.createdAt) || 0,
        lastPlayed: Number(s.lastPlayed) || 0,
        summary: s.summary && typeof s.summary === 'object' ? s.summary : null,
        ...(typeof s.playedAt === 'number' && Number.isFinite(s.playedAt) ? { playedAt: s.playedAt } : {})
      }))
    const active = typeof v.active === 'string' && slots.some((s) => s.id === v.active) ? v.active : null
    const next =
      v.next && typeof v.next === 'object' ? { tuning: readTuning(v.next.tuning), scenario: String(v.next.scenario ?? 'standard') } : null
    return { version: Number(v.version) || 1, active, slots, next }
  } catch {
    return null
  }
}

function deleteKeys(id: string): void {
  try {
    for (const key of ['state', 'playLog']) storage()?.removeItem(slotPrefix(id) + key)
  } catch {
    // Nothing to remove, or the store is blocked
  }
}

// The index, made from what is already stored the first time it is needed:
// the original save and the ladder trial's, if either was ever played. An
// index from the first version of seats lets go of seats never played.
export function readIndex(): SaveIndex {
  const store = storage()
  const parsed = parseIndex(store?.getItem(SAVES_KEY) ?? null)
  if (parsed && parsed.version === INDEX_VERSION) return parsed
  if (parsed) {
    const keep = parsed.slots.filter((s) => played(store?.getItem(slotPrefix(s.id) + 'state') ?? null))
    for (const s of parsed.slots) if (!keep.includes(s)) deleteKeys(s.id)
    const active = keep.some((s) => s.id === parsed.active) ? parsed.active : null
    const index = { version: INDEX_VERSION, active, slots: keep, next: null }
    writeIndex(index)
    return index
  }
  const slots: SaveSlot[] = []
  if (store?.getItem('state')) slots.push({ id: 'main', tuning: 'classic', createdAt: 0, lastPlayed: 0, summary: null })
  if (played(store?.getItem('trial:state') ?? null)) slots.push({ id: 'trial', tuning: 'trial', createdAt: 0, lastPlayed: 0, summary: null })
  const preferTrial = store?.getItem('ladderTrial') === '1' && slots.some((s) => s.id === 'trial')
  return { version: INDEX_VERSION, active: preferTrial ? 'trial' : (slots[0]?.id ?? null), slots, next: null }
}

export function writeIndex(index: SaveIndex): void {
  try {
    storage()?.setItem(SAVES_KEY, JSON.stringify({ ...index, version: INDEX_VERSION }))
    storage()?.removeItem('ladderTrial')
  } catch {
    // A full or blocked store: the index lives for this visit only
  }
}

// The family in residence when the page loaded, and the tuning the page plays
// (fixed for its life: a family with another tuning needs a reload)
const AT_LOAD = readIndex()
let residentId: string | null = AT_LOAD.active
const residentAtLoad = AT_LOAD.slots.find((s) => s.id === AT_LOAD.active) ?? null

// The sim picks its tuning with LADDER=trial
export const ACTIVE_TUNING: Tuning =
  typeof process !== 'undefined' && process.env?.LADDER
    ? readTuning(process.env.LADDER)
    : (residentAtLoad?.tuning ?? AT_LOAD.next?.tuning ?? 'classic')

// The next family's scenario, when it was chosen before a reload
export const NEXT_SCENARIO_AT_LOAD: string | null = residentAtLoad ? null : (AT_LOAD.next?.scenario ?? null)

// The family the index says is in residence (the page's tuning stays as it
// loaded): when the game loads its save
export function syncResident(): void {
  residentId = readIndex().active
}

export function residentSlotId(): string | null {
  return residentId
}

// A key of the family in residence, or null when there is none
export function activeKey(key: string): string | null {
  return residentId === null ? null : slotPrefix(residentId) + key
}

function newId(index: SaveIndex): string {
  if (!index.slots.some((s) => s.id === 'main') && !storage()?.getItem('state')) return 'main'
  for (let n = 2; ; n++) {
    const id = `slot-${n}`
    if (!index.slots.some((s) => s.id === id)) return id
  }
}

// A seat for a family being written into the register, made the one in
// residence. Null when all the seats are taken.
export function claimSeat(tuning: Tuning, now = Date.now()): SaveSlot | null {
  const index = readIndex()
  if (index.slots.length >= MAX_SAVES) return null
  const slot: SaveSlot = { id: newId(index), tuning, createdAt: now, lastPlayed: now, summary: null }
  writeIndex({ ...index, active: slot.id, slots: [...index.slots, slot], next: null })
  residentId = slot.id
  return slot
}

// A seat holding a save brought in from a file (made the one in residence
// once its save is written, by setActiveSlot)
export function addSlot(tuning: Tuning, now = Date.now()): SaveSlot | null {
  const index = readIndex()
  if (index.slots.length >= MAX_SAVES) return null
  const slot: SaveSlot = { id: newId(index), tuning, createdAt: now, lastPlayed: now, summary: null }
  writeIndex({ ...index, slots: [...index.slots, slot] })
  return slot
}

// Which family the next load puts in residence (null: none, with the next
// family to be as given)
export function setActiveSlot(id: string | null, next: NextFamily | null = null): boolean {
  const index = readIndex()
  if (id !== null && !index.slots.some((s) => s.id === id)) return false
  writeIndex({ ...index, active: id, next: id === null ? next : null })
  return true
}

// Gives up a seat and its family's save for good. The family in residence
// leaves residence with it.
export function removeSlot(id: string): boolean {
  const index = readIndex()
  if (!index.slots.some((s) => s.id === id)) return false
  deleteKeys(id)
  writeIndex({ ...index, active: index.active === id ? null : index.active, slots: index.slots.filter((s) => s.id !== id) })
  if (residentId === id) residentId = null
  return true
}

// A save from before seats that no seat lists (the original game's, or the
// ladder trial's) gets its seat back, if it was ever played
export function adoptOrphans(): void {
  const store = storage()
  if (!store) return
  const index = readIndex()
  const slots = [...index.slots]
  for (const [id, tuning] of [['main', 'classic'], ['trial', 'trial']] as const) {
    if (slots.length >= MAX_SAVES || slots.some((s) => s.id === id) || id === residentId) continue
    if (played(store.getItem(slotPrefix(id) + 'state'))) slots.push({ id, tuning, createdAt: 0, lastPlayed: 0, summary: null })
  }
  if (slots.length !== index.slots.length) writeIndex({ ...index, slots })
}

export function setSlotSummary(id: string, summary: SaveSummary): void {
  const index = readIndex()
  writeIndex({ ...index, slots: index.slots.map((s) => (s.id === id ? { ...s, summary } : s)) })
}

// Notes how the family in residence stands, for the menu's list, and all play
// so far, for its time away
export function noteActiveSummary(summary: SaveSummary, now: number, playedAt: number): void {
  if (residentId === null) return
  const index = readIndex()
  writeIndex({
    ...index,
    slots: index.slots.map((s) => (s.id === residentId ? { ...s, summary, lastPlayed: now, playedAt } : s))
  })
}

export function residentSlot(): SaveSlot | null {
  const index = readIndex()
  return index.slots.find((s) => s.id === residentId) ?? null
}
