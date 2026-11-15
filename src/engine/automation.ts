// Automation is something the family hires, not a given. With nobody to do
// it (an advisor such as the Estate Manager, an heir trait, the Old School Tie
// perk or a high enough title) nothing buys itself. Once someone is doing it, items whose next unit
// costs at most a small share of current cash keep themselves stocked, and
// the frontier stays manual.

export const AUTOMATION_SHARE_PER_TIE_RANK = 0.03
export const MAX_AUTOMATION_SHARE = 0.5
export const MAX_AUTOMATION_PURCHASES_PER_TICK = 50

// bonus: what advisors, heir traits and titles bring. nepotismRank: Old
// School Tie perk ranks, which bring automation on their own.
export function automationShare(nepotismRank: number, bonus: number): number {
  return Math.min(MAX_AUTOMATION_SHARE, Math.max(0, bonus) + AUTOMATION_SHARE_PER_TIE_RANK * nepotismRank)
}

export function isWithinAutomationLine(nextCost: number, money: number, share: number): boolean {
  return share > 0 && nextCost <= money * share
}
