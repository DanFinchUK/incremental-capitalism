// A family's coat of arms, drawn from its surname so it never changes: the
// field, its colours, the charge and the motto. The coronet comes from the
// family's rank and is added when drawn.

export type Division = 'plain' | 'pale' | 'fess' | 'bend' | 'chevron' | 'quarterly'
export type Charge = 'bezants' | 'pound' | 'mullet' | 'crescent' | 'key'

export interface Arms {
  division: Division
  // Heraldic colours: a colour and a metal, so the charge always stands out
  colour: string
  metal: string
  charge: Charge
  motto: string
  translation: string
}

const COLOURS = ['#8e1b24', '#1d3f78', '#1f5a3a', '#5b2a6b', '#1b1b1f']
const METALS = ['#d6a93c', '#e9e2cf']
const DIVISIONS: ReadonlyArray<Division> = ['plain', 'pale', 'fess', 'bend', 'chevron', 'quarterly']
// Bezants are gold coins in heraldry, so they come up twice as often
const CHARGES: ReadonlyArray<Charge> = ['bezants', 'bezants', 'pound', 'mullet', 'crescent', 'key']

export const MOTTOES: ReadonlyArray<readonly [string, string]> = [
  ['Pecunia non olet', 'Money does not smell'],
  ['Quod habemus tenemus', 'What we have, we hold'],
  ['Alii laborent', 'Let others do the work'],
  ['Semper plus', 'Always more'],
  ['Nihil sine pecunia', 'Nothing without money'],
  ['Non ducor, emo', 'I am not led, I buy'],
  ['Fiscus nos non tangit', 'The taxman does not touch us'],
  ['Haereditas virtus est', 'Inheriting is a virtue']
]

function hash(text: string): number {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  return h
}

export function armsFor(surname: string): Arms {
  const h = hash(surname)
  const pick = <T>(list: ReadonlyArray<T>, shift: number): T => list[(h >>> shift) % list.length]
  const [motto, translation] = pick(MOTTOES, 20)
  return {
    division: pick(DIVISIONS, 0),
    colour: pick(COLOURS, 4),
    metal: pick(METALS, 9),
    charge: pick(CHARGES, 13),
    motto,
    translation
  }
}
