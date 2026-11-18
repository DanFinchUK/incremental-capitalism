// The pacing sim plays hours of game in one go and never reads the family's
// save or play log back while it plays, so it can turn off writing them:
// turning the whole save into text after every purchase was a fifth of the
// sim's time. The game itself never touches this.
let paused = false

export function pauseStateWrites(on: boolean): void {
  paused = on
}

export function stateWritesPaused(): boolean {
  return paused
}
