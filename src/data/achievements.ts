export interface AchievementDef {
  id: string
  name: string
  description: string
  // Hidden achievements show as ??? until earned
  hidden: boolean
}

// Each achievement adds this much to all income, for good.
export const ACHIEVEMENT_INCOME_BONUS = 0.02

export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  { id: 'side-hustle', name: 'Side Hustle', description: 'Take your first Job.', hidden: false },
  { id: 'entrepreneur', name: 'Entrepreneurial Spirit', description: 'Own your first Business.', hidden: false },
  { id: 'comfortably-off', name: 'Comfortably Off', description: 'Reach £1M net worth.', hidden: false },
  { id: 'billionaire', name: 'Self-Made, Allegedly', description: 'Reach £1B net worth.', hidden: false },
  { id: 'portfolio-career', name: 'Portfolio Career', description: 'Hold at least one of every Job at once.', hidden: false },
  { id: 'solidarity', name: 'Solidarity', description: 'Win the Zero-Hours Walkout.', hidden: false },
  { id: 'under-par', name: 'Under Par', description: 'Win the Charity Golf Match in 10 purchases or fewer.', hidden: false },
  { id: 'silver-service', name: 'Silver Service', description: 'Finish Polishing the Family Silver.', hidden: false },
  { id: 'garden-party', name: 'Invited Back Next Year', description: 'Survive the Royal Garden Party.', hidden: false },
  { id: 'early-retirement', name: 'Early Retirement', description: 'Retire with two gates or fewer beaten.', hidden: false },
  { id: 'lucky-streak', name: 'Born Lucky', description: 'Claim three Legendary opportunities in one generation.', hidden: false },
  { id: 'full-house', name: 'Full House', description: 'Fill every open seat in the family office.', hidden: false },
  { id: 'long-service', name: 'Long Service Award', description: 'Keep the same Personal Assistant for three generations.', hidden: false },
  { id: 'dynasty', name: 'Dynasty', description: 'Reach the fifth generation.', hidden: false },
  { id: 'no-sweat', name: 'Didn\'t Break a Sweat', description: 'Beat a boss within three seconds.', hidden: true },
  { id: 'revolving-door', name: 'Revolving Door', description: 'Fire five advisors in one generation.', hidden: true },
  { id: 'spin-cycle', name: 'Spin Cycle', description: 'Talk your way through five scandals in one generation.', hidden: true }
]

export const ACHIEVEMENTS_BY_ID: Readonly<Record<string, AchievementDef>> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))

// Counters that reset with each generation
export interface AchievementProgress {
  legendaryClaims: number
  fires: number
  scandals: number
}

export const EMPTY_PROGRESS: Readonly<AchievementProgress> = Object.freeze({ legendaryClaims: 0, fires: 0, scandals: 0 })
