// The strength report measures one advisor at a time by making every
// introduction offer only that advisor, so the bot has to take them or
// nobody: the introductions still come when the game sends them, and seats
// still empty at retirement. The game itself never sets this.
let only: string | null = null

export function setSimOffer(advisorId: string | null): void {
  only = advisorId
}

export function simOffer(): string | null {
  return only
}
