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
      'Your net worth moves you up the British class system. Each new class boosts your income and gets you mates\' rates on purchases.',
      'Market Opportunities pop up on screen from time to time. Click them before they vanish for income boosts or instant windfalls. Rare and Legendary ones hit harder, and shady ones are a gamble.'
    ]
  },
  {
    kicker: 'The long game',
    title: 'Retire, then do it all again richer',
    body: [
      'Once your lifetime earnings reach £450B you can retire for Legacy. Retiring resets your cash, Jobs and Businesses, but every Legacy point multiplies your income by 1.5x for good.',
      'Your first retirement unlocks Business auto-buy, and Legacy buys perks in the Old Boys\' Network, starting with a free Unpaid Intern.'
    ],
    tip: 'Retiring as soon as you can get +1 to +3 Legacy is usually the fastest way up.'
  }
]
