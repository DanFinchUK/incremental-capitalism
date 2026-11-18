// The strength report measures one heir trait (or inherited trait) at a time
// by making every heir the game drafts carry it: the draft still runs and
// names its heirs as usual, and the player still picks one. Null in a field
// means no trait of that kind. The game itself never sets this.
let forced: { trait: string | null; inherit: string | null } | null = null

export function setSimHeirs(traits: { trait: string | null; inherit: string | null } | null): void {
  forced = traits
}

export function simHeirs(): { trait: string | null; inherit: string | null } | null {
  return forced
}
