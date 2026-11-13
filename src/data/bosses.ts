import { SOCIAL_CLASSES } from './classes'

export type BossTwist =
  | { kind: 'clickPay'; mult: number }
  | { kind: 'incomeTax'; rate: number }
  | { kind: 'purchaseCost'; mult: number }
  | { kind: 'eventFlood'; intervalSec: number; corkedChance: number }
  | { kind: 'clicksPolish' }
  | { kind: 'automationPaused' }

export type BossCondition =
  | { kind: 'clickEarningsAtFullHustle'; target: number }
  | { kind: 'earnedAfterTax'; target: number }
  | { kind: 'netWorth'; target: number }
  | { kind: 'netWorthWithinPar'; target: number; par: number }
  | { kind: 'polish'; target: number }
  | { kind: 'ownAllRevealed'; netWorth: number }

export interface BossDef {
  // The class index this boss guards (1..9)
  gate: number
  id: string
  title: string
  blurb: string
  twistText: string
  conditionText: string
  twists: ReadonlyArray<BossTwist>
  condition: BossCondition
  timeLimitSec: number
  cooldownSec: number
  // Legacy paid on retirement when this is the deepest gate beaten
  legacyReward: number
}

function gateTarget(gate: number, mult: number): number {
  return Math.round(SOCIAL_CLASSES[gate].threshold * mult)
}

const TIME_LIMIT_SEC = 180
const COOLDOWN_SEC = 60

export const BOSSES: ReadonlyArray<BossDef> = [
  {
    gate: 1,
    id: 'walkout',
    title: 'Zero-Hours Walkout',
    blurb: 'The delivery app has "optimised" your pay again. Time to remind management who actually does the work.',
    twistText: 'The app halves your click pay.',
    conditionText: 'Earn the target from clicks while your Hustle streak is full. Nobody strikes alone.',
    twists: [{ kind: 'clickPay', mult: 0.5 }],
    condition: { kind: 'clickEarningsAtFullHustle', target: gateTarget(1, 1.5) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 1
  },
  {
    gate: 2,
    id: 'landlord',
    title: "Landlord's Inspection",
    blurb: 'Your landlord has found a new charge for "wear and tear on the doorbell". The inspection lasts until you can prove you can afford him.',
    twistText: 'Rent takes 30% of all income.',
    conditionText: 'Earn the target after rent.',
    twists: [{ kind: 'incomeTax', rate: 0.3 }],
    condition: { kind: 'earnedAfterTax', target: gateTarget(2, 1.5) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 3
  },
  {
    gate: 3,
    id: 'planning',
    title: 'Garden Office Planning Permission',
    blurb: 'The council\'s planning committee would love to approve your shed. They just need a heritage survey, a bat report and a sense that you are the right sort.',
    twistText: 'Every purchase costs 50% more while the council deliberates.',
    conditionText: 'Reach the target net worth.',
    twists: [{ kind: 'purchaseCost', mult: 1.5 }],
    condition: { kind: 'netWorth', target: gateTarget(3, 1.5) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 7
  },
  {
    gate: 4,
    id: 'golf',
    title: 'Charity Golf Match',
    blurb: 'Eighteen holes for the children\'s hospital, sponsored by the firms that closed its funding. The real handicap is the small talk.',
    twistText: 'Every purchase is a stroke, and automation sits this one out.',
    conditionText: 'Reach the target net worth in 15 purchases or fewer.',
    twists: [{ kind: 'automationPaused' }],
    condition: { kind: 'netWorthWithinPar', target: gateTarget(4, 2), par: 15 },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 15
  },
  {
    gate: 5,
    id: 'champagne',
    title: 'Champagne Tasting',
    blurb: 'A sommelier in a cravat pours you thirty vintages and judges your face. Some of the bottles are corked, and so is he.',
    twistText: 'Opportunities pour in every few seconds, and some are corked.',
    conditionText: 'Reach the target net worth. Good tastings pay a bonus; corked ones cost you 5% of your cash.',
    twists: [{ kind: 'eventFlood', intervalSec: 6, corkedChance: 0.3 }],
    condition: { kind: 'netWorth', target: gateTarget(5, 2) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 31
  },
  {
    gate: 6,
    id: 'silver',
    title: 'Polishing the Family Silver',
    blurb: 'Granny\'s candelabras will not shine themselves, and the butler has finally unionised. Pick up a cloth.',
    twistText: 'Clicks polish silver instead of paying.',
    conditionText: 'Polish the target worth of silver. Unpaid Interns polish too.',
    twists: [{ kind: 'clicksPolish' }],
    condition: { kind: 'polish', target: gateTarget(6, 2) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 63
  },
  {
    gate: 7,
    id: 'art',
    title: 'Valuing the Art Collection',
    blurb: 'Christie\'s are here to value the Old Masters your ancestors "acquired" abroad. Best have the full set before anyone asks for them back.',
    twistText: 'The valuers want to see everything.',
    conditionText: 'Own at least one of every revealed item and reach the target net worth.',
    twists: [],
    condition: { kind: 'ownAllRevealed', netWorth: gateTarget(7, 2) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 127
  },
  {
    gate: 8,
    id: 'grilling',
    title: 'Select Committee Grilling',
    blurb: 'MPs would like to know where the money went. Your lawyers advise you to remember nothing, slowly.',
    twistText: 'Automation is paused while you answer questions.',
    conditionText: 'Reach the target net worth by hand.',
    twists: [{ kind: 'automationPaused' }],
    condition: { kind: 'netWorth', target: gateTarget(8, 2) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 255
  },
  {
    gate: 9,
    id: 'garden-party',
    title: 'Royal Garden Party',
    blurb: 'Cucumber sandwiches, a minor royal and every grievance you have ever caused, all on one lawn. The final exam of good breeding.',
    twistText: 'Clicks pay 75%, rent takes 15%, and purchases cost 25% more.',
    conditionText: 'Reach the target net worth.',
    twists: [
      { kind: 'clickPay', mult: 0.75 },
      { kind: 'incomeTax', rate: 0.15 },
      { kind: 'purchaseCost', mult: 1.25 }
    ],
    condition: { kind: 'netWorth', target: gateTarget(9, 2) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 511
  }
]
