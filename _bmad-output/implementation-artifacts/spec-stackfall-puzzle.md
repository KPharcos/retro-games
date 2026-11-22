---
title: 'Stackfall: original falling-blocks puzzle'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_revision: 'e52916eaf218b6e5194342eeea11bfe090a907df'
review_loop_iteration: 0
followup_review_recommended: false
followup_pass: true
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md drift after Stackfall: the spec tree line says in-progress, total_tokens and last_mapped are stale, Stackfall's layout row does not say keyboard only, and Gotchas has no Stackfall entries (the missing floor kick, the I-piece wall limit, the real RNG in some tests).
    evidence: |-
      Review pass 1 (blind-hunter). The map is cartographer output linked from CLAUDE.md, so the fix edits an agent-context doc; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      gapwing.html and snake.html canvas rule has the same 2 px border past max-width 100%, so under about 404 px (Gapwing) and 404 px (Snake) the page scrolls sideways.
    evidence: |-
      Follow-up 2 edge-case review of stackfall.html. Stackfall fixed its own copy with box-sizing: border-box; the two older games share the rule and predate this change, so their fix is deferred.
    location: >-
      gapwing.html, snake.html
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has Gapwing and Snake but no falling-blocks puzzle. The user wants one in a single HTML file with canvas, under an original name and palette: 10x20 board, the seven four-cell shapes, a 7-bag, simple wall kicks, gravity that speeds up every 10 lines, a next preview, line-clear scoring, a 500 ms lock delay, and hold and ghost as stretch goals.

**Approach:** Add `stackfall.html` in the repo's shared testable shape, plus `test-stackfall.mjs` driving it through `harness.mjs`. All timing (gravity, lock delay) runs in `step(dt)`.

## Boundaries & Constraints

**Always:**
- One self-contained HTML file, vanilla JS, inline CSS, exactly one bare `<script>`. Original name "Stackfall" and an original seven-colour palette. Canvas holds the 10x20 board (30 px cells) plus a side panel for next and hold.
- Shared shape: top-level `let` state, `reset()`, `step(dt)` (ms), read-only `render()`, `onKey(e)` on `e.code` via `document.addEventListener('keydown', …)`, rAF `frame` loop with dt capped at 100 ms.
- Shapes: I, O, T, S, Z, J, L as 4-cell matrices, rotated clockwise in their own box. Pieces spawn horizontally centred (column 3 for 4-wide boxes, column 4 for O) in the top rows.
- 7-bag: each run of 7 spawns contains every shape exactly once, order shuffled with `Math.random`.
- Controls: ← → move one column; ↑ rotates clockwise, trying offsets x, x-1, x+1 in that order and keeping the piece in place if all collide; ↓ soft drop (one row per keydown); Space hard drop (to the lowest legal row, lock at once). C or Shift holds. R restarts after game over. Rotate, hard drop and hold ignore key repeat; move and soft drop accept it.
- Gravity: level = 1 + floor(lines / 10). Fall interval = max(50, round(1000 · 0.8^(level-1))) ms.
- Lock delay: when the piece cannot move down, a 500 ms timer runs and the piece locks when it expires. The timer resets only when the piece moves down a row (so sliding or rotating on the floor does not stall forever).
- Locking writes the piece into the board, clears every full row, adds lines, and scores 100 / 300 / 500 / 800 × level for 1 / 2 / 3 / 4 rows, using the level before the clear. Then the next piece spawns.
- Game over when a newly spawned piece collides. While over, only R acts.
- Next preview shows the next piece. Hold (stretch): swaps the current piece with the held one (first hold takes the next piece); only once per piece until it locks. Ghost (stretch): outline of where a hard drop would land.
- Arrow keys and Space call `preventDefault`; other keys are untouched.
- A11y: canvas `role="img"` with an `aria-label`; an `aria-live="polite"` status line that changes only when its text changes (game over, level up).

