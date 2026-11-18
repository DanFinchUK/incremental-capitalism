// Save slots: up to five families on the go, one played at a time. Each slot
// keeps its own game and play log under its own keys, so saving writes only
// the family in play; a small index lists them, with a summary for the menu.
// The Hall, achievements and settings are shared (data/profile.ts).
//
// The first slot ('main') uses the game's original keys, and 'trial' the keys
// the ladder trial used, so saves from before slots carry on where they were.
declare const process: { env: Record<string, string | undefined> } | undefined

export const SAVES_KEY = 'saves'
export const MAX_SAVES = 5

// How the game is tuned for this family, fixed when it starts. The ladder
// trial for now; difficulty settings later.
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
}

export interface SaveIndex {
  active: string
  slots: SaveSlot[]
}

// The keys each slot's game and play log live under
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

function parseIndex(raw: string | null): SaveIndex | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<SaveIndex>
    if (!v || !Array.isArray(v.slots) || v.slots.length === 0) return null
    const slots: SaveSlot[] = v.slots
      .filter((s): s is SaveSlot => !!s && typeof s.id === 'string' && /^[a-z0-9-]{1,24}$/.test(s.id))
      .slice(0, MAX_SAVES)
      .map((s) => ({
        id: s.id,
        tuning: readTuning(s.tuning),
        createdAt: Number(s.createdAt) || 0,
        lastPlayed: Number(s.lastPlayed) || 0,
        summary: s.summary && typeof s.summary === 'object' ? s.summary : null
      }))
    if (slots.length === 0) return null
    const active = slots.some((s) => s.id === v.active) ? (v.active as string) : slots[0].id
    return { active, slots }
  } catch {
    return null
  }
}

// The index, made from what is already stored the first time it is needed:
// the original save, and the ladder trial's if there is one
export function readIndex(): SaveIndex {
  const store = storage()
  const parsed = parseIndex(store?.getItem(SAVES_KEY) ?? null)
  if (parsed) return parsed
  const slots: SaveSlot[] = [{ id: 'main', tuning: 'classic', createdAt: 0, lastPlayed: 0, summary: null }]
  if (store?.getItem('trial:state')) slots.push({ id: 'trial', tuning: 'trial', createdAt: 0, lastPlayed: 0, summary: null })
  const active = store?.getItem('ladderTrial') === '1' && slots.length > 1 ? 'trial' : 'main'
  return { active, slots }
}

export function writeIndex(index: SaveIndex): void {
  try {
    storage()?.setItem(SAVES_KEY, JSON.stringify(index))
    storage()?.removeItem('ladderTrial')
  } catch {
    // A full or blocked store: the index lives for this visit only
  }
}

// The slot in play, fixed for the page's life: switching slots reloads
export const ACTIVE_SLOT: SaveSlot = (() => {
  const index = readIndex()
  return index.slots.find((s) => s.id === index.active) ?? index.slots[0]
})()

// The sim picks its tuning with LADDER=trial
export const ACTIVE_TUNING: Tuning =
  typeof process !== 'undefined' && process.env?.LADDER ? readTuning(process.env.LADDER) : ACTIVE_SLOT.tuning

export function activeKey(key: string): string {
  return slotPrefix(ACTIVE_SLOT.id) + key
}

function newId(index: SaveIndex): string {
  for (let n = 2; ; n++) {
    const id = `slot-${n}`
    if (!index.slots.some((s) => s.id === id)) return id
  }
}

// A new slot, empty until its family is written into the register. Returns
// null when all the slots are taken.
export function addSlot(tuning: Tuning, now = Date.now()): SaveSlot | null {
  const index = readIndex()
  if (index.slots.length >= MAX_SAVES) return null
  const slot: SaveSlot = { id: newId(index), tuning, createdAt: now, lastPlayed: now, summary: null }
  writeIndex({ active: index.active, slots: [...index.slots, slot] })
  return slot
}

export function setActiveSlot(id: string): boolean {
  const index = readIndex()
  if (!index.slots.some((s) => s.id === id)) return false
  writeIndex({ ...index, active: id })
  return true
}

// Removes a slot's family for good. Not the one in play: the menu switches
// away first.
export function removeSlot(id: string): boolean {
  const index = readIndex()
  if (id === index.active || !index.slots.some((s) => s.id === id)) return false
  try {
    for (const key of ['state', 'playLog']) storage()?.removeItem(slotPrefix(id) + key)
  } catch {
    // Nothing to remove, or the store is blocked
  }
  writeIndex({ ...index, slots: index.slots.filter((s) => s.id !== id) })
  return true
}

// Notes how the family in play stands, for the menu's list
export function noteActiveSummary(summary: SaveSummary, now: number): void {
  const index = readIndex()
  writeIndex({
    ...index,
    slots: index.slots.map((s) => (s.id === ACTIVE_SLOT.id ? { ...s, summary, lastPlayed: now } : s))
  })
}
