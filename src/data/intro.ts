export interface IntroPage {
  kicker: string
  title: string
  body: ReadonlyArray<string>
  tip?: string
}

export const INTRO_PAGES: ReadonlyArray<IntroPage> = [
  {
    kicker: 'Orientation',
    title: 'Welcome to Incremental Capitalism',
    body: [
      'Tap Get paid to earn your first cash, then spend it on Jobs to boost every click.',
      'Click fast to build a Hustle streak for multiplied click pay.'
    ]
  },
  {
    kicker: 'Passive income',
    title: 'Businesses earn while you sleep',
    body: [
      'Businesses pay out every second automatically, even at a reduced rate while offline.',
      'Ownership milestones multiply an item\'s output. Use x1, x10, Next and Max to buy in bulk.'
    ]
  },
  {
    kicker: 'High stakes',
    title: 'Climb the nine class gates',
    body: [
      'Each social class is guarded by a boss with its own twist. Beating a boss promotes your class, unlocks new items, and brings the headhunter.',
      'Choose your moment carefully: failing a boss brings ruin on the family name and ends your bloodline.'
    ]
  },
  {
    kicker: 'The dynasty',
    title: 'Retire and let your heir take over',
    body: [
      'Retire to bank Legacy (paid steeply by your deepest gate), pass 5% of net worth to an heir (capped, so they start about a gate behind you), and keep your Personal Assistant.',
      'Every heir\'s trait stacks permanently onto the bloodline, upsides and downsides alike.'
    ]
  }
]