**Never:**
- The name or trademarked look of any existing game, external assets, dependencies, `setInterval`, sound, menus, high-score storage, counter-clockwise rotation, extended kick tables.
- Editing `harness.mjs`, `gapwing.html` or `snake.html`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bag | first 14 spawns | each group of 7 contains all seven shapes | none |
| Move | ← / → with room | piece shifts one column | blocked by wall or stack: no move |
| Rotate | ↑ with room | piece rotates clockwise in place | none |
| Wall kick | ↑ against a wall or stack, x-1 or x+1 free | rotates and shifts by that offset (x-1 tried first) | all three collide: no rotation |
| Soft drop | ↓ | piece moves down one row | resting: no move, lock timer keeps running |
| Hard drop | Space | piece moves to the ghost row and locks at once | repeat ignored |
| Gravity | level 1, `step(999)` then `step(1)` | no fall, then one row | none |
| Level speed | lines 10 | level 2, interval 800 ms | floor at 50 ms |
| Lock delay | piece resting, `step(499)` then `step(1)` | not locked, then locked | moving down a row resets the timer |
| Floor stall | piece resting, move left/right or rotate repeatedly | still locks 500 ms after it first rested | none |
| Line clear | 1/2/3/4 full rows on lock | rows removed, rows above drop, +100/300/500/800 × level | none |
| Next | any spawn | preview shows the piece that spawns next | none |
| Hold | C/Shift, first time | current goes to hold, next piece spawns | second hold before lock ignored |
| Hold swap | C/Shift with a held piece | current and held swap; held piece respawns at the top | none |
| Ghost | any time | ghost drawn at the hard-drop row | none |
| Game over | spawn collides | game over shown; only R acts | other keys ignored |
| Restart | over, R | fresh `reset()` state: empty board, score 0, lines 0, level 1 | none |
| Scroll | Arrow keys, Space | `preventDefault` | other keys untouched |

</intent-contract>

## Code Map

- `snake.html` -- the newer template: constants at top, `reset`/`step`/`render`, `onKey` with `Object.hasOwn` lookups and `String(e.code)` guards, capped rAF `frame`, `setText` (writes only on change) for an `aria-live` `#status`, canvas `role="img"`, `min-height: 100vh` body.
- `harness.mjs` -- `load(file, globals)`; `run(code)` reaches top-level `let`s; `key(code, repeat)` fires keydown; `texts` collects `fillText` strings. Pass a `Math` stub as `Object.assign(Object.create(Math), { random })` (spreading `Math` gives an empty object). Default `getElementById` accepts any id.
- `test-snake.mjs` -- style reference for the new test, including the id-check `document` stub and the rAF wiring test.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- list the games and test command; add Stackfall.

## Tasks & Acceptance

**Execution:**
- `stackfall.html` -- create the game per the intent contract -- the feature.
- `test-stackfall.mjs` -- assert every I/O matrix row via `harness.mjs` -- repo convention, guards the rules.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- add the game, its controls and `node test-stackfall.mjs` to the test command -- keep docs true.

