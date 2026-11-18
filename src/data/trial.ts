// The ladder trial: a playtest of reworked Jobs and Businesses (harder to
// start each rung and to keep buying it, with King's Awards for whole blocks
// of rungs). Chosen per family as its tuning when it starts (data/saveSlots.ts);
// the sim uses LADDER=trial.
import { ACTIVE_TUNING, activeKey } from './saveSlots'

export const LADDER_TRIAL = ACTIVE_TUNING === 'trial'

// The family in play's own keys (its game and play log)
export function storageKey(key: string): string {
  return activeKey(key)
}
