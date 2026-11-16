# The dukedom, the finale and the Hall of Dynasties

Status: built, apart from the Questions and Later sections. Date: 2026-11-16.

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
- The record times active play, so time away doesn't count.
- No "not yet" on the finale: the dynasty is over, and the only way on is a
  new one.
- The game opens on a main menu instead of dropping straight into play.

## The finale

Elevating to Duke opens the finale in place of the usual elevation. It has:

- A short closing passage in the game's voice: the family no longer buys
  influence, it is what everyone else is trying to buy.
- The dynasty's record: time to the dukedom, generations, lines, staff hired,
  fastest line.
- Everyone in the dynasty, line by line, under the rank that line held: the
  commoners, then the Barons, Viscounts, Earls, Marquesses and the Duke. Each
  person shows their name, traits, deepest gate, time in charge and the staff
  who served them. Whoever took the family up a rank heads that rank's line,
  marked "Became Baron" (and so on), so the Duke closes the roll. The PAs who
  stayed through generations show with the honours they earned.
- One button: found a new dynasty, with a confirmation step and a way back.

Founding a new dynasty asks for confirmation, since the save is replaced, then
files the record in the Hall and starts a new family with a new surname. A
finished dynasty's save stays on the finale until then.

## The main menu

The game opens on a title screen: the family's coat of arms (drawn from the
surname, with a coronet for its rank and a Latin motto), Continue (the
family, generation, rank and time so far), then Found a new dynasty or
Abandon this dynasty, Hall of Dynasties, Achievements, How to play and
Settings. Abandoning asks first, doesn't go in the Hall, and comes back to
the menu with a new family ready to begin; so does a full reset. A family
yet to start can choose its scenario there, once scenarios are open. The
first ever visit goes from the menu into the intro.

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

## Starting fights in late lines

Pressing Take it on nine times a line is the slow part, not finding it. A boss
the family has long outgrown should fall without a fight: once the shortlist
is dealt with, a gate whose condition the family would meet many times over in
its first second is beaten on its own, with the usual banner. The check uses
income without tapping and the boss's twist, and needs a wide margin, since a
lost fight ends the line. Anything closer is fought as now.

As built, the check is the game itself: with nothing waiting on the player, a
gate the family has beaten before is quietly started. Won within a second, it
was outgrown; otherwise it is called off with no loss and no record, and looked
at again 30 seconds later. Pressing Take it on during the look turns it into
the fight. A boss waved through brings no shortlist: Dan passed on every late
shortlist anyway.

## Scenarios

Decided: scenarios, not origins, and they open once any family has made Duke.
A scenario changes one rule for a whole dynasty; it is chosen when founding a
new dynasty (from the finale, or the menu once scenarios are open), shown on
the finale and the menu, and each keeps its own best time in the Hall.

Built first:

- Hands-On: no Interns, no buyers and no allowance; Unpaid Interns and Signing
  Authority are off the shelf.
- Absent Landlord: Play without tapping held on for the whole dynasty.
- Austerity: no family office; the headhunter never calls and the office
  extension is off the shelf.

The sim checks each can be won (sim/scenarios.*.sim.ts). At first build the
bots completed the first bloodline in about 1.7 hours (Hands-On), 2.2 (Absent
Landlord) and 1.9 (Austerity). The bot buys by its own arithmetic, so Hands-On
costs it little; for a person it means pressing every Buy.

More from the earlier list (Trust Fund Kid, Single Heir, Short Reign, Property
Ladder and others) can follow as data plus a rule each.

## Later

- Stakes: harder settings unlocked by finishing, stacking, named as policy
  (death duties, windfall tax, mansion tax, a wealth tax). Parked by Dan on
  2026-11-16 to revisit once dynasties and their variations exist.
- Elevation keeps the same person as head: whoever becomes Baron goes on
  playing as the Baron, instead of handing straight to an heir. The finale
  already groups people this way. Raised by Dan on 2026-11-16 as possibly too
  big a change for now.