**Acceptance Criteria:**
- Given the page opens, when nothing is pressed, then a piece falls at level-1 speed and the score, lines, level and next piece are shown.
- Given a game over, when the status line updates, then it announces the end and the restart key once.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 29 findings — high 0, medium 3, low 24, false 2, maybe-false 0
- findings:
  - `[low]` `[patch]` Floor-stall rotation never succeeds in the test, so a rotate-resets-lock bug passes (verification) — patched: a resting T rotates in place and still locks 500 ms after first resting.
  - `[low]` `[patch]` First hold: nothing checks that nextK advances; `spawn(holdK || nextK)` passes and breaks the bag (verification) — patched: post-hold nextK is saved and must spawn after the lock.
  - `[low]` `[patch]` Next and Hold boxes are not checked; wrong piece or no grey-out passes (verification) — patched: recording canvas checks Next cells = SHAPES[nextK], Hold cells = SHAPES[holdK], `#555` while canHold is false. Grouped with the blind-hunter grey-hold row.
  - `[low]` `[reject]` Ghost hidden while over is untested (verification) — cosmetic and not in the spec.
  - `[low]` `[reject]` No CI workflow (verification) — unchanged repo convention; tests run by hand.
  - `[low]` `[patch]` An upright I flush against the left wall cannot rotate, while the right-wall case can (intent) — the kicks are the intent's literal x-1, x+1. Patched: README documents it. Grouped with the blind-hunter row.
  - `[low]` `[reject]` Soft drop and side moves use OS key repeat, not game-timed auto-repeat (intent) — spec choice, matches the intent's one-step wording.
  - `[low]` `[reject]` Lock delay resets only on falling, not on moves (intent) — spec choice that prevents infinite stalls; README documents it.
  - `[low]` `[reject]` Scoring uses the level before the clear (intent) — spec choice; the intent does not settle it.
  - `[low]` `[reject]` Palette originality is not asserted (intent) — judged by reading the colours; not testable meaningfully.
  - `[low]` `[reject]` Panel layout, contrast and scaling are not tested (intent) — logic-layer harness by repo convention.
  - `[false]` `[reject]` Gravity curve 0.8^n with a 50 ms floor is not from the intent (intent) — the intent fixes only the cadence (every 10 lines); the curve is a documented spec choice, no defect.
  - `[low]` `[reject]` No real-browser check (intent) — repo has no browser harness; residual risk.
  - `[low]` `[patch]` I-piece left/right wall asymmetry (blind-hunter) — grouped with the intent row; patched by the README note.
  - `[medium]` `[patch]` `dropAcc` is never cleared when a fall fails or after a soft drop, so a piece drops at once after sliding off a ledge and a soft drop can be followed straight away by a gravity drop (blind-hunter) — patched: dropAcc clears on a successful soft drop, when the piece lands, and while it rests; two tests cover it.
  - `[false]` `[reject]` Spec file not in the change set (blind-hunter) — the spec is excluded from the reviewed diff by design and committed at finalize.
  - `[low]` `[defer]` Map tree line says the spec is in-progress (blind-hunter) — fix edits CODEBASE_MAP; deferred.
  - `[low]` `[defer]` Map frontmatter total_tokens and last_mapped are stale (blind-hunter) — deferred with the map drift.
  - `[low]` `[reject]` No pause key and no pause on blur (blind-hunter) — not asked for; same call as Gapwing.
  - `[low]` `[defer]` Map layout row does not say keyboard only (blind-hunter) — deferred with the map drift.
  - `[low]` `[patch]` Bag-order test only compares two random values and never checks the refill (blind-hunter) — patched: with Math.random pinned, exact first 7 at both extremes, and pieces 8-14 are all seven shapes.
  - `[low]` `[patch]` Game-over screen draws the blocked spawn piece over the stack (blind-hunter) — patched: the active piece is not drawn while over; tested.
  - `[low]` `[reject]` Next and Hold previews are not centred by filled bounds (blind-hunter) — cosmetic; more than a direct correction.
  - `[low]` `[patch]` Greyed Hold colour is untested (blind-hunter) — grouped with the verification side-panel row; patched there.
  - `[low]` `[patch]` A hold whose swapped-in piece is blocked at spawn is untested (blind-hunter) — patched: test asserts game over.
  - `[low]` `[reject]` A mid-step landing starts the lock timer at 0, dropping that frame's leftover dt (blind-hunter) — intended and pinned by a test; at most one frame of slack.
  - `[medium]` `[patch]` Second gravity move fails inside the loop, leaving dropAcc full, so the piece drops instantly after sliding off a ledge (edge) — grouped with the blind-hunter dropAcc row; patched there.
  - `[medium]` `[patch]` Soft drop leaves dropAcc unchanged, so gravity can add a second row right after it (edge) — grouped with the blind-hunter dropAcc row; patched there.
  - `[low]` `[reject]` Ctrl/Meta/Alt chords trigger game keys (edge) — same call as Gapwing and Snake.

