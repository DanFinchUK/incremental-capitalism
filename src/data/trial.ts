// The ladder trial: a playtest of reworked Jobs and Businesses (harder to
// start each rung and to keep buying it, with King's Awards for whole blocks
// of rungs). A family's tuning, chosen when it begins (data/saveSlots.ts),
// with playtest options on; the sim uses LADDER=trial.
import { ACTIVE_TUNING, activeKey } from './saveSlots'

export const LADDER_TRIAL = ACTIVE_TUNING === 'trial'

// The family in residence's own keys (its game and play log), or null
export function storageKey(key: string): string | null {
  return activeKey(key)
}
