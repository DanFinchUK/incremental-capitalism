# Incremental Capitalism

## Git

- Always work on `main`: commit and push straight to it. No feature branches
  and no pull requests. A push to `main` deploys to GitHub Pages
  (`.github/workflows/deploy.yml`, which runs the unit tests, typecheck and build).

## Before pushing

- `npm test` and `npm run typecheck` must pass (the deploy runs both).
- For any balance change, `npm run sim` must pass too. The pacing rule it
  checks is in `docs/pacing.md`.

## In-game writing

- Story copy (modal blurbs, victory and boss text, headlines, flavour in
  descriptions) speaks in the game's voice: a dry, satirical take on British
  wealth and privilege. It describes what happens in the world, not the
  game's rules. "The headhunter won't leave until you take someone on or send
  the lot packing" fits; "Every boss win brings a shortlist; the next boss
  waits until you do" reads like a spec and doesn't.
- Rules and numbers go where the screen presents them as such: effect and
  cost lines, boss conditions, stat pills, buttons, a labelled rules line and
  How to play. State them plainly there, and keep them out of story copy.
- Follow the avoid-ai-writing guidance
  (github.com/conorbronsdon/avoid-ai-writing): no em dashes, none of its
  flagged vocabulary, no stock transitions, no "it's not X, it's Y" framing.
