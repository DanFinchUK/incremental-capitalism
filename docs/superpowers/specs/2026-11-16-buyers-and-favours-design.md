# Buyers and favours: automation redesign

Status: design agreed in conversation, not built. Open questions are listed at
the end. A clickable sketch of the favour button:
https://claude.ai/artifact/KZLiWJcfXDNZxE31jRHPAu

## Why

Automation today is a spending limit, not a pair of hands. Every source
(Estate Manager +1%, Head Butler +3%, Proxy with Power of Attorney +5%, the
Landed Gentry heir +3%, Old School Tie +3% a rank, five titles +5%) adds to one
share of cash. Once a second a single spree buys the cheapest units under that
share, up to 50 of them, across Jobs and Businesses alike.

That causes three problems:

- It doesn't match how players picture it. Interns are hands that press Get
  paid; players expect automation to be hands that press Buy.
- It spends everything under the line every second, so a player saving for
  one last purchase has to switch automation off to get the chance.
- It can't sensibly compare a Job (paid per tap) with a Business (paid per
  second), so it just buys whatever is cheapest.

## Buyers

Automation becomes staff who press Buy.

- **Two kinds.** A Recruiter buys Jobs. An Acquisitions advisor buys
  Businesses. Each only ever compares items of its own kind: Jobs by tap pay
  gained per pound, Businesses by income per second gained per pound.
- **One of each.** Buyer advisors are unique: at most one Recruiter and one
  Acquisitions advisor at a time. A better one offered through Introductions is an
  upgrade decision, not a pile-up.
- **Budget.** Each buyer gets its own budget each second: a share of the cash
  in hand at that moment. Both work from the same snapshot. With £100 in hand
  and 20% each, each may spend up to £20, so at most £40 leaves the account.
  - Rarity sets the share: common 20%, rare 40%, legendary 60%. Honours tiers
    (below) raise it further.
  - A 2-rank perk adds +20% a rank to every buyer, so a legendary buyer with
    both ranks reaches 100%. Full automation is something to go for.
  - If the two buyers' shares together come to more than 100%, each is scaled
    down in proportion: 80% and 60% become about 57% and 43% of the cash, so
    together they never spend more than you hold.
- **What it buys.** Each second, each buyer takes the best return-per-pound
  item that fits its budget, at the current bulk setting, then the next best
  that still fits, up to its number of item types. It never buys the same item
  twice in one second. Unspent budget stays in the account and doesn't roll
  over.
- **Item types.** Rarity widens what a buyer handles each second as well as
  its budget: common 1 item type, rare 2, legendary 3, and +1 for each
  honours tier (a peer handles 7). Landed Gentry traits add more on top
  (below).
- **Bulk setting.** Buyers follow the same x1 / x10 / Next / Max picker as the
  player's own Buy buttons. Max means as much of the single best item as the
  budget allows, so on Max a buyer concentrates on one item (revisit if it
  feels odd). Switching to x1 slows the staff to one unit each, which lets the
  player buy something themselves without cash vanishing underneath them.

Best value is greedy: best return per pound first, then the next that fits. No
search for the best combination; players should be able to predict what their
staff will do.

New rungs start with the worst return per pound, so buyers rarely buy the
first unit of a new rung. Older rungs get about 12% dearer per unit, so once
they are topped up a newer rung becomes the best value and buyers move on to
it. Full automation, buyers keeping up with the newest rungs, should be
reachable late on: a legendary buyer with both perk ranks, ideally kept as a
PA so it survives retirement and climbs the honours.

## Landed Gentry: buyers in a trait

Landed Gentry becomes a family of three heir traits, like advisor families:

| Trait | Rarity | Effect |
|---|---|---|
| Minor Gentry | common | +1 item type |
| Landed Gentry | rare | +2 item types |
| Old Aristocracy | legendary | +3 item types |

Each keeps a downside, as every heir trait does (Landed Gentry's clicks pay
20% less today).

- With no buyer hired, the heir's own staff act as a basic Recruiter and
  Acquisitions buyer, without taking office seats.
- With a buyer hired, the family's staff assist it: the bonus item types are
  added to that buyer. The trait is never wasted.

It is a heir's own trait, so it lasts their lifetime only.

## Old School Tie: calling in a favour

Old School Tie stops being automation and becomes favours: getting a leg up
from people you were at school with, beyond what you could otherwise reach.

- **Where.** A "Call in a favour (n/n)" button on the bottom card of the Jobs
  list and of the Businesses list, whatever that card is: locked above a gate,
  not yet revealed, or the last item in the game. Full width of the card's
  text side, under its text.
- **What a press does.** Lends one unit of that item for 3 minutes. Pressing
  again lends another unit, as buying would. Each loan has its own clock: a
  second favour with 5 seconds left on the first runs both for 5 seconds,
  then the first drops off and the second runs on for 2:55.
- **Favours.** Shared between the two lists. They reset each generation;
  ranks add more. With one favour the button just says "Call in a favour";
  with more it shows what's left, "Call in a favour (1/2)", the way Buy
  doesn't show x1. It must be strong enough to be worth Legacy.
- **The button while a loan runs.** The pressed button becomes a countdown row
  for that loan, "Lending you a hand for 2:58", not clickable. If favours
  remain, another "Call in a favour (1/2)" button appears below it. Each
  running loan has its own row. When a loan ends its row stays, greyed, in
  the order the favours were called in, until the generation ends; it stays
  even after the card locks again. Each finished row says where the helper
  went, picked at random with no repeats on a card. Each line has a sting
  about privilege, revolving doors or favours not being free, and fits a
  phone-width row: "Flew back to Dubai", "Headed back to Mayfair", "Signing
  in at the Lords", "Gone to Davos to fight inequality", "Took a non-exec at
  a water firm", "Now advising your rivals", "Left a card and an invoice",
  "Lunch at the club ran to dinner", "Called away to a shoot", "Recalled to
  the Treasury", "Back on the yacht", "Off to a select committee".
