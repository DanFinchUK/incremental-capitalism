# Incremental Capitalism

## Git

- Always work on `main`: commit and push straight to it. No feature branches
  and no pull requests. A push to `main` deploys to GitHub Pages
  (`.github/workflows/deploy.yml`, which runs the unit tests, typecheck and build).

## Before pushing

- `npm test` and `npm run typecheck` must pass (the deploy runs both).
- For any balance change, `npm run sim` must pass too. The pacing rule it
  checks is in `docs/pacing.md`.
