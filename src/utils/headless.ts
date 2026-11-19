// The pacing sim plays hours of game with nobody watching, and never reads
// back anything kept only for the player: the save, the profile, the menu,
// the play log, or the Trading Desk's charts. Headless, the game skips all
// of those. What decides play (the income ledger the buyers read their tap
// rate from, for one) still runs. The game itself never turns this on.
let on = false

export function setHeadless(value: boolean): void {
  on = value
}

export function headless(): boolean {
  return on
}
