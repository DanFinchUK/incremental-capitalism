// The strength report measures every advisor and trait against a ladder of
// plain income boosts (x1.25, x1.5, ...), so each can be read as "worth about
// xN income". This sets that boost for the sim's campaigns. It is read when a
// game store is made, so set it before making one. The game itself never
// touches this, and at 1 it adds nothing.
import type { ModifierSource } from '../engine/modifiers'

let mult = 1

export function setSimIncomeMult(k: number): void {
  mult = k
}

export function simIncomeSources(): ModifierSource[] {
  return mult === 1 ? [] : [{ businessMult: mult, clickMult: mult }]
}
