// The player's own record, shared by every save slot: achievements earned in
// any family, and the settings. Each save still carries its own copy of both,
// so a downloaded save stands on its own; this is what wins on loading.
import { ACHIEVEMENTS_BY_ID } from '../data/achievements'
import { ROOMS, type RoomId } from '../data/rooms'
import { parseBulkMode, type PersistedSceneState } from './migration'
import { readUiParts } from './uiParts'

export const PROFILE_KEY = 'profile'

export type SharedSettings = Pick<
  PersistedSceneState,
  'bulkBuyMode' | 'compactAutoBuy' | 'decor' | 'roomsReached' | 'noTap' | 'muted' | 'introSeen' | 'tradingDeskCollapsed' | 'uiShown'
>

export interface Profile {
  // All play so far, across every family: a family's time away doesn't count
  // what was played elsewhere meanwhile
  playedMs: number
  achievements: string[]
  // Null until a save has written them: the first family loaded supplies them
  settings: SharedSettings | null
}

function readSettings(raw: unknown): SharedSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  return {
    bulkBuyMode: parseBulkMode(s.bulkBuyMode),
    compactAutoBuy: s.compactAutoBuy === true,
    decor: ROOMS.some((r) => r.id === s.decor) ? (s.decor as RoomId) : 'auto',
    roomsReached: typeof s.roomsReached === 'number' && Number.isFinite(s.roomsReached) ? Math.max(0, Math.floor(s.roomsReached)) : 0,
    noTap: s.noTap === true,
    muted: s.muted === true,
    introSeen: s.introSeen === true,
    tradingDeskCollapsed: s.tradingDeskCollapsed === true,
    uiShown: readUiParts(s.uiShown)
  }
}

export function parseProfile(raw: string | null): Profile {
  if (!raw) return { playedMs: 0, achievements: [], settings: null }
  try {
    const v = JSON.parse(raw) as Record<string, unknown>
    const achievements = Array.isArray(v.achievements)
      ? [...new Set(v.achievements.filter((id): id is string => typeof id === 'string' && !!ACHIEVEMENTS_BY_ID[id]))]
      : []
    const playedMs = typeof v.playedMs === 'number' && Number.isFinite(v.playedMs) && v.playedMs > 0 ? v.playedMs : 0
    return { playedMs, achievements, settings: readSettings(v.settings) }
  } catch {
    return { playedMs: 0, achievements: [], settings: null }
  }
}

export function readProfile(): Profile {
  try {
    return parseProfile(localStorage.getItem(PROFILE_KEY))
  } catch {
    return { playedMs: 0, achievements: [], settings: null }
  }
}

export function writeProfile(profile: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // A full or blocked store: the profile lives for this visit only
  }
}
