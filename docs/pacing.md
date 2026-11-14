# Pacing

How hard progress should feel, and how the numbers make it so. This is the
rule the economy is tuned to. `npm run sim` checks it (`sim/pacing.sim.ts`),
so a balance change that breaks it fails loudly.

## The prestige rule

Count gates from the deepest gate the bloodline has ever beaten. In each
generation, the first gate past that is **+1**, the next **+2**, and so on.

| Gate past the best | Should feel | Sim target (fast tapper) |
|---|---|---|
| +1 | Reasonably easy | Most generations get it; under 8 minutes (median) |
| +2 | A bit more effort | 5 to 30 minutes into the generation (median) |
| +3 | Quite hard | 30 to 150 minutes, for a player who never gives up |
| +4 | About a day of progress | 2 hours or more of non-stop play, often never in 8 hours |

So the player should retire 1 to 3 gates past their best, and the heir picks
up from there. A generation that retires after 12 minutes without a new gate
should land at +1 to +3, and never +4.

The first generation follows the same rule with a best of 0: gate 1 is easy,
gate 2 takes some effort, gate 3 is quite hard, and gate 4 is out of reach.

"Fast tapper" means about five taps a second, all the time, which is how
playtesters actually play. A mostly idle player (taps hard for the opening and
during bosses, otherwise about one tap every three seconds) follows the same
shape a little slower, and is checked more loosely: +1 in under 12 minutes, the
whole bloodline in under 3 hours.

## Why it works

The rule needs two things to match:

1. **Each gate is about 4 to 5 times harder than the one before**, for a
   player of a given strength. The gates sit at evenly spaced rungs of the
   item ladder (every 2.3 rungs, `GATE_NET_WORTH` in `src/data/classes.ts`),
   and each rung pays back about twice as slowly as the one below it (the
   ladder rule at the top of `src/data/items.ts`). Beating a gate also raises
   the cap on what you can buy, so the next gate is always a real climb.
2. **Each new gate makes the bloodline about as much stronger.** Legacy is
   paid by depth (1, 3, 7, 15 ... points, roughly doubling per gate) and income
   is multiplied by `(1 + Legacy) ^ 1.95` (`legacyMultiplier` in
   `src/engine/economy.ts`), close to 4x per gate. Perks, advisors and stacked
   heir traits add a little more.

If gates got harder faster than the bloodline got stronger, heirs would stall
at their parent's depth. If the bloodline got stronger faster, heirs would race
several gates past it. Retuning one side means retuning the other.

The heir's trust fund (5% of the estate, capped at about one gate short of the
parent's deepest) skips the re-climb, so most of a generation is spent at the
frontier rather than repeating old gates.

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

- `npm run sim`: every pacing check.
- `sim/report.sim.ts`: one campaign's generations, splits and kill times
  (`SIM_PACE`, `SIM_SEED`, `SIM_HOURS`).
- `sim/frontier.report.sim.ts`: per generation, how long each +k took
  (`PROBE_FROM` and `PROBE_MIN` make the player stop giving up from a given
  generation, to measure +3 and +4).
