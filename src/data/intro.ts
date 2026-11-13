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
      'You start with a delivery bag and a dream. Hit Get paid to earn your first few quid.',
      'Spend it on Jobs. Every Job you hold adds to what each click pays, so the grind gets better the more you take on.'
    ],
    tip: 'Click quickly to build a Hustle streak. It multiplies click pay, but cools off if you stop.'
  },
  {
    kicker: 'Passive income',
    title: 'Businesses earn while you sleep',
    body: [
      'Businesses pay out every second without a single click, and keep earning at a reduced rate while the game is closed.',
      'Each purchase costs a little more than the last. Reaching ownership milestones doubles that item\'s output, and the Buy amount buttons (x1, x10, Next, Max) let you buy in bulk.'
    ]
  },
  {
    kicker: 'Getting ahead',
    title: 'Climb the class ladder',
    body: [
      'Every class is guarded by a boss. Reach the gate\'s net worth to unlock the fight, then win under its twist to move up. Each new class boosts your income, gets you mates\' rates, and unlocks the next tier of Jobs and Businesses.',
      'Market Opportunities pop up on screen from time to time. Click them before they vanish for income boosts or instant windfalls. Rare and Legendary ones hit harder, and shady ones are a gamble.'
    ]
  },
  {
    kicker: 'The long game',
    title: 'Retire and let your heir take over',
    body: [
      'Once you have beaten your first boss you can retire and hand the estate to your heir. Legacy is paid for the deepest gate you beat, and one gate deeper is worth far more than the same depth twice. Your heir starts over with a trust fund worth 5% of your net worth, and every Legacy point multiplies their income by 1.5x for good.',
      'Your first retirement unlocks Business auto-buy, and Legacy buys perks in the Old Boys\' Network, starting with a free Unpaid Intern.'
    ],
    tip: 'Each generation, try to beat your best split times, then push one gate further.'
  }
]
