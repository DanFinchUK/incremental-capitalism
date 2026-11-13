// Mastery automation: items far behind the frontier keep themselves
// stocked. An item is "behind the frontier" when its next unit costs at
// most a small share of current cash. Frontier purchases stay manual.

export const BASE_AUTOMATION_SHARE = 0.01
export const AUTOMATION_SHARE_PER_TIE_RANK = 0.01
export const MAX_AUTOMATION_SHARE = 0.5
export const MAX_AUTOMATION_PURCHASES_PER_TICK = 50

// nepotismRank: Old School Tie perk ranks. bonus: advisors and heir traits.
export function automationShare(nepotismRank: number, bonus: number): number {
  return Math.min(MAX_AUTOMATION_SHARE, BASE_AUTOMATION_SHARE + AUTOMATION_SHARE_PER_TIE_RANK * nepotismRank + bonus)
}

export function isWithinAutomationLine(nextCost: number, money: number, share: number): boolean {
  return nextCost <= money * share
}
