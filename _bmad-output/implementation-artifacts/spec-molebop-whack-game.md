---
title: 'Molebop: whack-the-mole arcade game'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_revision: 'aa17088d9fbcf0b181a4a3efb44711527dfd43eb'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md does not cover Molebop: it still says five games, has no molebop.html / test-molebop.mjs sections, and its test command and DOM-game notes leave Molebop out.
    evidence: |-
      Review pass 1 (blind-hunter, verification-gap). CODEBASE_MAP is an agent-context doc linked from CLAUDE.md, so the fix is deferred; a cartographer re-map refreshes it, as after Minefield.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no reflex/whack game. The user wants one in a single HTML file: a 3x3 field of holes, a mole up in a random hole for 700-1200 ms, +1 for a mole and -1 (floor 0) for an empty hole, a 30 s round with a visible countdown, faster spawns in the last 10 s, an end screen with score and a `localStorage` best, and a Start button. Stretch: a golden mole worth 5 and a bomb mole that ends the round.

**Approach:** Add `molebop.html` under the original name "Molebop" (the rules are the generic genre; no existing product's name or look), plus `test-molebop.mjs` driving it through `harness.mjs`. It is a DOM game with a clock, like `minefield.html`: nine `<button>` holes, `step(dt)` and a rAF loop run the timers, and `render()` runs from the loop only when what it shows changes.

## Boundaries & Constraints

**Always:** the repo's shared shape (one bare `<script>`, top-level `let` state, `reset()`, `step(dt)`, read-only `render()`, `onKey(e)` on `e.code`, `document.addEventListener` for input, rAF `frame` with dt capped at 100 ms). Phases `ready` → `playing` → `over`; Start (button, or Space/Enter while not playing) begins a fresh round from `ready` or `over`. Rules: up time `700 + rand*500` ms; a new pop every 800 ms (first one 500 ms after Start), every 450 ms once time left ≤ 10 s, into a random empty hole (skipped if none is empty), so several moles can be up at once. Kind per pop: golden 10%, bomb 10%, normal 80%. Hits: normal +1, golden +5, bomb ends the round at the current score; a hit empties the hole. Empty hole: -1, never below 0. Countdown shows `ceil(timeLeft/1000)`, 30 at start. Best = max(best, score), read and written in `localStorage` key `molebop-best` inside try/catch (blocked/junk storage → 0). Each hole has an `aria-label` (Hole N, empty / mole / golden mole / bomb); golden and bomb differ from a normal mole by a glyph, not only colour. Holes reuse one element each; `render()` writes only changed text/attributes.

**Never:** canvas, `setInterval`, audio, images, external assets, dependencies; input on holes outside `playing` (no penalty, no score); saving anything but the best score; difficulty levels, pause, combos or sound.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hit mole | playing, hole 4 has a normal mole | score +1, hole 4 empty | No error expected |
| Hit golden | hole has golden mole | score +5, hole empty | No error expected |
| Miss | playing, empty hole, score 0 | score stays 0 | floor at 0 |
| Hit bomb | hole has bomb, score 7 | phase `over`, reason bomb, score 7, best updated, holes cleared | No error expected |
| Time up | timeLeft reaches 0 | phase `over`, reason time, holes cleared, best saved | No error expected |
| Mole expires | up time elapses untouched | hole empties, no score change | No error expected |
| Full field | 9 holes up when a pop is due | pop skipped, timer restarts | No error expected |
| Input not playing | `ready`/`over`, tap a hole | nothing changes | ignored |
| Storage | `getItem` throws / returns junk | best 0, game still loads and plays | try/catch |

</intent-contract>

## Code Map

- `minefield.html` -- closest shape: DOM buttons + rAF clock; copy `setText`, `$`, change-only `render()`, `frame` with 100 ms cap and render-on-change, `pointerdown` + keyboard click (`e.detail === 0`) handling, page styling conventions (`.box` score boxes, header).
- `twofold.html:192-222` -- best-score pattern: `BEST_KEY`, try/catch load, save when beaten.
- `harness.mjs` -- `load(file, globals)`; pass `document`, `Math`, `localStorage`, `requestAnimationFrame` stubs through `globals`.
- `test-minefield.mjs:430-485` -- `makeDoc()` DOM stub (persistent ids, `createElement`, `appendChild`, attribute/text write counters) and `stubMath` for `Math.random`; reuse its approach.
- `test-twofold.mjs:455-480` -- `memStorage` / junk / throwing `localStorage` tests to mirror.
- `README.md`, `CLAUDE.md` -- game table, play links, test command, "Currently five" list: add Molebop.

## Tasks & Acceptance

**Execution:**
- `molebop.html` -- build the game per the contract: header (title, Score, Time, Best boxes), 3x3 `#field` of hole buttons with a mole child each (CSS slide-up transition), an overlay `#panel` with message text and `#start` button, `aria-live="polite"` `#status` for round-end text, hint line; keys: Space/Enter start, Digit1-9 whack holes in reading order, Numpad1-9 in numpad layout (Numpad7 = top-left); modified/repeat keys ignored -- the deliverable.
- `test-molebop.mjs` -- assert the I/O matrix, spawn timing (500 ms first pop, 800/450 ms intervals, switch at 10 s left), up-time bounds (rand 0 → 700 ms, rand→1 → <1200 ms), kind rolls, countdown text, render reuse/change-only writes, rAF cap, keys, storage cases, page constraints (one script, no canvas/setInterval/audio/src=) -- the repo's self-check.
- `README.md`, `CLAUDE.md` -- add Molebop to game lists, controls section, play link and test command -- keep docs in step.

**Acceptance Criteria:**
- Given the page opens, when nothing is pressed, then a `ready` panel with a Start button shows, Time reads 30, Score 0, Best the saved best, and no mole is up.
- Given a round is playing, when 30 s of `step` time pass, then the end panel shows the final score and best, and Start begins a new round with score 0 and Time 30.
- Given time left is 10 s or less, when moles pop, then pops come every 450 ms instead of 800 ms.
- Given a best of 12 in storage, when a round ends at 15, then storage holds 15 and Best shows 15; ending at 9 leaves 12.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 23 findings — high 0, medium 1, low 15, false 3, maybe-false 4
- findings:
  - `[low]` `[defer]` CODEBASE_MAP.md not updated for Molebop (blind-hunter) — agent-context doc; deferred to a cartographer re-map.
  - `[low]` `[patch]` README has no browser-compat line, though holes rely on `aspect-ratio` (blind-hunter) — patched: README line naming `inert`, `aspect-ratio`, `inset`, `min()`/`clamp()`, `?.`, binding-less `catch`.
  - `[medium]` `[patch]` Holes focusable and announced outside a round; Tab walks 9 dead holes before Start (blind-hunter) — patched: `render()` sets `fieldEl.inert = phase !== 'playing'` (change-only); tested in ready/over/playing.
  - `[low]` `[patch]` `aria-label` on `#field` ignored without a role (blind-hunter) — patched: `role="group"`.
  - `[low]` `[reject]` Speed-up starts at the first pop after the 10 s mark (9.5 s left), not exactly at 10 s; test mirrors the formula (blind-hunter) — real but a ≤350 ms shift nobody feels; the fix adds a clamp branch.
  - `[low]` `[reject]` No hit/miss feedback; a tap on a mole sliding down costs −1 (blind-hunter) — feedback is a feature not asked for; the slide is 120 ms; a grace state adds complexity.
  - `[low]` `[reject]` Space mid-round not prevented, may scroll a short window (blind-hunter) — rare (content fits most windows); the fix needs a focus-aware branch so Space on a focused hole still whacks.
  - `[low]` `[reject]` Stored best of 'Infinity', negative or fractional shown as-is (blind-hunter) — only reachable by hand-editing storage; the fix adds guards; same as Twofold.
  - `[low]` `[patch]` Test gaps: NumpadEnter start, Start click from `over`, non-hole targets, reused `g` in kind-roll tests (blind-hunter) — patched the first two (grouped with the NumpadEnter gap below); non-hole targets and the reused `g` are harmless, since `pop()` is a pure helper.
  - `[false]` `[reject]` Key `molebop-best` breaks Twofold's `twofoldBest` naming (blind-hunter) — the key is set by the spec (fix would edit the spec), and Snake already uses its own name; no harm.
  - `[low]` `[patch]` Held Enter/Space on a focused hole fires repeated native keyboard clicks that whack it again and again (edge-case) — patched: onKey calls `preventDefault()` on repeat Space/Enter/NumpadEnter before returning; tested.
  - `[low]` `[patch]` Held Enter from `over` starts a round, then its repeats click the focused hole (edge-case) — same root cause as above; same patch, plus `inert` drops hole focus outside play.
  - `[low]` `[reject]` Stored best Infinity/negative/fractional (edge-case) — same as the blind-hunter row: hand-edited storage only.
  - `[low]` `[reject]` Two tabs: a stale lower best can overwrite a higher one (edge-case) — needs two tabs playing at once; the fix adds a re-read guard.
  - `[low]` `[patch]` Claim "modified/repeat keys ignored" vs native button clicks (edge-case) — the repeat part is fixed by the repeat patch; Shift+Enter on a focused Start starting a round is harmless.
  - `[low]` `[patch]` NumpadEnter start path untested (verification-gap) — patched: test that NumpadEnter starts a round and is prevented once.
  - `[false]` `[reject]` Mole taps rely on `.mole { pointer-events: none }`; tests pass the hole as target (verification-gap) — the CSS is there, so taps land on the hole button; a regression-only risk, not a defect.
  - `[low]` `[defer]` CODEBASE_MAP.md stale (verification-gap) — same as the first row; deferred.
  - `[false]` `[reject]` Named Molebop, not Whack-a-mole (intent-alignment) — deliberate: repo rule against recreating a product's name; the rules are the generic genre.
  - `[maybe-false]` `[reject]` Several moles up at once vs one at a time (intent-alignment) — "spawn rate speeds up" implies a spawn clock apart from mole lifetime; with one mole at a time a faster spawn rate would barely show. Settled only by asking the user; if wrong, low.
  - `[maybe-false]` `[reject]` A click on a mole still visibly sliding down scores −1 (intent-alignment) — same as the feedback row; would only be low.
  - `[maybe-false]` `[reject]` Scores on press, not on click (intent-alignment) — deliberate for a reflex game; a click still lands as one whack. Would only be low.
  - `[maybe-false]` `[reject]` Tests run on a stub DOM, not a real browser (intent-alignment) — partly settled: headless Chrome screenshots of the ready panel and a mid-round field (mole, ★ golden, ✸ bomb) render as intended; real taps and reload persistence not exercised. Would be low.

## Verification

**Commands:**
- `node test-molebop.mjs` -- expected: prints `all molebop tests passed`, exit 0.
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs` -- expected: all pass.

**Manual checks (if no CLI):**
- Open `molebop.html`: moles slide up/down, golden ★ and bomb ✸ are distinct, countdown ticks, end panel shows score and best.

## Auto Run Result

Status: done

**Summary:** Added Molebop, an original 30 s whack-the-mole game: a 3x3 field of `<button>` holes with CSS-sliding moles, a rAF clock, pops every 800 ms (450 ms in the last 10 s) that stay up for 700-1200 ms, +1 / +5 golden / bomb ends the round, −1 for an empty hole (floor 0), Start/end panel and a `localStorage` best. Keys 1-9 and numpad whack holes; Space/Enter start.

**Files changed:**
- `molebop.html` -- the game.
- `test-molebop.mjs` -- node:vm self-check for every rule and edge case in the spec.
- `README.md` -- Molebop row, play link, controls section, browser-compat line, test command.
- `CLAUDE.md` -- six games, Molebop in the stack and DOM-with-clock notes, test command.
- `_bmad-output/implementation-artifacts/spec-molebop-whack-game.md` -- this spec.

**Review findings:** 23 total. Patched 8 rows in 5 fixes (1 medium: holes `inert` outside play; low: `role="group"`, repeat Space/Enter prevented, NumpadEnter and Start-from-over tests, README compat line). Deferred 2 rows (CODEBASE_MAP refresh). Rejected 13: speed-up 350 ms late (unfelt, adds a branch); no hit feedback / sliding-mole −1 (not asked, 120 ms window); Space scroll mid-round (rare, needs focus branch); unchecked stored best ×2 (hand-edited storage only); two-tab stale best (rare, adds guard); key naming (set by spec); pointer-events reliance (works, regression-only); name Molebop (repo rule); several moles at once (fits "spawn rate"); press vs click (deliberate); stub-DOM tests (headless screenshots render correctly).

**Follow-up review recommendation:** false — patched by verdict: high 0, medium 1, low 7 (rows; 4 low fixes).

**Verification:** `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs` -- all pass. Headless Chrome screenshots: ready panel with Start, and a mid-round field showing a mole, a ★ golden mole and a ✸ bomb, render as intended.

**Residual risks:** Real taps, the slide animation and reload persistence were not exercised in a browser. docs/CODEBASE_MAP.md does not cover Molebop yet (deferred).
