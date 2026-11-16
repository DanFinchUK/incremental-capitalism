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
  Acquisitions advisor at a time. A better one offered by the headhunter is an
  upgrade decision, not a pile-up.
- **Budget.** Each buyer gets its own budget each second: a share of the cash
  in hand at that moment, set by its rarity. Both work from the same snapshot.
  With £100 in hand and 6% each, each may spend up to £6, so at most £12 leaves
  the account.
- **What it buys.** Each second, each buyer takes the best return-per-pound
  item that fits its budget, at the current bulk setting, then the next best
  that still fits, up to its number of item types. It never buys the same item
  twice in one second. Unspent budget stays in the account and doesn't roll
  over.
- **Item types.** A buyer handles one item type a second at base. Landed
  Gentry traits add more (below).
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
reachable late on, which mostly means rarity budgets that climb high enough.

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
  running loan has its own row.
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

## Status pill

The automation pill above the Money and Retire boxes stays, reworded for
buyers, for example "Recruiter 4% · Acquisitions 6%". The trading desk shows
only the cash chart's threshold line (to be revisited once buyers exist).

## Open questions

1. **Item types beyond Landed Gentry.** With Old School Tie gone to favours,
   only the Landed Gentry traits add item types. Should titles or a perk add
   them too, so most families' buyers handle more than one item a second?
2. **Five titles.** They used to bring automation. Candidate: +1 item type for
   good.
3. **Rarity budgets.** For example common 2%, rare 4%, legendary 6%, settled by
   the sim. They need to climb high enough late on for buyers to reach new
   rungs.
4. **Which advisors become buyers.** Today's Estate Manager, Head Butler and
   Proxy are one automation family. Buyers need a Recruiter and an
   Acquisitions family, each common, rare and legendary.
5. **New perks** for areas that have none: an heir draft re-roll, scandal
   protection, the trust fund, synergies, bosses.
6. **Pill wording** once buyers exist.
7. **The trading desk line.** It sits just above the candles because it marks
   the next restock. Revisit what, if anything, it should mark under buyers.

## Testing

- Unit tests for the buyer rules: budget snapshot, greedy best value within
  each kind, item-type limit, unspent budget kept, Max concentrating.
- Unit tests for favours: separate clocks, base earnings ignoring owned count,
  no net worth, no reveal of the next rung, gate beaten mid-loan, retiring.
- `npm run sim` must pass; the bots will need to hire buyers and call in
  favours. Expect pacing to move, since buyers buy far fewer units a second
  than today's spree.
