# Dynasty roguelike redesign

Status: approved by Dan. Date: 2026-11-12.

## Intent

Incremental Capitalism plays itself too much. Business auto-buy picks the best return per pound across every item, and the card highlight tells the player what to buy next, so the main decision left is when to retire. The fun Dan wants is mastery and depth: each generation reaches the same checkpoints faster than the last, then pushes one checkpoint further. The early game should become trivial because the player has outgrown it, the way the inner planets of an asteroid mining idle game end up running themselves while the frontier stays hands-on. Bosses are the moments that matter, as in Balatro. Endless high-score play is not a goal.

The redesign turns each prestige run into a generation of a dynasty. A generation has a drafted heir, a family office of advisors hired along the way, and a ladder of boss fights at the class gates. Legacy pays for depth, not for lifetime earnings.

## Goals

- Player decisions drive progress: what to buy, which heir, which advisors, when to attempt a boss, when to retire.
- Each generation clears familiar gates faster, visibly, with split times against a personal best.
- Going one gate deeper pays much more than repeating the same depth, so longer, deeper generations are worth it.
- Automation covers only what the player has outgrown. The frontier is always manual.
- The first retirement arrives after roughly 30 to 45 minutes of human play (today it is 70 to 85).
- A run-to-run story: a family tree of named heirs and what each achieved.

## Non-goals

- Endless or score-chasing modes beyond the last gate.
- Multiplayer, leaderboards, or accounts.
- Changing the item catalogue (Jobs, Businesses and their art) beyond tuning numbers.

## Anti-goals

- A "buy this" recommendation in any form, including advisors whose effect is a suggestion. Working out return per pound is part of the game.
- Losing a generation to time away from the keyboard. Failing a boss never ends a generation.
- Humour that punches down. Gig workers, renters, strikers, the poor and the precarious are never the joke. Employers, landlords, councils, lobbyists, the gentry and the system are. Light-hearted, witty, satirical.

## Constraints

- Vue 3, Pinia and TypeScript, built with Vite and deployed to GitHub Pages. No backend; state lives in localStorage.
- Code layout stays as it is: data in `src/data`, pure game rules in `src/engine`, state and actions in `src/stores/game.ts`, views in `src/components`. Prefer new modules over growing `game.ts`.
- Saves load through `parseSavedState` in `src/engine/migration.ts`. This redesign is schema 7 and resets existing saves (see Saves).
- Vitest covers engine, store and UI. Every phase lands with tests.
- Copy follows Dan's writing rules: no em dashes, no bold-lead bullet lists.

## Approaches considered

Run structure:

- A. Bosses gate each class; the player retires when they choose; Legacy grows steeply with the deepest boss beaten. Picked. It gives bosses and "deeper each time" while keeping retirement a choice.
- B. Balatro-strict: each boss has a target and a timer, and a failed boss ends the generation. Rejected: in an idle game, losing a run while away from the keyboard feels unfair.
- C. Keep lifetime-earnings Legacy and add splits and bosses on top. Rejected: its rewards keep favouring short runs, which works against depth.

Advisors:

- Advisors as rule-changing effects with costs, like Balatro jokers. Picked.
- Advisors as recommenders who point at the best buy. Rejected: this is the decision-removal Dan wants gone.

Automation:

- Mastery-based: items far behind the frontier keep themselves stocked. Picked.
- Today's return-on-investment auto-buy across all items. Removed.

## Design

### A generation

