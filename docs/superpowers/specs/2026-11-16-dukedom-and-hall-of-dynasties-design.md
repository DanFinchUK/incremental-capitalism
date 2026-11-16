# The dukedom, the finale and the Hall of Dynasties

Status: draft, in discussion with Dan. Date: 2026-11-16.

## Intent

The game has no ending. Once a family holds a few titles each line is faster
than the last, and by the end of the Pemberton-Hobbs save (gen 17, six titles)
a whole line took 80 seconds, most of it spent starting fights and waiting for
the hiring buttons. The ranks already stop at Duke, so the dukedom becomes the
end of a dynasty: a finale that looks back over everyone in it, then a fresh
start with a new family. Finished dynasties go in a Hall of Dynasties, timed,
so the game has something to replay for.

## Decided

- A dynasty ends when it elevates to Duke (5 titles). An elevation that jumps
  past Duke ends it too.
- No carry-over between dynasties: a new dynasty starts as a new game would.
  The Hall of Dynasties, achievements and settings are kept; those are records
  and preferences, not power.
- No new boss after the dukedom, and no endless mode beyond it.
- No stakes (difficulty tiers) yet. See Later.
- The victory and hiring screens hold their buttons back only when Get paid was
  tapped just before (built 2026-11-16).

## The finale

Elevating to Duke opens the finale in place of the usual elevation. It has:

- A short closing passage in the game's voice: the family no longer buys
  influence, it is what everyone else is trying to buy.
- The dynasty's record: time to the dukedom, generations, lines, staff hired,
  fastest line.
- Everyone in the dynasty, line by line, under the rank that line held: the
  commoners, then the Barons, Viscounts, Earls, Marquesses and the Duke. Each
  person shows their name, traits, deepest gate, time in charge, the staff who
  served them, and "created Baron" (and so on) where they took the family up a
  rank. The PAs who stayed through generations show with the honours they
  earned.
- Two buttons: found a new dynasty, or not yet. Not yet closes the finale and
  leaves the Duke's family to look around; the family tree reopens it.

Founding a new dynasty asks for confirmation, since the save is replaced, then
files the record in the Hall and starts a new family with a new surname.

## The Hall of Dynasties

A list of finished dynasties, newest first, each with its surname, time to
the dukedom, generations and lines, and the finale's roll of names to reopen.
The best time is marked. It's reached from the family tree and from the
intro screen of a new dynasty.

## What needs recording

The family tree already records each person's name, traits, deepest gate,
time, staff and whether they elevated. To show the finale it also needs, per
person:

- the family's titles while they were head, so each line gets its rank (old
  saves: one title per elevation, which is how every save so far has played);
- their PAs' names and honours at their retirement.

The Hall is stored beside the save under its own key, so replacing the save
never loses it.

## Questions

- Time measure: active play time (offline time excluded) is the proposal.
- Variation between dynasties: scenarios (named rule changes such as no
  automation, no tapping, no family office) or origins (a strength and a
  weakness each). Scenarios were the latest idea; nothing is decided. Either
  would unlock by finishing dynasties, and each would keep its own best time.
- Whether scenarios are open from the start or only after the first dukedom.

## Later

- Stakes: harder settings unlocked by finishing, stacking, named as policy
  (death duties, windfall tax, mansion tax, a wealth tax). Parked by Dan on
  2026-11-16 to revisit once dynasties and their variations exist.
- Starting fights quickly in late lines: Take it on where Get paid or the
  allowance sits when a boss is ready, or the next gate offered from the win
  banner. Waiting on which part was slow.
