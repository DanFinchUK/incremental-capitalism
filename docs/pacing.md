# Pacing

How hard progress should feel, and how the numbers make it so. This is the
rule the economy is tuned to. `npm run sim` checks it (`sim/pacing.sim.ts`),
so a balance change that breaks it fails loudly.

## The prestige rule

Retiring pays one Legacy point for each gate past the deepest gate the
bloodline has ever beaten, so the Retire button reads **+1**, **+2**, **+3**.
In each generation, the first gate past the family's best is +1, the next +2,
and so on. Retiring without a new record pays nothing (+0), but stays open so a
family stuck behind a bad heir can draft another.

| Gate past the best | Should feel | Sim target (fast tapper) |
|---|---|---|
| +1 | Reasonably easy | Most generations get it; under 8 minutes (median) |
| +2 | A bit more effort | 5 to 30 minutes into the generation (median) |
| +3 | Quite hard | 30 to 150 minutes, for a player who never gives up |
| +4 | About a day of progress | 2 hours or more of non-stop play, often never in 8 hours |

So the player should retire for +1 to +3, and the heir picks up from there.
A generation that retires after 12 minutes without a new gate should land at
+1 to +3, and never +4.

The first generation follows the same rule with a best of 0: gate 1 is easy,
gate 2 takes some effort, gate 3 is quite hard, and gate 4 is out of reach.

"Fast tapper" means about five taps a second, all the time, which is how
playtesters actually play. A mostly idle player (taps hard for the opening and
during bosses, otherwise about one tap every three seconds) follows the same
shape a little slower, and is checked more loosely: +1 in under 12 minutes, the
whole bloodline in under 3 hours.

A player who never taps Get paid must still be able to finish, so someone who
can't tap quickly, or at all, can play. The "Play without tapping" setting
(any time, either way) removes Get paid and pays an allowance instead
(Universal Credit for the founder, from Granny for heirs) worth two taps of
click pay a second (`ALLOWANCE_TAPS_PER_SEC` in `src/engine/economy.ts`).
Hustle holds steady in that mode, 1x plus 0.5x per Grindset Coaching rank, and
the allowance and Interns ride it. Tappers get no allowance, so it never works
as a free auto-clicker on top of tapping. The allowance counts towards the
click bosses at gates 1 and 6, and Jobs raise it. This player is checked at
about half a fast tapper's pace: the founder beats gate 1 within 15 minutes,
+1 comes within 15 minutes, and the bloodline finishes within 4 hours.

Advisors come in families of three: every effect has a common, a rare and a
legendary advisor, and the buff (and upkeep) grows with rarity
(`src/data/advisors.ts`). Some families help idle play most: staff who bring
Interns, and better offline earnings.

## Why it works

The rule needs two things to match:

1. **Each gate is about 4 to 5 times harder than the one before**, for a
   player of a given strength. The gates sit at evenly spaced rungs of the
   item ladder (every 2.3 rungs, `GATE_NET_WORTH` in `src/data/classes.ts`),
   and each rung pays back about twice as slowly as the one below it (the
   ladder rule at the top of `src/data/items.ts`). Beating a gate also raises
   the cap on what you can buy, so the next gate is always a real climb.
2. **Each new gate makes the bloodline about as much stronger.** Each Legacy
   point multiplies income by 4.5 (`legacyMultiplier` in
   `src/engine/economy.ts`), and a bloodline holds one point per gate it has
   reached, so its strength tracks its depth. Perks, advisors and inherited
   heir traits add a little more.

Each heir has two traits. Their own trait is a big trade-off that lasts only
their lifetime, so a bad draw costs one generation and Retire +0 fixes it.
The trait they pass down stays with the bloodline until it elevates, and
stacks with every ancestor's. Passed-down traits are kept mild and never
touch Legacy (`INHERITED_TRAITS` in `src/data/heirs.ts`), so nine bad draws
still leave a family that can beat its gates.

If gates got harder faster than the bloodline got stronger, heirs would stall
at their parent's depth. If the bloodline got stronger faster, heirs would race
several gates past it. Retuning one side means retuning the other.

The heir's trust fund (5% of the estate, capped at about one gate short of the
parent's deepest) skips the re-climb, so most of a generation is spent at the
frontier rather than repeating old gates. A parent who plays on after their
last new gate raises the cap: how far they got towards the next gate, on the
gates' log scale, lifts it towards their own deepest gate, and never past it.
Playing on still pays the heir, though in the sim it costs about twice what it
saves, so retiring promptly stays the faster route.