1. On retirement the player drafts one of three heirs. Each heir has a trait that bends the rules for that generation. The first generation of a new save has no trait.
2. The heir starts with the trust fund (cash worth 5% of the previous estate's net worth, as the game already does today) and the family office: the Personal Assistant chair carries over, and the other seats start empty.
3. The player climbs. Each class gate is a boss.
4. After each boss win, a headhunter offers advisors.
5. The player retires whenever they choose. Legacy is paid by depth.

### Bosses and class gates

The feeling to aim for is a raid guild's progression, not a fresh Balatro run. The player is not starting from zero each generation, so the first kill of a new boss is a real struggle, and a few generations later, with more Legacy, perks, advisors and a better heir, the same boss is steamrolled in seconds. Every generation faces every boss in order; the steamroll is the reward, so outgrown bosses are not skipped or auto-cleared.

There are nine gates, one per class above the starting class, and they must be beaten in order. Gates are hard walls: reaching a gate's net worth threshold no longer promotes the player. It unlocks that gate's boss, and items priced above that gate's band stay hidden until the boss is beaten. Net worth can keep growing inside the current band, so waiting and building makes an attempt easier, but the next tier of Jobs and Businesses stays locked. The player's class is the last gate beaten.

A boss is attempted on demand from a boss card. During an attempt its twist applies and the win condition is tracked. An attempt has a time limit (a few minutes; exact value per boss is the builder's to tune). On a win, the class promotion happens and the headhunter opens. On a loss or timeout, the twist ends, nothing is taken from the player, and the boss can be retried after a cooldown.

Boss targets are fixed per boss and do not scale with the player's Legacy, perks or advisors. Every win condition must get faster as the player gets stronger: no condition may be a fixed amount of effort that power can't shorten (for example, if silver is polished by clicks, Unpaid Interns and click multipliers polish too). The game records each boss's kill time and shows it against the best kill time for that boss. "Steamroll" in this document is design guidance for the feeling, not a word or badge that appears in the game.

| Gate into | Boss | Twist and condition (starting point for tuning) |
|---|---|---|
| Emergent service worker | Zero-Hours Walkout | The gig app halves click pay. Win by earning a target from clicks while holding a full Hustle streak. Nobody strikes alone. |
| Traditional working class | Landlord's Inspection | Rent takes 30% of all income until the target is cleared. |
| New affluent workers | Garden Office Planning Permission | Every purchase costs 50% more while the council deliberates. Reach the target net worth. |
| Technical middle class | Charity Golf Match | Reach the target within a set number of purchases ("par"). Rewards careful return-per-pound buying. |
| Established middle class | Champagne Tasting | A flood of Market Opportunities, some of them "corked" (bad outcomes). Claim enough good ones. |
| Elite | Polishing the Family Silver | Clicks polish silver instead of paying. Polish enough pieces while businesses carry the income. |
| Davos Regular | Valuing the Art Collection | Own at least one of every revealed item while net worth clears the target. |
| Shadow Cabinet | Select Committee Grilling | Automation is paused. Clear the target by hand. |
| Reptilian Dynasty | Royal Garden Party | Lighter versions of several earlier twists at once. The final exam. |

Targets rise steeply from gate to gate. The builder sets exact targets and time limits using the simulator so that the pacing goals below hold.

### Legacy by depth

Lifetime-earnings Legacy is retired. On retirement, the generation pays Legacy based on the deepest gate it beat, growing steeply with depth so one more gate is worth more than repeating the same depth twice. Every retirement pays, not only new records. Retiring before beating any gate pays nothing.

The income multiplier per Legacy point (x1.5, compounding) and the perk costs stay as they are unless the simulator shows they must move. The "progress to next Legacy" bar becomes progress to the next gate.

Pacing goals for the builder to hit with the simulator:

- Generation 1 can retire after about 30 to 45 minutes of human-paced play, having beaten gate 3 or 4.
- With sensible play, each generation reaches its previous deepest gate noticeably faster (aim for 20% or more) and has a realistic shot at one gate deeper.
- The first kill of the Royal Garden Party (gate 9) arrives after roughly 15 to 20 hours of play, over about 12 to 20 generations. The first Elite kill (gate 6) lands around hour 5 or 6.
- A boss first killed in generation N is steamrolled (won within seconds of starting the attempt) a few generations later.

### Split times

The game records the time from generation start to each gate cleared. A splits panel shows the current generation against the player's best for each gate, with the difference coloured ahead or behind, like speedrun splits. Personal bests persist across generations and are part of the save.

All timers in this design (splits, boss kill times and boss time limits) run on active play time: time the game is open and ticking. Offline catch-up time does not count, so stepping away never costs a split. (Claude's call.)

If the tab closes or reloads during a boss attempt, the attempt is abandoned with no cooldown, and the player can start it again straight away. (Claude's call.)

### The family office (advisors)

Fewer rules, more stacking. As in Balatro, where stacking copies of one joker is half the fun, the office limits the player through seat count and costs, never through rules about who may sit where.

- Open seats. Any advisor can sit in any seat, and duplicates are allowed and intended. Three Stockbrokers means triple the effect and triple the commission. Costs that stack are what keep stacking in check.
- The office starts with 3 open seats plus the Personal Assistant chair. Legacy perks add open seats. Seat count is the main limit, like Balatro's joker slots.
- After each boss win, the headhunter offers three advisors rolled by rarity (Common 60%, Rare 30%, Legendary 10%, the same tiers as Market Opportunities). The player may hire one or skip.
- Each advisor has a positive effect and one or two costs: a one-off hiring fee in cash; a retainer (a flat cost per second that scales with class); or a commission (a percentage of the income or purchases they touch).
- Effects change rules and never recommend purchases.
- Firing is free and permanent.

Roles are tags, not restrictions. Every advisor has a role tag (for example Buyer, Finance, Fixer, Property, Hospitality). Tags exist so advisors can care about each other: "Head of Finance: +10% income for each Finance advisor in the office" rewards going all in on one role.

The Personal Assistant chair is the family's continuity. On retirement, open-seat advisors leave with the outgoing generation, like jokers at the end of a Balatro run. Whoever sits in the PA chair stays with the family. Any advisor can be promoted into the chair at any time (the previous occupant moves to an open seat, or leaves if none is free). A PA gains loyalty for each generation served: a payrise (their costs rise) and seniority (their effect grows). A replacement PA starts junior, so the player weighs an expensive long-serving PA against a cheap new hire.

Campaigns. Some Legendary advisors, mostly lobbyists, run campaigns whose effect builds the longer they serve. For example, Flour Duty Relief: food-sector items get 1% cheaper for each minute in office, up to 50%. Campaigns build up within a generation; a campaigner in the PA chair keeps their progress across generations. Two campaigners on the same cause build twice as fast.

Sector tags. Every Job and Business gets a sector tag (for example food, property, finance, infrastructure, media) so advisors and campaigns can target sectors and generations can lean into a sector build. The builder assigns the tags.

Examples to anchor the list (the builder fills it out to about 20 to 25):

- Stockbroker (Rare, Finance): milestones are worth 1x more each. Commission: 2% of business income.
- Property Guy (Common, Property): Buy-to-let portfolio and Construction firm pay 2x. Retainer.
- Accountant (Common, Finance): Tax Rebate windfalls are twice as large. Hiring fee.
- Head of Finance (Rare, Finance): +10% income for each Finance advisor. Retainer.
- Wealth Manager (Rare, Finance): the heir's trust fund share rises by 5 points. Commission: 1% of every purchase.
- Lobbyist (Rare, Fixer): bosses' twists are 25% weaker. Retainer.
- Flour Duty Campaigner (Legendary, Fixer, Hospitality): the Flour Duty Relief campaign above. Retainer.
- Proxy with Power of Attorney (Legendary, Buyer): the automation line moves much closer to the frontier (see below). Commission: 3% of all income.

### Mastery automation

Automation replaces today's auto-buy. An item keeps itself stocked once it is far behind the player's frontier: when its next unit costs at most a small fraction of current cash (start at 1%, tuned by simulator). Automated buying happens on the existing one-second cadence and buys only automated items. Items near the frontier are always bought by hand.

What moves the automation line: the Old School Tie perk (repurposed from lowering auto-buy unlock counts), the Proxy advisor, and some heir traits. The per-item auto-buy checkboxes stay, so a player can exclude an item. The master pause stays.

Removed: return-on-investment target selection (`selectAutoBuyTarget`), the "next auto-buy" card highlight, the lifetime-purchase unlock counts, and Business auto-buy as a first-retirement unlock. Unpaid Interns remain auto-clickers and no longer gate Job automation.

### Heirs and traits

On retirement the player sees three heirs, each with a generated name and one trait, rolled by rarity. Traits are trade-offs, not pure upgrades. Examples (the builder fills it out to about 12):

- Old Etonian: classes promote twice as fast, Jobs pay 25% less.
- Black Sheep: Businesses earn 2x, clicks earn half.
- Nepo Baby: trust fund x3, no Unpaid Interns this generation.
- Hedge Fund Bro: Market Opportunities spawn twice as often, Shady deals are more common.
- Reformed Socialist: the Legacy multiplier is halved this generation, every Job pays 5x per click.
- Gap Year Philanthropist: boss time limits +50%, retainers cost double.

Names are posh and generated (for example "Araminta Fitzwilliam-Hobbs III"), and the joke is on the dynasty.

### Family tree

A modal lists every generation: name, trait, advisors hired, deepest gate, split times, Legacy earned and time played. It persists in the save and is opened from the header.

### Scandal events with choices

A new kind of Market Opportunity offers two options instead of one claim. They use the existing rarity tiers. Examples:

- Leaked WhatsApps: pay hush money (lose 10% of cash) or ride it out (50%: free publicity, a business boost; 50%: income halved for 60 seconds).
- Non-Dom Status Questioned: move the money offshore (auto-buy frozen 30 seconds) or pay your taxes like everyone else (a windfall from public goodwill).

The player is always the target of the satire when they choose the cynical option.

### Achievements

About 15 achievements, each granting a small permanent income bonus (+2% each, added together). Examples: hold every Job at once; beat the Charity Golf Match under par; retire while still Traditional working class; claim three Legendary opportunities in one generation; fire an advisor within ten seconds of hiring them. A panel lists them, with hidden ones shown as "???".

### Peerage (endgame)

Built overnight with Claude's calls, as Dan asked ("make sensible decisions").

- Unlock: once the family has beaten the Royal Garden Party at least once, ever, and holds enough Legacy for one title.
- Elevation converts Legacy into Titles: floor(sqrt(Legacy / 100)). It ends the current generation (recorded in the family tree), then gives up Legacy points, perks and the whole family office including the PA. The family name, tree, achievements and best times carry on.
- Each title adds 50% to all income, for good. One title adds an office seat, two bring a fourth heir to the succession draft, three make Legacy worth 50% more, and five move automation 5% further.
- Ranks by titles held: Baron, Viscount, Earl, Marquess, Duke.

### Tone audit

Before new copy ships, re-read the existing copy (Jobs list, headlines, class blurbs, event text, perk text) against the punch-up rule and fix anything that lands on the wrong people.

## Saves (schema 7)

Existing saves are reset. Dan is the only player, so schema 7 starts every save fresh, and the old migration paths for schemas 1 to 6 can be deleted along with their tests. A save from before schema 7 loads as a new game, and the new-player intro shows again.

## Delivery order

Each phase ships playable, tested, and committed on its own.

1. Tone audit of existing copy.
2. Bosses, class gates, Legacy by depth, splits, and first-generation pacing. This is the core and includes the "shorter first prestige" work.
3. Mastery automation, replacing auto-buy.
4. Heirs and traits, plus the family office.
5. Family tree.
6. Scandal events with choices.
7. Achievements.
8. Peerage (after its own design pass).

## Tuning tool

The balance simulator used so far lives outside the repo. It moves into the repo as a dev-only suite with its own command (for example `npm run sim`), kept out of `npm test` because it takes longer. It models a scripted player (buying, clicking, attempting bosses, hiring advisors, picking heirs, retiring) well enough to check the pacing goals, and it states those goals as assertions on specific times and cash milestones, so a balance change that breaks pacing fails loudly. For example:

- Generation 1 beats gate 3 within 30 to 45 simulated minutes of human-paced play.
- Generation 2 reaches generation 1's deepest gate at least 20% sooner.
- Net worth at the 10-minute mark of generation 2 is at least a set multiple of generation 1's.
- The first gate 6 kill happens between hours 5 and 6, and the first gate 9 kill between hours 15 and 20.
- A boss first killed in generation N is won within a few seconds of starting the attempt by generation N+3.

The exact thresholds are the builder's to set once the scripted player is calibrated, but every pacing goal in this document has at least one assertion. (Agreed with Dan.)

## Left to the builder

- Exact boss targets, time limits, cooldowns and the depth-to-Legacy curve, set with the simulator against the pacing goals.
- The full advisor and trait lists, beyond the examples, within the tone rule.
- UI layout for the boss card, splits panel, headhunter, family office, heir draft, family tree and achievements, consistent with the existing modal and card styles and working at phone width.
- The name generator.
