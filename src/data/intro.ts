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
      'Tap fast to build a Hustle streak: up to 3x click pay.',
      'Rather not tap? Turn on Play without tapping in Settings and Universal Credit replaces Get paid. Slower, but every gate can be won.'
    ]
  },
  {
    kicker: 'Passive income',
    title: 'Businesses earn while you sleep',
    body: [
      'Businesses pay out every second, and at a reduced rate while you are away.',
      'Ownership milestones multiply an item\'s output. Use x1, x10, Next and Max to buy in bulk.',
      'Opportunities on the Market Wire last a few seconds. A freeze stops automation, or halves income if nothing is automated.'
    ]
  },
  {
    kicker: 'High stakes',
    title: 'Climb the nine class gates',
    body: [
      'Each class is guarded by a boss with its own twist. Beat it to move up, unlock new items and bring the headhunter.',
      'Choose your moment: losing a boss fight ends the bloodline.'
    ]
  },
  {
    kicker: 'The dynasty',
    title: 'Retire and let your heir take over',
    body: [
      'Retire to bank Legacy: +1 for each gate past the family best, and each point multiplies income by 4.5. The heir gets 5% of net worth, capped about a gate behind you, and keeps your Personal Assistant.',
      'Each heir has their own trait, which retires with them, and a milder one they pass down. Passed-down traits stack until the family elevates.'
    ]
  }
]
