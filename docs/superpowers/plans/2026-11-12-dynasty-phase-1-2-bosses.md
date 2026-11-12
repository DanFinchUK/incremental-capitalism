# Dynasty Phases 1 and 2: Tone Audit, Bosses and Class Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit existing copy for tone, then replace lifetime-earnings Legacy with nine boss-gated classes, Legacy paid by depth, split times, and an in-repo pacing simulator with assertions.

**Architecture:** Boss data lives in `src/data/bosses.ts`, pure boss rules in `src/engine/bosses.ts`, split bookkeeping in `src/engine/splits.ts`. The store gains a boss module (`src/stores/modules/bosses.ts`) that `game.ts` composes, so `game.ts` does not grow much. A scripted player in `sim/` drives the real store for hours of simulated play and asserts pacing.

**Tech Stack:** Vue 3, Pinia (setup store), TypeScript, Vitest with jsdom, vue-tsc.

**Spec:** `docs/superpowers/specs/2026-11-12-dynasty-roguelike-design.md`. This plan covers delivery-order items 1 (tone audit) and 2 (bosses, class gates, Legacy by depth, splits, first-generation pacing) plus the tuning tool. Later phases get their own plans.

## Global Constraints

- Humour punches up, never down: "Gig workers, renters, strikers, the poor and the precarious are never the joke. Employers, landlords, councils, lobbyists, the gentry and the system are."
- Copy: no em dashes, no bold-lead bullet lists.
- Code: no leading-underscore names for functions or constants. Prefer new modules over growing `src/stores/game.ts`.
- Saves: schema 7 resets every older save to a new game (Dan is the only player).
- "Steamroll" never appears in the game.
- All timers (splits, boss kill times, boss time limits, cooldowns) run on active play time; offline catch-up does not advance them.
- Gates are beaten in order, and only the next gate's boss can be attempted.
- Boss targets are fixed numbers; no condition may be a fixed amount of effort that more power can't shorten.
- Each task ends with `npm test` and `npx vue-tsc --noEmit` passing, then a commit and `git push` (if push fails on SSH auth, keep committing and say so).

## Review Focus

- Reload or tab close mid-attempt: the attempt is abandoned with no cooldown and every twist effect (cost multiplier, rent, paused automation) is gone after reload. Test in Task 5.
- An heir whose trust fund already exceeds several gate thresholds: only gate 1's boss is available, class stays at 0, and items priced above gate 1's ceiling stay hidden even though cash could afford them. Test in Task 4.
- A long absence (offline catch-up): the active clock, splits and boss time limits do not advance. Test in Task 5.
- Max bulk buy and auto-buy while gated: neither ever buys an item above the cost ceiling. Test in Task 4.
- Windfalls during Landlord's Inspection: rent applies to every income credit, including windfalls and clicks. Test in Task 5.
- Very long campaigns: depth rewards compounding into the income multiplier must never overflow to Infinity. Test in Task 8.

---

## Phase 1

### Task 1: Tone audit of existing copy

**Files:**
- Modify: copy in `src/data/items.ts`, `src/data/headlines.ts`, `src/data/classes.ts`, `src/data/events.ts`, `src/data/perks.ts`, `src/data/intro.ts`, and template text in `src/components/*.vue`
- Test: `tests/copy.test.ts` (create)

**Interfaces:**
- Produces: nothing used by later tasks.

- [ ] **Step 1: Write the failing test**

```ts
// tests/copy.test.ts
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const COPY_FILES = [
  ...['items', 'headlines', 'classes', 'events', 'perks', 'intro'].map((f) => `src/data/${f}.ts`),
  ...readdirSync('src/components').map((f) => join('src/components', f))
]

describe('copy rules', () => {
  it('uses no em dashes in player-facing copy', () => {
    for (const file of COPY_FILES) {
      expect(readFileSync(file, 'utf8').includes('\u2014'), file).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/copy.test.ts`
Expected: FAIL naming `src/data/headlines.ts` (and `src/components/LegacyShop.vue`).

- [ ] **Step 3: Rewrite every em dash, then audit tone**

Replace each em dash with a colon, full stop or parentheses. Then read every string in the listed files against the punch-up rule. For each line where the joke lands on a worker, renter, striker or anyone precarious rather than on employers, landlords, councils, lobbyists, the gentry or the system, rewrite it so the target moves up. Keep item labels unless a label itself is the problem.

