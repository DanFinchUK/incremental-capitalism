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
  // The story beat shown when the boss is first beaten
  victoryText: string
  // The social exile beat shown when failing this boss ends the bloodline
  disgraceText: string
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
    victoryText: 'The app blinked first. Pay is restored, plus a branded water bottle as a goodwill gesture. Lesson learned: they need you more than you need them. Now to make sure you never need anyone again.',
    disgraceText: 'You folded on the picket line in exchange for a lukewarm meal-deal voucher. The family name is mud on every rider chat in Britain, and the bloodline quietly packs it in.',
    twistText: 'Click pay halved.',
    conditionText: 'Earn the target from clicks while Hustle is full.',
    twists: [{ kind: 'clickPay', mult: 0.5 }],
    condition: { kind: 'clickEarningsAtFullHustle', target: gateTarget(1, 0.5) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 1
  },
  {
    gate: 2,
    id: 'landlord',
    title: "Landlord's Inspection",
    blurb: 'Your landlord has found a new charge for "wear and tear on the doorbell". The inspection lasts until you can prove you can afford him.',
    victoryText: 'Your landlord keeps the deposit as a "gesture of trust" and leaves. For the first time the rent doesn\'t frighten you, and somewhere a buy-to-let broker senses a new customer.',
    disgraceText: 'Failed over a Blu-Tack mark behind the radiator. The letting agent keeps your surname as part of the deposit, and the family disappears to a damp flat in Ostend.',
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
    victoryText: 'Permission granted, subject to a bat survey nobody will ever read. The shed is now a "garden studio", and the committee has decided you are the right sort, provisionally.',
    disgraceText: 'Caught pouring unauthorised foundations at midnight by three parish councillors with torches. Blacklisted from every cul-de-sac in Surrey, the family sells up and flees abroad.',
    twistText: 'Purchases cost 50% more.',
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
    victoryText: 'You sink the putt on the eighteenth. The hospital gets a cardboard cheque the size of a door, and the directors who cut its funding applaud the loudest.',
    disgraceText: 'Four balls in the pond on the eighteenth and a five-iron thrown into the sponsors\' marquee. Struck from the clubhouse honours board, the family changes its surname and moves to Bruges.',
    twistText: 'Automation paused; every purchase counts as a stroke.',
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
    victoryText: 'The sommelier declares your palate "unexpectedly adequate". You are now the kind of person who sends a bottle back, and the kind the waiter remembers.',
    disgraceText: 'You praised a corked Cava in front of two dukes and the Decanter wine critic. Expelled from every cellar in St James\'s, the bloodline retreats to a dry Swiss valley.',
    twistText: 'Opportunities flood in; 30% are corked (-5% cash).',
    conditionText: 'Reach the target net worth. Good bottles pay a windfall.',
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
    victoryText: 'Granny\'s candelabras gleam. The butlers\' union has won a 2% rise and a framed thank-you note, which is more than the last butler got.',
    disgraceText: 'Tarnished gravy boats reach the top table, and the Dowager faints into the bisque. Tatler prints a two-page obituary for your social standing, and the line ends.',
    twistText: 'Clicks polish silver instead of paying cash.',
    conditionText: 'Polish the target value of silver (Interns help).',
    twists: [{ kind: 'clicksPolish' }],
    condition: { kind: 'polish', target: gateTarget(6, 0.2) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 63
  },
  {
    gate: 7,
    id: 'art',
    title: 'Valuing the Art Collection',
    blurb: 'Christie\'s are here to value the Old Masters your ancestors "acquired" abroad. Best have the full set before anyone asks for them back.',
    victoryText: 'Christie\'s value the collection at more than the GDP of the places it came from. The repatriation letters go in the drawer with the others.',
    disgraceText: 'Christie\'s uncover a garden-centre print in an ancestral gilt frame. Laughed out of Mayfair before the port arrives, the family liquidates and vanishes overseas.',
    twistText: 'Must own every unlocked Job and Business.',
    conditionText: 'Own at least 1 of every revealed item and hit target net worth.',
    twists: [],
    condition: { kind: 'ownAllRevealed', netWorth: gateTarget(7, 1.3) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 127
  },
  {
    gate: 8,
    id: 'grilling',
    title: 'Select Committee Grilling',
    blurb: 'MPs would like to know where the money went. Your lawyers advise you to remember nothing, slowly.',
    victoryText: 'You remembered nothing, beautifully. The committee\'s report runs to 300 pages and changes nothing, which your lawyers call a clean win.',
    disgraceText: 'You accidentally told a parliamentary committee the truth on live television. Dropped by every lunch club in Westminster, the family enters voluntary exile in Patagonia.',
    twistText: 'Automation paused.',
    conditionText: 'Reach the target net worth by hand.',
    twists: [{ kind: 'automationPaused' }],
    condition: { kind: 'netWorth', target: gateTarget(8, 1.3) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 255
  },
  {
    gate: 9,
    id: 'garden-party',
    title: 'Royal Garden Party',
    blurb: 'Cucumber sandwiches, a minor royal and every grievance you have ever caused, all on one lawn. The final exam of good breeding.',
    victoryText: 'A minor royal laughs at your joke, and nobody is sure which one. The family has arrived. The drawbridge can finally come up behind you.',
    disgraceText: 'You trod on a corgi and called the Lord Chamberlain "pal". Escorted through the tradesmen\'s gate in dead silence, the dynasty boards the night ferry, never to be seen again.',
    twistText: 'Clicks x0.75, rent 15%, purchases +25% cost.',
    conditionText: 'Reach the target net worth.',
    twists: [
      { kind: 'clickPay', mult: 0.75 },
      { kind: 'incomeTax', rate: 0.15 },
      { kind: 'purchaseCost', mult: 1.25 }
    ],
    condition: { kind: 'netWorth', target: gateTarget(9, 1.3) },
    timeLimitSec: TIME_LIMIT_SEC,
    cooldownSec: COOLDOWN_SEC,
    legacyReward: 511
  }
]