A whole bloodline earns 9 Legacy, so perks cost 1 point a rank (the first
pair of Interns is free) and the capped perks alone (22 ranks) are more than
one bloodline can buy: which perks to take is a real choice. A perk rank lasts
the whole bloodline, while most advisors leave after a generation, so each
rank is worth at least a rare advisor (`src/data/perks.ts`). Elevating to the
Lords gives one title per 9 Legacy, one per completed bloodline. Each title
multiplies all income by 3, compounding, and nothing else carries Legacy
into the new line, so each line takes about two-thirds as long as the last
(`INCOME_PER_TITLE` in `src/engine/peerage.ts`). With Commoner at about 100
minutes for a fast tapper, that is about 62, 38, 31 and 18 minutes for the
Baron, Viscount, Earl and Marquess lines (sim medians), about 4 hours to
Duke. `sim/pacing.lines.sim.ts` checks each line takes 50% to 85% as long as
the one before (median of five seeds); `sim/elevation.report.sim.ts` shows the climb after an
elevation.

## The ladder trial

Settings has a "Ladder trial" switch: a playtest of reworked Jobs and
Businesses, in a save of its own (`src/data/trial.ts`; the sim plays it with
`LADDER=trial npm run sim`). It aims for this shape:

- Rung 2 is first bought around 50 of Rung 1, and every rung's first unit,
  and its second, takes longer than the last rung's did.
- By the 10th rung, the earlier ones sit at middling milestones (100 to 250).
- By the 20th, the first eight or so are at 1,000, the next few most of the
  way, and the rungs just below the 20th fall away (around 250 down to 175).
- A family without titles gets to about the 10th rung (the Garden Party), and
  each title is worth about two rungs further.

How: the ladder is built by a rule (`TRIAL_LADDER` in `src/data/items.ts`)
fitted with a quick model of a player climbing it. Units get dearer by a step
that falls up the ladder (9.5% to 3.2%), so deep rungs are bought in
hundreds; the gap to the next rung grows from about 58 to about 279 units;
each rung pays back 7.5x more slowly than the one below at the bottom,
easing to 3.6x by halfway. Milestones are worth x4. King's Awards
(`src/engine/awards.ts`) reward every Job, or every Business, in a block of
five rungs reaching 25, 100, 250, 500 and 1,000, each x1.25 to all income,
so the oldest rungs stay worth buying. The classes sit a rung apart from rung
2.4, Legacy is x3.4 a point and a title x2.5.

On the trial the sim passes all but two checks, both near misses that swing
from run to run: the fast tapper's first gate 9 lands around 75 to 85
minutes (the floor is 75), and one later line can come out a little longer
than the one before it.

## Other targets

- A fast tapper's first gate falls within 2.5 to 8 minutes, and the first two
  boss fights take real effort (15 seconds or more).
- The bloodline beats gate 9 for the first time within 75 to 160 minutes.
- On a fresh climb, each Job and Business is first bought with around 50 of the
  one below it (median of at least 35). This is a guide, not a hard rule.
- The first Job takes a few dozen taps.
- Bosses a bloodline has beaten become trivial a few generations later.
- A player tapping once a second never gets anything for free (`sim/stages.sim.ts`).

## Tools

- `npm run sim`: every pacing check. The checks are split across files
  (`pacing.*.sim.ts`, `styles.*.sim.ts`) so their campaigns run in parallel.
- `npm run sim:reports`: the tuning reports below, which print numbers and
  check nothing. Run one on its own with
  `npx vitest run --config vitest.sim.config.ts sim/<name>.report.sim.ts`.
- `sim/campaign.report.sim.ts`: one campaign's generations, splits and kill times
  (`SIM_PACE`, `SIM_SEED`, `SIM_HOURS`).
- `sim/frontier.report.sim.ts`: per generation, how long each +k took
  (`PROBE_FROM` and `PROBE_MIN` make the player stop giving up from a given
  generation, to measure +3 and +4).
- `sim/favour.report.sim.ts`: what a favour's three offered events would be
  worth, as a share of income, by stage.
- `sim/elevation.report.sim.ts`: a bloodline played through an elevation,
  and the new line's climb.