- [ ] **Step 4: Run the tests**

Run: `npm test && npx vue-tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit and push**

Commit message lists each rewritten line's old and new text in the body, so Dan can review the audit in `git log`.

---

## Phase 2

### Task 2: Schema 7 save reset

**Files:**
- Modify: `src/engine/migration.ts`
- Modify: `tests/migration.test.ts` (rewrite)

**Interfaces:**
- Produces: `SCHEMA_VERSION = 7` exported from `src/engine/migration.ts`; `parseSavedState(raw)` returns `createInitialSceneState()` for any save whose `schemaVersion` is not 7. Later tasks add fields to `PersistedSceneState` and to the parse and serialize paths.

- [ ] **Step 1: Write the failing tests**

```ts
it('resets any pre-7 save to a new game', () => {
  for (const v of [1, 2, 3, 4, 5, 6]) {
    const raw = JSON.stringify({ schemaVersion: v, scene: { ...createInitialSceneState(), money: 999, legacyPoints: 12, introSeen: true } })
    expect(parseSavedState(raw)).toEqual(createInitialSceneState())
  }
})
it('writes schema 7 and round-trips', () => {
  const s = { ...createInitialSceneState(), money: 123, legacyPoints: 2, introSeen: true }
  const encoded = serializeState(s)
  expect(JSON.parse(encoded).schemaVersion).toBe(7)
  expect(parseSavedState(encoded).money).toBe(123)
  expect(parseSavedState(encoded).introSeen).toBe(true)
})
it('recovers from corrupt JSON', () => {
  expect(parseSavedState('{nope')).toEqual(createInitialSceneState())
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/migration.test.ts`
Expected: FAIL (pre-7 saves still migrate).

- [ ] **Step 3: Implement**

Delete the v1 to v6 paths (`remapLegacyLifetime`, the curve helpers, `computeHistoricalRunSpent`, the `LEGACY_V*` constants, the trustFund and autoClickers fallbacks, the introSeen-from-progress fallback) and the old tests (`REAL_V1_SAVE` and friends). Keep the field readers and the perk-rank clamping and `legacySpent` recompute.

- [ ] **Step 4: Run tests**

Run: `npm test && npx vue-tsc --noEmit`
Expected: all pass.

- [ ] **Step 5: Commit and push**

### Task 3: Boss data and pure boss rules

**Files:**
- Create: `src/data/bosses.ts`, `src/engine/bosses.ts`
- Test: `tests/bosses.test.ts`

**Interfaces:**
- Produces, in `src/data/bosses.ts`:

```ts
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
  gate: number          // 1..9, the class index this boss guards
  id: string
  title: string
  blurb: string         // one or two lines of satire, punching up
  twistText: string     // player-facing description of the twist
  conditionText: string // player-facing description of the win condition
  twists: ReadonlyArray<BossTwist>
  condition: BossCondition
  timeLimitSec: number
  cooldownSec: number
  legacyReward: number  // Legacy paid on retirement when this is the deepest gate beaten
}
export const BOSSES: ReadonlyArray<BossDef> // exactly 9, gate 1..9 in order
```

- Produces, in `src/engine/bosses.ts`:

```ts
export interface TwistEffects {
  clickPayMult: number; incomeTaxRate: number; purchaseCostMult: number
  automationPaused: boolean; clicksPolish: boolean
  flood: { intervalSec: number; corkedChance: number } | null
}
export const NO_TWIST: Readonly<TwistEffects>
export function combineTwists(twists: ReadonlyArray<BossTwist>): TwistEffects
export function gateThreshold(gate: number): number      // SOCIAL_CLASSES[gate].threshold; Infinity when gate > 9
export function itemCostCeiling(gatesBeaten: number): number // gateThreshold(gatesBeaten + 1)
export function bossForGate(gate: number): BossDef | null
export interface BossTracker {
  gate: number; startedActiveMs: number
  clickEarningsAtFullHustle: number; earnedAfterTax: number; polish: number; purchases: number
}
export function newTracker(gate: number, activeMs: number): BossTracker
export interface BossSnapshot { netWorth: number; allRevealedOwned: boolean }
export interface BossEvaluation { progress: number; won: boolean; lost: boolean }
export function evaluateBoss(def: BossDef, t: BossTracker, s: BossSnapshot, activeMs: number): BossEvaluation
export function legacyForDepth(depth: number): number   // 0 for depth 0, else bossForGate(depth).legacyReward
```

- [ ] **Step 1: Write the failing tests**

```ts
it('defines nine bosses in gate order with the spec names', () => {
  expect(BOSSES.map((b) => b.gate)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  expect(BOSSES.map((b) => b.title)).toEqual([
    'Zero-Hours Walkout', "Landlord's Inspection", 'Garden Office Planning Permission',
    'Charity Golf Match', 'Champagne Tasting', 'Polishing the Family Silver',
    'Valuing the Art Collection', 'Select Committee Grilling', 'Royal Garden Party'
  ])
})
it('targets rise with the gate and Legacy rewards rise steeply', () => {
  // one more gate beats repeating the same depth twice
  for (let g = 1; g < 9; g++) expect(legacyForDepth(g + 1)).toBeGreaterThan(2 * legacyForDepth(g))
  expect(legacyForDepth(0)).toBe(0)
})
it('combines twists, multiplying and taking the strongest', () => {
  const e = combineTwists([{ kind: 'clickPay', mult: 0.75 }, { kind: 'incomeTax', rate: 0.15 }, { kind: 'purchaseCost', mult: 1.25 }])
  expect(e).toMatchObject({ clickPayMult: 0.75, incomeTaxRate: 0.15, purchaseCostMult: 1.25, automationPaused: false })
  expect(combineTwists([])).toEqual(NO_TWIST)
})
it('gates the item ceiling by the next class threshold', () => {
  expect(itemCostCeiling(0)).toBe(SOCIAL_CLASSES[1].threshold)
  expect(itemCostCeiling(9)).toBe(Infinity)
})
it('evaluates each condition kind', () => {
  // netWorth: progress is netWorth / target, won at target
  // netWorthWithinPar: lost once purchases > par, even if netWorth is high
  // ownAllRevealed: won only with allRevealedOwned and netWorth >= netWorth target
  // any kind: lost once activeMs - startedActiveMs >= timeLimitSec * 1000 without a win
})
```

Write the last test as concrete assertions for each kind using a small `BossDef` built inline.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/bosses.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement the data**

Twists and conditions per the spec table. Starting numbers for the simulator to tune in Task 8, with `T(g)` = `SOCIAL_CLASSES[g].threshold`:

| Gate | Twists | Condition |
|---|---|---|
| 1 Walkout | clickPay 0.5 | clickEarningsAtFullHustle, target 3 x T(1) |
| 2 Landlord | incomeTax 0.3 | earnedAfterTax, target 3 x T(2) |
| 3 Planning | purchaseCost 1.5 | netWorth, target 3 x T(3) |
| 4 Golf | none | netWorthWithinPar, target 3 x T(4), par 15 |
| 5 Champagne | eventFlood interval 6s, corked 0.3 | netWorth, target 3 x T(5) |
| 6 Silver | clicksPolish | polish, target 3 x T(6) |
| 7 Art | none | ownAllRevealed, netWorth 3 x T(7) |
| 8 Grilling | automationPaused | netWorth, target 3 x T(8) |
| 9 Garden Party | clickPay 0.75, incomeTax 0.15, purchaseCost 1.25 | netWorth, target 3 x T(9) |

All bosses: `timeLimitSec` 180, `cooldownSec` 60. `legacyReward` by gate: 1, 3, 7, 15, 31, 63, 127, 255, 511 (each more than double the last). Write `blurb`, `twistText` and `conditionText` within the tone rule.

- [ ] **Step 4: Implement `src/engine/bosses.ts`**

`progress` is `min(1, value / target)` for the condition's tracked value; for `ownAllRevealed` it is the net worth ratio, capped at 0.99 until every revealed item is owned.

- [ ] **Step 5: Run tests, commit and push**

Run: `npm test && npx vue-tsc --noEmit`. Expected: pass.

### Task 4: Class from gates, and item gating

**Files:**
- Modify: `src/engine/economy.ts` (add `classInfoForLevel`), `src/stores/game.ts`, `src/engine/migration.ts`, `src/components/ItemCard.vue`
- Test: `tests/store.test.ts`, `tests/economy.test.ts`

**Interfaces:**
- Consumes: `itemCostCeiling`, `gateThreshold` (Task 3).
- Produces:
  - `classInfoForLevel(level: number, netWorth: number): SocialClassStatus` in `economy.ts`: `current` is `SOCIAL_CLASSES[level]`, multipliers from `level`, `bracketProgress` is net worth progress from `current.threshold` to `next.threshold`. `socialClassInfo` is removed.
  - Store: `gatesBeaten: Ref<number>` (persisted, field `gatesBeaten` in `PersistedSceneState`, default 0); `classStatus` now `classInfoForLevel(gatesBeaten, netWorth)`; `costCeiling: ComputedRef<number>`.
  - `VisibleRow<T>` gains `{ mode: 'gated'; key: string; bossTitle: string }`, shown as the row after the last item under the ceiling when the next item is above it (instead of the `???` teaser).
  - `AutoBuySelectionInput` gains `itemCostCeiling: number`; `isItemAutoBuyActive` returns false for items whose `baseCost` exceeds it.

- [ ] **Step 1: Write the failing tests**

```ts
it('keeps class at the gates beaten, whatever the net worth', () => {
  store.hydrateFromStorage(1000)
  store.addDebugMoney(1e12, 1000)
  expect(store.classStatus.current.level).toBe(0)
  store.gatesBeaten = 2
  expect(store.classStatus.current.level).toBe(2)
})
it('hides items above the ceiling even when cash could buy them', () => {
  store.hydrateFromStorage(1000)
  store.money = 1e12
  store.tick(1000); store.tick(2000)
  const revealed = store.visibleJobs.filter((r) => r.mode === 'revealed').map((r) => r.item.baseCost)
  expect(Math.max(...revealed)).toBeLessThanOrEqual(store.costCeiling)
  expect(store.visibleJobs.at(-1)).toMatchObject({ mode: 'gated', bossTitle: 'Zero-Hours Walkout' })
})
it('never buys an item above the ceiling, by hand, Max or auto-buy', () => {
  // buyItem on the first job above the ceiling returns bought 0 with money 1e15
  // setBulkBuyMode('max') then buyItem on the top visible job leaves every above-ceiling count at 0
  // with legacyPoints 1 and lifetimePurchases high on every business, several ticks buy nothing above the ceiling
})
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/store.test.ts tests/economy.test.ts`

- [ ] **Step 3: Implement**

`refreshSeenItems` reveals an item only if its `baseCost <= costCeiling`, regardless of past purchases. `buildVisibleList` emits the `gated` row when the next unrevealed item is above the ceiling. `buyItem` returns `{ bought: 0, ... }` for items above the ceiling. Remove net-worth promotion from `creditMoney`/`tick` paths (`handleClassPromotion` is now called only by a boss win in Task 5). `ItemCard.vue` renders the `gated` row as a locked card: "Locked until you beat {bossTitle}".

- [ ] **Step 4: Run tests, commit and push**

### Task 5: Boss attempts and the active clock

**Files:**
- Create: `src/stores/modules/bosses.ts`
- Modify: `src/stores/game.ts`, `src/engine/economy.ts` (income breakdown), `src/engine/migration.ts`
- Test: `tests/boss-attempts.test.ts`

**Interfaces:**
- Consumes: Task 3 engine, Task 4 `gatesBeaten`.
- Produces:
  - `computeIncomeBreakdown(input: EconomySnapshotInput): { business: number; interns: number }` in `economy.ts` (their sum equals `computePassivePerSecond`).
  - Store: `activeGenerationMs: Ref<number>` (persisted), advanced in `tick` by `min(elapsed, 5000)` only when `elapsed < 60_000`.
  - Store: `bossAttempt: Ref<BossTracker | null>` and `bossCooldownUntilMs: Ref<number>` (active ms; neither persisted).
  - Store: `twist: ComputedRef<TwistEffects>` (`NO_TWIST` when no attempt).
  - Store: `nextBoss: ComputedRef<BossView | null>` with `interface BossView { def: BossDef; status: 'locked' | 'available' | 'active' | 'cooldown'; progress: number; remainingSec: number; cooldownSec: number; bestKillMs: number | null }`. `locked` when net worth is below `gateThreshold(gatesBeaten + 1)`.
  - Store: `startBossAttempt(): boolean`, `abandonBossAttempt(): void`.
  - `ActiveMarketEvent` gains `corked: boolean`.
  - On a win: `gatesBeaten += 1`, `handleClassPromotion(prev)`, record split and kill time (Task 6 consumes `onBossWon(gate: number, killMs: number)` as a hook it fills in), attempt cleared.
  - On a loss: attempt cleared, `bossCooldownUntilMs = activeGenerationMs + cooldownSec * 1000`.

- [ ] **Step 1: Write the failing tests**

```ts
it('only the next gate can be attempted, once unlocked', () => {
  // fresh store: nextBoss.status 'locked'; startBossAttempt() false
  // addDebugMoney(T(1)): status 'available'; startBossAttempt() true; status 'active'
})
it('applies twists only during the attempt', () => {
  // Walkout: moneyPerClick halves during attempt and restores after abandonBossAttempt()
  // Planning: itemQuote cost is 1.5x during attempt
  // Grilling: runAutoBuy buys nothing during attempt
})
it('Landlord rent applies to every income credit, including windfalls and clicks', () => {
  // during Landlord attempt: claim a taxRebate; money rises by 70% of the windfall; a click credits 70%
})
it('Silver diverts click income (manual and Interns) into polish', () => {
  // during Silver: manualClick adds 0 money and polish equal to the click value; Intern clicks also polish
})
it('Golf is lost once purchases exceed par', () => {})
it('win promotes, opens the class modal on first reach, and clears the twist', () => {})
it('loss starts a cooldown measured in active time', () => {
  // timeout -> status 'cooldown'; a 2-hour offline tick does not shorten the cooldown; 60s of active ticks ends it
})
it('reload mid-attempt abandons it with no cooldown and no lingering twist', () => {
  // start Planning attempt, flushSave, new pinia + hydrate: bossAttempt null, status 'available', costs normal
})
it('offline time never advances the active clock', () => {
  // tick(t), tick(t + 2h): activeGenerationMs unchanged
})
```

Fill each with concrete numbers using `addDebugMoney`, `spawnSpecificEvent` and `tick`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/boss-attempts.test.ts`

- [ ] **Step 3: Implement the module**

`src/stores/modules/bosses.ts` exports `createBossModule(deps: BossModuleDeps)` returning the refs, computeds and actions above; `game.ts` calls it once and spreads the result into its return. `BossModuleDeps` holds the refs and functions it needs from the store (`netWorth`, `gatesBeaten`, `activeGenerationMs`, `seenItems`, owned maps, `handleClassPromotion`, `announce`, `flushSave`). Twist hooks in `game.ts`: `economyInput` multiplies `clickBuffMultiplier` by `twist.clickPayMult`; `creditMoney` takes `twist.incomeTaxRate` off every credit and adds the net to `bossAttempt.earnedAfterTax`; click credits (manual, and the Intern share of passive via `computeIncomeBreakdown`) go to `polish` instead of money under `clicksPolish`, and to `clickEarningsAtFullHustle` when `hustleMultiplier >= maxHustle - 0.01`; `itemQuote` multiplies cost by `purchaseCostMult`; `buyItem` increments `purchases` (manual and automated); `runAutoBuy` returns early when `automationPaused`; `maybeSpawnRandomEvent` uses `flood.intervalSec` and marks `corked` with `flood.corkedChance`; claiming a corked event takes 5% of cash and announces it. Evaluate the attempt once per `tick` with `evaluateBoss`.

- [ ] **Step 4: Run tests, commit and push**

### Task 6: Legacy by depth, retirement, splits and kill times

**Files:**
- Create: `src/engine/splits.ts`
- Modify: `src/engine/economy.ts`, `src/stores/game.ts`, `src/stores/modules/bosses.ts`, `src/engine/migration.ts`
- Test: `tests/splits.test.ts`, `tests/store.test.ts`, `tests/economy.test.ts`, `tests/telemetry.test.ts`

**Interfaces:**
- Consumes: `legacyForDepth` (Task 3), `onBossWon` hook (Task 5).
- Produces:
  - `src/engine/splits.ts`: `type Splits = ReadonlyArray<number | null>` (length 10, index is gate, value is active ms); `emptySplits(): (number | null)[]`; `withSplit(s: Splits, gate: number, ms: number): (number | null)[]`; `mergeBests(best: Splits, current: Splits): (number | null)[]` (per gate, the lower non-null); `splitDelta(current: number | null, best: number | null): number | null` (current minus best).
  - Store (all persisted): `splits`, `bestSplits`, `lastKillMs`, `bestKillMs` as `(number | null)[]`.
  - Store: `legacyOnRetire: ComputedRef<number>` = `legacyForDepth(gatesBeaten)`.
  - `retire()` returns false when `gatesBeaten < 1`; otherwise adds `legacyOnRetire`, keeps the trust fund, resets `gatesBeaten`, `splits`, `lastKillMs` and `activeGenerationMs` to empty and 0, keeps bests.
  - Removed: `FIRST_LEGACY_LIFETIME`, `LEGACY_THRESHOLD_RATIO`, `legacyLifetimeThreshold`, `computeLegacyGain`, `nextLegacyLifetimeThreshold`, `computeLegacyBracket`, `LegacyBracketProgress`, and store `legacyGain`, `nextLegacyAt`, `legacyBracket`. `lifetimeEarned` stays as a stat.

- [ ] **Step 1: Write the failing tests**

```ts
it('records splits and keeps the best per gate', () => {
  expect(mergeBests([null, 5000, 9000, ...Array(7).fill(null)], [null, 4000, 9500, ...Array(7).fill(null)]))
    .toEqual([null, 4000, 9000, ...Array(7).fill(null)])
  expect(splitDelta(4000, 5000)).toBe(-1000)
  expect(splitDelta(4000, null)).toBeNull()
})
it('pays Legacy by depth and cannot retire with no gates', () => {
  // gatesBeaten 0: retire() false, legacyOnRetire 0
  // win gates 1..3 via attempts: legacyOnRetire === legacyForDepth(3); retire() adds it
  // after retire: gatesBeaten 0, splits empty, bestSplits keep gate 1..3 times, money is the trust fund
})
it('records kill time per boss and keeps the best', () => {})
```

- [ ] **Step 2: Run to see them fail, implement, run tests**

Delete or rewrite every test that used the removed lifetime-Legacy functions.

- [ ] **Step 3: Commit and push**

### Task 7: Boss, splits and retirement UI

**Files:**
- Create: `src/components/BossCard.vue`, `src/components/SplitsPanel.vue`
- Modify: `src/App.vue`, `src/components/HeroHeader.vue`, `src/components/OverviewBar.vue`, `src/components/ConfirmModal.vue`, `src/components/MarketEvent.vue`, `src/data/intro.ts`, `src/styles/theme.css`
- Test: `tests/app.test.ts`, `tests/trading-desk.test.ts`

**Interfaces:**
- Consumes: `nextBoss`, `startBossAttempt`, `abandonBossAttempt`, `splits`, `bestSplits`, `lastKillMs`, `bestKillMs`, `legacyOnRetire`, `gatesBeaten` (Tasks 4 to 6).
- Produces: `data-testid` hooks `boss-card`, `boss-start`, `boss-abandon`, `splits-panel`.

- [ ] **Step 1: Write the failing tests**

```ts
it('shows the next boss, starts it, and shows progress and time left', async () => {
  // fresh app, closeIntro, addDebugMoney(T(1)): boss-card contains 'Zero-Hours Walkout' and its twistText
  // click boss-start: card shows a progress bar and 'left'
})
it('shows splits against best with ahead/behind deltas', async () => {})
it('retire button reads Retire for +N from depth and is disabled at depth 0', async () => {})
it('marks corked tastings on the event card', async () => {})
it('never shows the word steamroll', () => {
  // mount App and every component; expect wrapper.html().toLowerCase() not to contain 'steamroll'
})
```

- [ ] **Step 2: Run to see them fail, implement**

`BossCard` sits under the hero header: title, blurb, twist and condition text, the target, then a Start button (available), progress bar plus time left plus Abandon (active), cooldown time (cooldown), or net worth progress to the gate (locked). Show last and best kill time once a boss has been killed. `SplitsPanel` lists gates reached this generation with current, best and a coloured delta (ahead green, behind red using existing tokens). The HeroHeader lifetime Legacy bar becomes "Deepest gate this generation" plus progress to the next gate. `OverviewBar` retire reads `Retire for +{legacyOnRetire}` and is disabled at 0. `ConfirmModal` retire shows deepest gate and Legacy from depth, and drops the lifetime-earnings progress line. Rewrite intro page 4 for bosses and depth-based Legacy (no "£450B"). Layout must work at 375px wide.

- [ ] **Step 3: Run tests, check in the browser**

Run: `npm test && npx vue-tsc --noEmit`. Then start the dev server, reset the game, and play gate 1 to a win and a loss at 375px and desktop widths: boss card states, twist visibly applied and removed, splits panel, retire button.

- [ ] **Step 4: Commit and push**

### Task 8: Pacing simulator and tuning

**Files:**
- Create: `sim/bot.ts`, `sim/pacing.sim.ts`, `vitest.sim.config.ts`
- Modify: `package.json` (script `"sim": "vitest run --config vitest.sim.config.ts"`), `src/data/bosses.ts` (tuned numbers)

**Interfaces:**
- Consumes: the store's public API only (the bot is a player, not a game feature).
- Produces:

```ts
export interface BotConfig { clicksPerSec: number; decideEverySec: number; stallMinutes: number }
export const HUMAN_PACE: BotConfig // { clicksPerSec: 4, decideEverySec: 2, stallMinutes: 10 }
export interface GenerationResult {
  generation: number; activeMinutes: number; deepestGate: number
  splitsMs: (number | null)[]; killMs: (number | null)[]
  netWorthAt10Min: number; legacyEarned: number; cumulativeActiveMs: number
}
export function runCampaign(hours: number, cfg?: BotConfig): GenerationResult[]
```

The bot drives a fresh pinia store with synthetic timestamps (1s ticks, clicks spread within each second). It buys the visible item with the best income gain per pound (its own calculation from `itemIncomeDelta` and `itemQuote`), buys perks cheapest-first among Interns, Grindset Coaching and Light-Touch Regulation, starts a boss as soon as it is available, and retires when it has beaten at least one gate and has not beaten a new gate in `stallMinutes`.

- [ ] **Step 1: Write the assertions**

```ts
const gens = runCampaign(20)
const firstKill = (gate: number) => gens.find((g) => g.splitsMs[gate] !== null)
it('generation 1 beats gate 3 within 30 to 45 minutes', () => {
  const t = gens[0].splitsMs[3]!
  expect(t / 60_000).toBeGreaterThanOrEqual(30)
  expect(t / 60_000).toBeLessThanOrEqual(45)
})
it('generation 2 reaches generation 1 depth at least 20% sooner', () => {
  const d = gens[0].deepestGate
  expect(gens[1].splitsMs[d]!).toBeLessThanOrEqual(0.8 * gens[0].splitsMs[d]!)
})
it('generation 2 is well ahead at the 10-minute mark', () => {
  expect(gens[1].netWorthAt10Min).toBeGreaterThanOrEqual(2 * gens[0].netWorthAt10Min)
})
it('first gate 6 kill lands between hours 5 and 6', () => {})
it('first gate 9 kill lands between hours 15 and 20', () => {})
it('a boss first killed in generation N dies within 5 seconds by generation N+3', () => {})
```

The gate 6 and gate 9 tests compute cumulative active hours from `cumulativeActiveMs` at the generation where `firstKill` happens plus that split.

- [ ] **Step 2: Run the simulator**

Run: `npm run sim`
Expected at first: some assertions fail. `npm test` must not pick up `sim/` (check `vitest.config` include stays `tests/**`).

- [ ] **Step 3: Tune until every assertion passes**

Adjust only `src/data/bosses.ts` (targets, par, time limits, cooldowns, `legacyReward`) and, if the spec's pacing can't be met that way, the Legacy multiplier or trust fund share, saying why in the commit message. Keep the Task 3 test that one more gate beats repeating a depth twice.

Expect the Legacy multiplier to need retuning: depth rewards that double per gate, compounded at x1.5 per point, push income past `Number.MAX_VALUE` within a long campaign. Add a campaign assertion that `moneyPerSecond` and `money` stay finite throughout, and lower the per-point ratio (or make it linear) until it holds alongside the pacing assertions.

- [ ] **Step 4: Run everything, commit and push**

Run: `npm test && npx vue-tsc --noEmit && npm run sim`
Expected: all pass. Commit message records the runtime of `npm run sim` and the final tuned numbers.