- **The card while a loan runs.** Shows the loaned item, only on that card;
  the rung after it stays hidden. While the item is locked for buying, the
  title shows just the number lent, "Broker (1)". Once it can be bought, it
  shows owned and lent, "Broker (2 + 1)", next to the usual Buy button.
- **Earnings.** A lent unit earns what one unit earns at the family's rates
  (Legacy, class, heir traits, advisors, titles), ignoring any of the same
  item owned: no milestones, no synergy.
- **Not yours.** Lent units add nothing to net worth, don't reveal the next
  rung, and don't change the price of buying the item.
- **Gates.** Beating the gate mid-loan unlocks the card as normal and the
  loans run on: own 3 and have 2 lent, and all 5 earn. Lending above the
  price ceiling is allowed; it skips the shopping restriction, not the boss.
- **Retiring** ends any running loans.

## Keeping the team together

Retiring dismantles the family office: only the PA stays. The aim is a team
that builds up over generations and is slowly improved, not reset each time.

- **A PA chair per title.** Each title adds one PA chair, so a titled family
  keeps more of its staff through every retirement. (This replaces the Baron
  rank's extra office seat.)
- **Promotion through service.** A PA moves up its advisor family with service:
  common to rare after 3 generations served, rare to legendary after 3 more.
  The card shows it: "Estate Manager, promoted to Head Butler". Pay rises with
  the tier, as upkeep already grows with rarity. This replaces today's flat
  +25% effect and +20% pay per generation served.
- **Honours, by service only.** Past legendary, PAs earn honours "for services
  to the family". Introductions never offer them.

  | Tier | Reached by | Shown as |
  |---|---|---|
  | Common, Rare, Legendary | Hiring, or 3 generations' service each | as now |
  | MBE | 3 generations at legendary | "Head Butler, MBE" |
  | OBE | 3 more | "Head Butler, OBE" |
  | Knighthood | 3 more | "Sir/Dame ..." |
  | Peerage | 3 more | "Lord/Lady ..." |

  A common hire who stays is legendary after 6 generations and a peer after
  18. Each honours tier keeps growing the effect, for example +50% of the
  legendary effect a tier (a peer at 3x legendary), with pay to match; the sim
  settles the numbers. A buyer PA's budget climbs with it.
- **Succession at elevation.** Elevating no longer fires the PAs. Each is
  replaced by their child, who grew up around the job: one tier below the
  parent, but never above Rare, since honours aren't inherited (decided). Pay resets
  with the new tier.

## Titles and Legacy

Each title is worth far less than the Legacy it costs (about 9 Legacy, x765,000
income, for x1.5), so elevating feels like a step down. Titles move from flat
income to things that last:

- **A PA chair per title** (above).
- **Legacy worth more per title**, from the first title, for example +15% a
  title, replacing the Earl's single +50% at three titles. Legacy resets each
  bloodline, so this speeds every climb without becoming an ever-rising
  multiplier. It loosens the +1/+2/+3 pacing for titled families, which is the
  intent; the sim's rules for titled lines get adjusted to match.
- The flat +50% income per title goes, or shrinks.
- The two-title fourth heir choice stays. The five-title automation goes (it
  belonged to the old automation).

## The favour on the trading desk

- **Cashflow chart (LON:FLOW).** While loans run, the lent units' income sits
  on top of the area as a gold band, with a worded legend entry beside
  "Realised 1s" and "Passive floor" (for example "From favours"). It steps up
  when a favour is called in and drops away when the helper leaves.
- **Revenue mix.** A gold "Favours" slice with its share, like the other
  sources, while any loan runs.
- **No new single letters.** While in this code, the chart's event pins swap
  their letters for words: M becomes "Milestone" or "Class", the star
  becomes "Opportunity" (or a pin with the word in a tooltip if words crowd
  the chart). The cash chart's O and C stay as they are.

## Buyers on screen

- **Beside each list's title.** The Jobs heading shows the Recruiter, the
  Businesses heading shows Acquisitions, for example
  `Budget 40% · 2 items  [x] Automate`. Unticking Automate stands that buyer
  down; ticking it puts them back to work. With no buyer for a list, the area
  is empty. This replaces the automation pill above Money and Retire, and the
  top bar's single "Automation: On/Paused" button.
- **The trading desk.** The gold threshold line on the cash chart goes. A
  small marker sits on the candle where a buyer bought something, named in a
  tooltip ("Recruiter bought 10 Cleaners"). Words, not letters.

## Renaming the headhunter

"The headhunter is coming" reads as a threat. Advisor offers become
**Introductions**: "Some people would like to be introduced". This covers the
dialog's label, its copy, and any story text that mentions the headhunter
(including the example in CLAUDE.md).

## Open questions

1. **Which advisors become buyers.** Today's Estate Manager, Head Butler and
   Proxy are one automation family; candidate: they become Acquisitions, and a
   new family of three becomes Recruiters.
2. **The per-title Legacy step,** for example +15%, and how much of the flat
   income per title survives.
3. **New perks** (later, not this phase): an heir draft re-roll, scandal
   protection, the trust fund, synergies.

## Testing

- Unit tests for the buyer rules: budget snapshot, greedy best value within
  each kind, item-type limit, unspent budget kept, Max concentrating.
- Unit tests for favours: separate clocks, base earnings ignoring owned count,
  no net worth, no reveal of the next rung, gate beaten mid-loan, retiring.
- `npm run sim` must pass; the bots will need to hire buyers and call in
  favours. Expect pacing to move, since buyers buy far fewer units a second
  than today's spree.