### 2026-11-22 — Review pass (follow-up)
- verdicts: 28 findings — high 0, medium 0, low 23, false 5, maybe-false 0
- findings:
  - `[low]` `[patch]` Pieces resting flat on the floor or a flat stack cannot rotate, since kicks only go sideways (blind-hunter) — grouped with the edge row. The behaviour fix (an upward kick) is rejected: the spec's Never list excludes extended kick tables and the intent names x-1, x+1 only. Patched: README states the limit.
  - `[low]` `[patch]` README says an I against the right wall can rotate, which is wrong (blind-hunter) — verified by probe: left wall fails at x=-2 and right wall at x=8, one vertical position each. Grouped with the edge row. Patched: README corrected.
  - `[low]` `[reject]` carried — Ctrl/Meta/Alt chords trigger game keys (blind-hunter). Same as the pass-1 row.
  - `[low]` `[defer]` carried — map spec tree line says in-progress, frontmatter totals stale (blind-hunter). Already in `deferred`.
  - `[low]` `[patch]` README scoring and input rules are incomplete (blind-hunter) — patched: level before the clear, drops score nothing, which keys repeat.
  - `[low]` `[reject]` carried — no pause and no pause on blur (blind-hunter). Same as the pass-1 row; the README now says there is no pause.
  - `[low]` `[reject]` Tests depend on unpinned Math.random (blind-hunter) — 150 of 150 runs pass; the random-dependent asserts stay inside one bag, where consecutive shapes differ.
  - `[low]` `[reject]` Accessibility is thin: the status carries only level and game over (blind-hunter) — the spec's A11y clause defines the status text; touch input is not required.
  - `[low]` `[defer]` Map Gotchas has no Stackfall entries (blind-hunter) — the fix edits CODEBASE_MAP; folded into the map drift item in `deferred`.
  - `[low]` `[patch]` A flat resting piece cannot rotate (edge) — grouped with the blind-hunter row. Upward kick rejected as spec-excluded; README note patched.
  - `[low]` `[reject]` Lock timer pauses while the piece hovers after sliding off a ledge, and dropAcc resets on each resting frame; a probe stalled the lock about 30.8 s (edge) — the spec defines the timer as running only while the piece cannot fall; the stall is bounded by 500 ms of total resting time and needs deliberate ledge shuffling.
  - `[low]` `[patch]` README right-wall claim is wrong (edge) — grouped with the blind-hunter row; patched there.
  - `[low]` `[patch]` "Each run of 7 spawns contains every shape once" overstates: windows across two bags and held pieces can repeat a shape (edge) — patched: README bag sentence reworded.
  - `[low]` `[patch]` spawn() clearing dropAcc and lockTimer is unpinned; deleting the line passes (verification) — patched: tests for hard drop and hold with stale timers.
  - `[low]` `[patch]` The dropAcc reset on the resting branch of step() is unpinned (verification) — patched: sideways slide onto a ledge, then off, needs a full interval.
  - `[low]` `[patch]` Refilled rows after a multi-row clear could share one array and no test would notice (verification) — patched: a T locked into the refilled rows fills only its own cells.
  - `[low]` `[patch]` The live piece's drawn position is not asserted (verification) — patched: fillRect origins match the piece's own cells, not the ghost row.
  - `[low]` `[patch]` The first-frame guard in frame() is untested (verification) — patched: a first frame at t=1000 does not step. The reviewer suggested defer, but the guard is new code in this change.
  - `[false]` `[reject]` Spec log claim "removing every reset fails the suite" is false (verification) — refutation: removing all the resets does fail the suite (checked); each single reset was unpinned, which the two rows above fix.
  - `[low]` `[reject]` carried — tests drive internals through a stub; no real browser, pixels or screen reader (intent). Same as the pass-1 rows.
  - `[false]` `[reject]` carried — docs edited beyond the named files; spec not in the diff (intent). Same as the pass-1 rows.
  - `[low]` `[reject]` Lock timer pauses while airborne; a probe locked 900 ms after first rest (intent) — same as the edge row; spec-defined and bounded.
  - `[false]` `[reject]` Tests pin behaviours the intent does not state: dropAcc resets, ghost hidden while over, panel Score/Lines/Level, `Level N.` status (intent) — documented spec choices; no defect.
  - `[low]` `[patch]` carried — the I-piece wall kick limit (intent). Same as the pass-1 row; the README note it produced was wrong for the right wall and is corrected under the blind-hunter and edge rows.
  - `[false]` `[reject]` preventDefault is applied to arrows and Space even while over (intent) — matches the spec and is pinned by a test.
  - `[false]` `[reject]` The status reads `Level N.` from the first render (intent) — satisfies "changes only when its text changes".
  - `[low]` `[patch]` Bag counting versus hold respawns is ambiguous (intent) — grouped with the edge bag row; patched there.
  - `[low]` `[reject]` carried — modifier combinations and real key events are not exercised (intent). Same as the Ctrl/Meta/Alt row.

