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
      'Tap "Get paid" to earn your first cash, then spend it on Jobs to boost every click.',
      'Tap fast to build a Hustle streak: up to 3x click pay.',
      'Rather not tap? Turn on "Play without tapping" in Settings and Universal Credit replaces "Get paid". Slower, but every class can be reached.'
    ]
  },
  {
    kicker: 'Passive income',
    title: 'Businesses earn while you sleep',
    body: [
      'Businesses pay out every second, and at a reduced rate while you are away.',
      'Ownership milestones multiply an item\'s output. Use "x1", "x10", "Next" and "Max" to buy in bulk.',
      'Own 1,000 of any Job or Business for market dominance: there\'s none left to buy, and each one held adds 25% to all income.',
      'Opportunities on the Market Wire last a few seconds. A freeze stops automation, or halves income if nothing is automated.'
    ]
  },
  {
    kicker: 'High stakes',
    title: 'Climb the nine classes',
    body: [
      'Each class has an ordeal to get through first, each with its own twist. Win it to move up, unlock new items and bring introductions to new advisors.',
      'Choose your moment: losing an ordeal ends the bloodline.',
      'Your home changes as you climb, from a bedsit to the State rooms and beyond. Settings can keep any room the family has reached.'
    ]
  },
  {
    kicker: 'The dynasty',
    title: 'Retire and let your heir take over',
    body: [
      'Retire to bank Legacy: +1 for each class past the family\'s best, and each point multiplies income by 4.5. The heir gets 5% of net worth, capped about a class below yours, and keeps your Personal Assistants.',
      'Each heir has their own trait, which retires with them, and a milder one they pass down. Passed-down traits stack until the family elevates.'
    ]
  }
]
