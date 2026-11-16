// Game text is written for tapping Get paid. Playing without tapping, the
// allowance takes the place of click pay (it is paid as taps' worth of it),
// so the same text is reworded to talk about the allowance instead.
// Whole rules lines come first, where swapping single words would read badly.
const ALLOWANCE_WORDING: ReadonlyArray<[RegExp, string]> = [
  [
    /Earn the target from click pay\. Taps count at full Hustle; Interns and your allowance always count\./g,
    'Earn the target from your allowance and Interns.'
  ],
  [/Taps, Interns and your allowance all polish\./g, 'Your allowance and Interns both polish.'],
  [
    /\+1x max Hustle a rank, for your taps and the Interns\. Playing without tapping, \+0\.5x steady Hustle instead\./g,
    '+0.5x steady Hustle a rank, for your allowance and the Interns.'
  ],
  [/each clicking "Get paid" once a second at your Hustle/g, 'each earning half your base allowance'],
  [/ \(Auto-Clicker\)/g, ''],
  [/(\d+) auto-clicks\/sec/g, '$1 Interns at work'],
  [/clicking is beneath them/g, 'paid work is beneath them'],
  [/\bClicks polish silver\b/g, 'Your allowance polishes silver'],
  [/\bClick pay halved\b/g, 'Allowance halved'],
  [/\bClicks and businesses earn\b/g, 'Your allowance and businesses earn'],
  [/\bClicks pay\b/g, 'Your allowance pays'],
  [/\bclicks pay\b/g, 'your allowance pays'],
  [/\bclick pay\b/g, 'your allowance'],
  [/\bClick income\b/g, 'Allowance'],
  [/\bClicks x/g, 'Allowance x']
]

export function forPlaystyle(text: string, noTap: boolean): string {
  if (!noTap) return text
  let out = text
  for (const [pattern, replacement] of ALLOWANCE_WORDING) out = out.replace(pattern, replacement)
  return out
}