### 2026-11-22 — Review pass (follow-up 2)
- verdicts: 35 findings — high 0, medium 0, low 33, false 2, maybe-false 0
- findings:
  - `[low]` `[reject]` carried — Ctrl, Meta or Alt chords reach game keys, so Alt+Left is blocked and Ctrl+C holds (blind-hunter). Same as the pass-1 Stackfall modifier row; the same decision was made for Gapwing and Snake.
  - `[low]` `[patch]` O (#81b29a) and L (#9ccf5a) are both green and hard to tell apart (blind-hunter) — patched: L changed to royal blue #4c5ae6; all seven hues checked distinct, closest pair unchanged from the palette already in use.
  - `[low]` `[reject]` Canvas has no aria-describedby to the hint, and hold-used is shown only as a grey box (blind-hunter). Same as the pass-1 accessibility row; the spec's A11y clause defines the status text.
  - `[low]` `[patch]` carried — no upward kick, so a flat piece cannot rotate (blind-hunter). Same as the pass-2 rows; the README note is already in place. Open question for the user: whether to add an upward kick.
  - `[low]` `[reject]` Canvas is not devicePixelRatio-scaled and looks soft on HiDPI screens (blind-hunter) — cosmetic; the fix changes markup and a pinned width assert, more than a direct correction; same call as Gapwing and Snake.
  - `[low]` `[patch]` Test message "four turns is not identity" sits on an assert that checks identity (blind-hunter) — patched: message now says "four turns return to start".
  - `[low]` `[patch]` over is set before the "other keys untouched" loop, so KeyR runs reset() inside the check and the loop never runs mid-game (blind-hunter) — patched: reset before the loop.
  - `[low]` `[patch]` No asserts pin the README rotation limits, so they can drift silently (blind-hunter) — patched: flat T on the floor cannot rotate; upright I at x=-2 and at x=8 cannot rotate; two rotating cases included.
  - `[low]` `[patch]` README says "locks 500 ms after it lands", but the timer keeps its value while the piece is airborne (blind-hunter) — patched: README states total resting time since the last fall, air time excluded; a test pins the air-time pause.
  - `[low]` `[patch]` README interval formula omits round (blind-hunter) — patched: round added.
  - `[low]` `[patch]` README never explains "ghost" (blind-hunter) — patched: one sentence added.
  - `[low]` `[patch]` README does not say that no high score is kept (blind-hunter) — patched: "There is no high score; nothing is saved between runs."
  - `[low]` `[reject]` README Play link is dead until merge and GitHub Pages rebuild (blind-hunter) — post-merge check; recorded as a residual risk.
  - `[low]` `[defer]` carried — map spec tree line says in-progress (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — map last_mapped and total_tokens are stale (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — map Gotchas has no Stackfall entries (blind-hunter). Already in `deferred`.
  - `[low]` `[reject]` carried — Ctrl, Meta or Alt chords reach game keys (edge). Same as the blind-hunter row above.
  - `[low]` `[reject]` Holding R at game over restarts before the game-over screen shows (edge). Same reasoning as the Snake held-Space rows: the intent names key repeat for some keys only, and a held restart key is the player's choice.
  - `[low]` `[patch]` The canvas border adds 4 px past max-width 100%, so under about 454 px the page scrolls sideways (edge) — patched: box-sizing: border-box on the canvas. Gapwing and Snake share the rule and are deferred as a new item.
  - `[false]` `[reject]` getContext('2d') returning null would throw and stop the loop (edge) — refutation: getContext('2d') on a fresh canvas does not return null in any browser that runs the page; no throwing path was shown. Same call as the Snake row.
  - `[low]` `[patch]` HUD Score, Lines and Level are never checked during play (verification) — patched: panel text checked after a clear and a level-up, and the overlay score on game over.
  - `[low]` `[patch]` Soft-drop score is never asserted (verification) — patched: score stays 0 after ArrowDown presses.
  - `[low]` `[patch]` Hold queue effects are only partly asserted (verification) — patched: the first hold advances the queue exactly once and a swap leaves nextK and the bag unchanged. Checked with three real mutants (no advance, extra take, swap advances): all caught.
  - `[low]` `[patch]` Ghost outline while game over is not asserted (verification) — patched: no strokeRect on the game-over screen. The spec's triage log said this was pinned; it was not, and this patch makes it true.
  - `[low]` `[patch]` The dt cap is pinned only to the 100–149 ms range (verification) — patched: a 120 ms stall adds exactly 100 ms of lock time. A 110 ms cap mutant is caught.
  - `[low]` `[patch]` The comment about the floor-rotation test is wrong (verification) — patched: the blocked ArrowUp is described as blocked; the successful rotation is in the next block.
  - `[low]` `[patch]` Sideways landing can lock early, which the README did not say (intent) — same README claim as the blind-hunter lock row; patched there.
  - `[low]` `[patch]` Canvas Score, Lines and Level are not checked by value (intent) — same as the verification HUD row; patched there.
  - `[low]` `[reject]` "Every 10 lines" is tested as the interval table rather than as observed fall speed (intent) — the table is the spec's rule; observed speed needs a browser, which this repo does not drive.
  - `[low]` `[reject]` The dt cap means a slow frame or a resumed tab advances game time by at most 100 ms (intent) — spec-defined cap; intended.
  - `[low]` `[reject]` The 7-bag is not kept under hold, since hold respawns bypass it (intent) — the intent is silent on hold; the spec and the README document it.
  - `[low]` `[reject]` Keys in tests are synthetic: OS auto-repeat and real page scroll are not exercised (intent) — same as the pass-1 logic-layer rows; the repo does not drive a browser.
  - `[low]` `[reject]` Name and colours are not tested (intent) — judgement rather than a rule; the colour clash is covered by the palette patch.
  - `[low]` `[reject]` The in-game hint lists keys only; the rules are in the README (intent) — the hint follows the shared shape; the README documents the rules.
  - `[false]` `[reject]` carried — the spec file is not in the diff (intent). Same as the pass-1 row.

## Auto Run Result

- **Summary:** Built Stackfall as `stackfall.html` in the shared shape, with `test-stackfall.mjs`. It covers the full intent and both stretch goals (hold and ghost). Two follow-up passes changed only the README, the tests, one CSS line and one colour; the game rules did not change.
- **Files changed (whole change):**
  - `stackfall.html` -- the game. Latest pass: `box-sizing: border-box` on the canvas, L colour changed to royal blue.
  - `test-stackfall.mjs` -- every I/O matrix row plus the review gaps (spawn timers, resting-branch gravity reset, refilled rows, live piece position, first-frame guard, HUD text, soft-drop score, hold queue, ghost while over, dt cap, rotation limits, air-time pause).
  - `README.md` -- games table, controls, rules (scoring level, drops, key repeat, no pause, bag wording, rotation limits, lock timing, round, ghost, no high score), test command.
  - `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- games list, test command, Stackfall section.
- **Review findings, follow-up 2:** 35 findings: 0 high, 0 medium, 33 low, 2 false.
  - Patched: 18 rows in 13 fixes. One row (upward kick) is already covered by the README note from an earlier pass.
  - Deferred: 3 rows (map drift, already in `deferred`) and one new item (the same canvas overflow in Gapwing and Snake).
  - Rejected: 12 low and 2 false. Reasons are in the triage log.
- **Follow-up review recommended:** false. No high or medium was patched, so the work has converged.
- **Verification:**
  - `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs` passes.
  - I re-ran real mutants of the new asserts: three hold-queue breaks (no advance, extra take, swap advances), a 110 ms dt cap, and ghost drawn while over. Each is caught.
- **Open design question for the user:** rotation only shifts sideways, so a piece resting flat on the floor or a flat stack cannot rotate, which makes the 500 ms lock delay rarely useful. An upward kick would fix it, but the spec's Never list excludes extended kick tables. The README says so; the decision is yours.
- **Residual risks:**
  - Not played in a real browser.
  - An upright I flush against either wall cannot rotate from one of its two vertical positions.
  - The lock timer runs only while the piece rests, so ledge shuffling can delay a lock; each rest counts toward 500 ms.
  - Move and soft-drop speed depends on OS key repeat.
  - The new L blue is close to S's steel blue in hue; it differs mainly in brightness and saturation.
  - No pause; keyboard only.
  - The README Play link stays dead until merge and GitHub Pages rebuild.

## Design Notes

Gravity and lock share `step(dt)`: `dropAcc += dt` and fall a row each `interval()` ms while the piece can move down; when it cannot, `lockTimer += dt` and lock at 500. A successful fall sets `lockTimer = 0`. Kicks are just `for (const dx of [0, -1, 1])` over the rotated matrix.

## Verification

**Commands:**
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs` -- expected: all three print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `stackfall.html`: move, rotate against walls, soft and hard drop, clear lines, hold, watch the ghost and next preview, top out and restart with R.
