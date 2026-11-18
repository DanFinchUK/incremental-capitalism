// The ladder trial: a playtest of reworked Jobs and Businesses (harder to
// start each rung and to keep buying it, with King's Awards for whole blocks
// of rungs). It plays in a save of its own, so trying it costs the real game
// nothing. Settings turns it on and off; the sim uses LADDER=trial.
declare const process: { env: Record<string, string | undefined> } | undefined

export const TRIAL_FLAG_KEY = 'ladderTrial'

function readTrial(): boolean {
  if (typeof process !== 'undefined' && process.env?.LADDER) return process.env.LADDER === 'trial'
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(TRIAL_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export const LADDER_TRIAL = readTrial()

// The trial's save, Hall and play log are kept apart from the real game's
export function storageKey(key: string): string {
  return LADDER_TRIAL ? `trial:${key}` : key
}

// Switches the trial on or off, then reloads into the other save
export function setLadderTrial(on: boolean): void {
  try {
    if (on) localStorage.setItem(TRIAL_FLAG_KEY, '1')
    else localStorage.removeItem(TRIAL_FLAG_KEY)
  } catch {
    return
  }
  location.reload()
}
