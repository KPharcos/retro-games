---
title: 'Gapwing: original flap-through-gaps game'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: 'cc1e333ac446c0fb9c50b61560eb2e122a164c9c'
review_loop_iteration: 0
followup_review_recommended: false
followup_pass: true
context: ['{project-root}/CLAUDE.md']
warnings: []
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md still carries stale claims: "a git repo with no commits yet", and frontmatter file/token counts not refreshed for the new files.
    evidence: |-
      Pre-existing text in the System Overview line; repo has commits cc1e333 and e0243fa. Fix edits an agent-context doc linked from CLAUDE.md, so deferred; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      docs/CODEBASE_MAP.md sections beyond the overview skip Gapwing: frame diagram notes, pointerdown input, conventions on setText/HUD, navigation guide entry, harness listeners gotcha, spec status annotation.
    evidence: |-
      Implementer updated the overview, tree and test lines only. Fix edits an agent-context doc linked from CLAUDE.md, so deferred; a cartographer re-map covers it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      docs/CODEBASE_MAP.md gapwing.html section drifts from the code: Constants row omits START_Y, Logic row omits die(), Input row omits the e.button === 0 filter on pointerdown.
    evidence: |-
      Follow-up review pass. The map is cartographer output linked from CLAUDE.md, so fixing it edits an agent-context doc; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      CLAUDE.md shape section lists onKey but not pointer input, which Gapwing adds on document pointerdown.
    evidence: |-
      Follow-up 2 review pass. The fix edits CLAUDE.md, an agent-context file, so it is deferred; a future game author following the shape doc would miss pointer input.
    location: >-
      CLAUDE.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has Snake and Stackfall but no one-button arcade game. The user wants a Flappy-style game: a bird flaps through gaps in scrolling pipes, in one HTML file on a 400x600 canvas, with original simple-shape art.

**Approach:** Add `gapwing.html` (original name and art) in the repo's shared testable shape, plus `test-gapwing.mjs` using `harness.mjs`. Physics are per frame at a fixed 60 Hz step so the per-frame numbers hold at any display refresh rate.

## Boundaries & Constraints

**Always:**
- One self-contained HTML file, canvas `400x600`, vanilla JS, inline CSS, exactly one bare `<script>`.
- Shared shape: top-level `let` state, `reset()`, `step(dt)` (ms), read-only `render()`, `onKey(e)` on `e.code` via `document.addEventListener`, rAF `frame` loop with dt capped at 100 ms.
- Fixed frame = `1000/60` ms. Per frame: `vy += 0.5`, `y += vy`, pipes `x -= 2`.
- Flap sets `vy = -8` (not additive). Inputs: Space keydown (key repeat ignored, `preventDefault`), and `pointerdown` on `document` (covers mouse click and touch tap).
- Pipes spawn every 90 frames (1.5 s) at the right edge; gap top random so the whole gap sits between y=60 and the ground minus 60.
- +1 score once per pipe, when the pipe's right edge passes the bird's x.
- Game over on: bird circle overlapping a pipe column (the top pipe extends upward without limit, so flying above the screen still hits it), or bird bottom reaching the ground.
- States `ready` → `playing` → `over`. In `ready`, the bird hovers still; the first input starts `playing` and flaps. In `over`, inputs before 500 ms are ignored; after that, input calls `reset()` (back to `ready`).
- Original art from canvas shapes only (circle bird, rectangle pillars, hill and cloud shapes). No images, fonts or external assets.
- Stretch, both included: parallax (far hills, near clouds/hills and ground scroll at different speeds, drawn from a scroll distance), difficulty ramp (gap shrinks 5 px for every 5 points, floor 100 px; each pipe keeps the gap it spawned with).

**Never:**
- The name "Flappy Bird", its sprites, colours, sounds or look.
- Dependencies, external files, `setInterval`, high-score storage, sound, menus.
- Editing `harness.mjs` or other games.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | `ready`, Space or pointerdown | state `playing`, `vy = -8` | none |
| Gravity | `playing`, one frame, no input | `vy` +0.5, then `y += vy` | none |
| Frame timing | `step(16)` then `step(1)` | no frame, then exactly one frame | none |
| Spawn | 90 frames of play | one pipe at x = 400; next 90 frames later | none |
| Score | pipe right edge goes past bird x | score +1 once for that pipe | none |
| Pipe hit | bird overlaps pipe column above gap top or below gap bottom | state `over` | none |
| Over the top | bird y < 0 while a pipe column passes | state `over` | none |
| Ground | bird bottom ≥ ground | state `over` | none |
| Early restart | `over` < 500 ms, input | ignored | none |
| Restart | `over` ≥ 500 ms, input | `reset()`: `ready`, score 0, no pipes | none |
| Key repeat | Space held (`repeat: true`) | no extra flap | none |
| Ramp | score 10 at spawn | gap 140; score ≥ 50 → gap 100 | none |
| Scroll | Space keydown | `preventDefault` | other keys untouched |

</intent-contract>

## Code Map

- `snake.html` -- template for the shape: constants at top, `reset`/`step`/`render`, `onKey`, capped rAF `frame`, `setText` + `aria-live` `#status` line, canvas `role="img"`.
- `harness.mjs` -- `load(file, globals)`; `run(code)` reads top-level `let`s; `key(code, repeat)` fires keydown; `listeners[type]` holds the last `document` listener per type (so `listeners.pointerdown` is callable). Stub `getElementById` returns no `addEventListener`, so input must bind to `document`. `fillText` calls collect into `texts`.
- `test-snake.mjs` -- style reference for the new test.
- `README.md` -- games table, controls sections, test command; add Gapwing.
- `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- list the games and test command; add Gapwing.

## Tasks & Acceptance

**Execution:**
- `gapwing.html` -- create the game per the intent contract -- the feature.
- `test-gapwing.mjs` -- assert every I/O matrix row via `harness.mjs` -- repo convention, guards the rules.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- add the game, its controls and `node test-gapwing.mjs` to the test command -- keep docs true.

**Acceptance Criteria:**
- Given the page opens, when nothing is pressed, then the ready screen shows the bird and a "tap or Space" hint and nothing moves.
- Given `playing`, when `render()` runs, then the score is drawn on the canvas and the `#status` line is updated for screen readers on state change.
- Given `over`, when rendered, then "Game Over" and the final score appear.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 17 findings — high 0, medium 4, low 13, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` Corner-hit test does not separate circle from box math (blind-hunter) — added corner-miss case dx=10, dy=10 asserting `playing`.
  - `[low]` `[patch]` No near-miss tests at gap and ground edges (blind-hunter) — added 13 px near miss on the bottom pillar and 1 px-above-ground cases asserting `playing`.
  - `[low]` `[patch]` "below gap bottom" case has its centre inside the gap (blind-hunter) — label fixed; added centre-below case y=360.
  - `[low]` `[patch]` Drawn caps and beak exceed the hitbox (blind-hunter) — comment at `hits()` marks the lenient hitbox as deliberate.
  - `[medium]` `[patch]` Any mouse button flaps; right-click also opens the context menu (blind-hunter) — `pointerdown` now flaps only on `e.button === 0`; tests pass `{ button: 0 }` and assert `{ button: 2 }` is ignored.
  - `[medium]` `[patch]` `#status` acceptance criterion has no test (blind-hunter) — second `load()` with a persistent element stub asserts status text in ready, playing, over.
  - `[low]` `[patch]` Restart only tested via Space; restart hint timing untested (blind-hunter) — added pointerdown restart and hint absent at <500 ms, present at 500 ms.
  - `[low]` `[defer]` CODEBASE_MAP keeps stale "no commits yet" and unrefreshed counts (blind-hunter) — pre-existing text in an agent-context doc; deferred.
  - `[low]` `[defer]` CODEBASE_MAP sections beyond the overview skip Gapwing (blind-hunter) — fix edits an agent-context doc; deferred.
  - `[low]` `[defer]` New spec's map entry lacks a status annotation; spec still in-review (blind-hunter) — status becomes done at finalize; map annotation grouped with the CODEBASE_MAP deferral.
  - `[low]` `[patch]` README controls table repeats "Space / click / tap" and hides restart-to-ready (blind-hunter) — merged into one row that states the restart lands on the ready screen.
  - `[medium]` `[patch]` Right/middle-click flaps (edge-case-hunter) — same root cause and fix as the blind-hunter right-click row.
  - `[low]` `[reject]` Score credited when the trailing edge passes the bird centre although the circle can still clip the pillar (edge-case-hunter) — real but matches the intent-contract rule "right edge passes the bird's x"; the only fix edits this build's spec.
  - `[low]` `[reject]` Tests exercise the logic layer in `node:vm`, not real browser input, refresh rates or visuals (intent-alignment) — repo has no browser test setup and adding one needs a dependency; implementer's headless Firefox screenshot and the manual check cover rendering.
  - `[medium]` `[patch]` `frame()` 100 ms dt cap never runs in a test (verification-gap) — added `frame(0); frame(5000)` check: still `playing`, vy ≤ 3.
  - `[medium]` `[patch]` `#status` aria-live text never checked (verification-gap) — same root cause and fix as the blind-hunter status row.
  - `[low]` `[patch]` Held Space `preventDefault` unchecked (verification-gap) — scroll block now sends `repeat: true` and expects the count to rise.

### 2026-11-21 — Review pass (follow-up)
- verdicts: 29 findings — high 0, medium 0, low 24, false 5, maybe-false 0
- findings:
  - `[low]` `[defer]` CODEBASE_MAP keeps "no commits yet" and stale counts (blind-hunter) — carried: same claim as the first pass; already in `deferred`, not added again.
  - `[low]` `[defer]` CODEBASE_MAP sections beyond the overview skip Gapwing (blind-hunter) — carried: already in `deferred`, not added again.
  - `[low]` `[defer]` CODEBASE_MAP gapwing.html section drifts from the code: START_Y, die(), the `e.button === 0` filter (blind-hunter) — new, but the fix edits cartographer output linked from CLAUDE.md; added to `deferred`.
  - `[low]` `[reject]` No pause or visibilitychange handling; returning to a hidden tab runs one capped burst (blind-hunter) — the spec's 100 ms dt cap is the chosen mitigation (Snake does the same), the burst is at most 6 frames, and the fix adds a listener or paused state beyond the intent's three states.
  - `[low]` `[reject]` Score is banked on the frame the bird dies (blind-hunter) — carried: same claim as the first pass; matches the intent rule "right edge passes the bird's x", and the only fix edits this build's spec.
  - `[low]` `[reject]` Consecutive gap tops are unconstrained, so a floor-size gap can follow a far-away one (blind-hunter) — checked by arithmetic: needs a sustained climb above 5 px/frame, which only about 3% of spawns past score 50 demand; the fix changes the spec's random gap placement.
  - `[low]` `[reject]` No render interpolation at 120/144 Hz, no devicePixelRatio scaling (blind-hunter) — cosmetic, the fixed step is what the intent asks for, Snake and Stackfall draw the same way, and the fix is more than a direct correction.
  - `[low]` `[reject]` `#status` announces the restart prompt before the 500 ms gate opens (blind-hunter) — a screen reader takes far longer than 500 ms to speak the sentence, so the prompt cannot be acted on early; the fix adds a branch.
  - `[low]` `[patch]` Spawn-range test runs only at score 0 and never reaches gap 100 (blind-hunter) — added literal-bounds checks at scores 0, 25 and 50 with `Math.random` stubbed to both extremes.
  - `[low]` `[patch]` Cull, reset fields, `dist` and ramp-through-play are untested (blind-hunter) — added: 3 pillars then 2 at the cull frame, `acc/spawnT/overTime/dist` back to 0 after `reset()`, `dist === 2 * frames`, and gap 140 from a real spawn at score 10.
  - `[low]` `[patch]` dt-cap check `vy <= 3` accepts any cap from about 100 to 116 ms (blind-hunter) — now asserts `vy === 2.5` (exactly 5 ticks); a 117 ms cap fails.
  - `[false]` `[reject]` No Enter/ArrowUp/KeyW alternative and the README does not mention right-click (blind-hunter) — the intent names Space, click and tap only; no harm named.
  - `[low]` `[reject]` Score banked on the death frame (edge-case-hunter) — carried: same claim and route as the blind-hunter row above.
  - `[false]` `[reject]` Negative rAF delta would stall physics (edge-case-hunter) — timestamps of successive rAF callbacks do not decrease, and Snake uses the same pattern; no reachable input shown.
  - `[low]` `[reject]` No visibilitychange handling (edge-case-hunter) — same root cause and reasoning as the blind-hunter row above.
  - `[low]` `[reject]` Ctrl/Alt/Meta+Space is swallowed by `preventDefault` and flaps (edge-case-hunter) — negligible on a game page, same pattern as Snake; the fix adds a branch.
  - `[false]` `[reject]` `getContext` returning null or `render()` throwing would stop the rAF loop (edge-case-hunter) — `getContext('2d')` on a fresh canvas does not return null and no throwing path was shown.
  - `[low]` `[defer]` CODEBASE_MAP:17 stale "no commits yet" (edge-case-hunter) — carried: already in `deferred`.
  - `[low]` `[defer]` CODEBASE_MAP:234 frame note skips Gapwing (edge-case-hunter) — carried: already in `deferred`.
  - `[low]` `[reject]` Below about 10 fps game time runs slower than real time (edge-case-hunter) — the 100 ms dt cap is required by the spec; the fix edits this build's spec.
  - `[low]` `[patch]` Gap ramp step size unverified: `GAP0 - s` still passed (verification-gap) — now asserts gap 150, 150, 145, 140 at scores 0, 4, 9, 10; the mutant fails.
  - `[low]` `[patch]` Death partway through a multi-frame `step` does not stop the simulation, and no test notices (verification-gap) — added a `step(100)` case that must run exactly one tick; removing the `playing` check fails.
  - `[low]` `[patch]` Parallax `dist` is only checked at rest (verification-gap) — `dist === 360` after 180 frames and unchanged while over; deleting `dist += SPEED` fails.
  - `[low]` `[patch]` `setText` write guard is unobserved (verification-gap) — the status stub now counts writes; two renders per state give one write.
  - `[low]` `[patch]` Gap placement is checked against the script's own constants with no random stub (verification-gap) — same fix as the spawn-range row above.
  - `[low]` `[patch]` Off-screen pillars are never verified as removed (verification-gap) — same fix as the cull row above; the reviewer's `defer` disposition was not taken because the fix is a direct test assertion.
  - `[false]` `[reject]` The `e.button === 0` guard narrows the spec's `pointerdown` input (intent-alignment) — `PointerEvent.button` is 0 for a left click and for touch and pen contact, so nothing the intent names is excluded; only right/middle buttons are.
  - `[low]` `[reject]` Tests run on the logic layer in `node:vm`; no refresh-rate sequences, pixel or CSS checks (intent-alignment) — carried: same claim as the first pass; the repo has no browser test setup and the step-boundary and dt-cap tests cover the accumulator.
  - `[false]` `[reject]` Additions beyond the intent: `#status`, moon, wing, docs (intent-alignment) — none touches the intent's Never list and no harm is named.

### 2026-11-21 — Review pass (follow-up 2)
- verdicts: 44 findings — high 0, medium 0, low 39, false 5, maybe-false 0
- findings:
  - `[low]` `[defer]` carried — CODEBASE_MAP:70 keeps "no commits yet" (blind-hunter). Already in `deferred`.
  - `[false]` `[reject]` Spec excluded from the diff, so spec and log changes go unreviewed (blind-hunter) — the spec is the edge layer's claims file by design, and the diff excludes it on purpose.
  - `[low]` `[defer]` carried — CODEBASE_MAP spec tree line has no status note (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — CODEBASE_MAP "Common tasks" has no Gapwing bullet (blind-hunter). Same map-section drift already in `deferred`.
  - `[low]` `[defer]` carried — CODEBASE_MAP Gapwing section omits START_Y, die() and the dt-cap and status tests (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — CODEBASE_MAP frame diagram "same for every game" does not cover Gapwing (blind-hunter). Already in `deferred`.
  - `[false]` `[reject]` CLAUDE.md says render() is read-only, but Gapwing's render() calls setText (blind-hunter) — refutation: read-only means game state is not changed. render() only writes DOM through setText, the same as snake.html's render(), which writes score, high score, wrap and status.
  - `[low]` `[defer]` CLAUDE.md shape section omits pointer input (blind-hunter) — the fix edits CLAUDE.md, an agent-context file, so deferred. New item in `deferred`.
  - `[false]` `[reject]` "original" in README and the map reads as false for a flappy-style game (blind-hunter) — refutation: "original" describes the name, art and palette, which are not copied; the repo rules allow mechanics similar to a genre.
  - `[low]` `[patch]` README says "each pillar you pass" without defining pass (blind-hunter) — patched: README says a pillar scores when its right edge passes the bird's centre.
  - `[low]` `[reject]` carried — status line gives the restart prompt the instant the bird dies, before the 500 ms gate (blind-hunter). Same claim and verdict as the first follow-up pass.
  - `[low]` `[patch]` No ceiling: the bird can leave the screen, and this is undocumented (blind-hunter) — grouped with the no-top-clamp (edge) and off-canvas (intent) rows: one open-ceiling root cause. Patched: README states there is no ceiling. The clamp fix is rejected under the edge row.
  - `[low]` `[reject]` carried — no pause or visibilitychange handling (blind-hunter). Same claim and verdict as the earlier rows.
  - `[low]` `[patch]` frame() comment "doesn't run a burst of frames" overstates (blind-hunter) — patched: comment says at most about 6 frames.
  - `[low]` `[patch]` dt-cap assert is exact and depends on float rounding (blind-hunter) — grouped with the verification and intent float rows. Patched: assert accepts 5 or 6 ticks (vy 2.5 to 3); a cap of 117 ms or more still fails.
  - `[low]` `[patch]` Non-Space keys are not checked for flapping (blind-hunter) — patched: ArrowUp, ArrowDown, KeyW, F5 and Tab leave the game in ready with vy 0.
  - `[low]` `[patch]` Gap ramp is tested only at spawn; a per-tick recompute passes (blind-hunter) — patched: a pillar spawned at score 0 keeps gap 150 after score rises and 5 ticks run.
  - `[low]` `[patch]` Death mid-step comment assigns the cause to the pillar column alone (blind-hunter) — patched: comment says the pillar column and the ground both cover the bird on this tick, and the check is only that the loop stops.
  - `[low]` `[reject]` carried — scoring runs before the death check, so a trailing-edge crash still scores (edge). Same claim as the score-on-death rows.
  - `[low]` `[patch]` No top clamp: the bird leaves the canvas, and a pillar can kill it unseen (edge) — same open-ceiling root cause as the blind row. Patched: README note. The suggested clamp (y = BIRD_R) is rejected because it changes spec-settled behaviour, and the fix would edit this build's spec.
  - `[low]` `[reject]` 100 ms step runs 5 ticks, not 6, because of float rounding (edge) — one tick of slop on exact 100 ms steps. The fix adds a tolerance branch to game code; the test is loosened instead (grouped row).
  - `[low]` `[reject]` carried — Ctrl, Alt, Meta or Shift with Space still flaps (edge). Same claim as the earlier modifier-key row.
  - `[low]` `[reject]` carried — tab hidden then resumed can kill the bird (edge). Same claim as the pause row.
  - `[low]` `[patch]` body `height: 100vh` clips the score line on short viewports (edge) — real: the canvas (max 80vh) plus about 117 px of text overflows the flex centre below about 585 px, not 300 px as reported. Patched: `min-height: 100vh` in gapwing.html only; snake.html has the same rule and is not changed.
  - `[low]` `[defer]` carried — CODEBASE_MAP:17 "no commits yet" (edge). Already in `deferred`.
  - `[low]` `[reject]` carried — below about 10 Hz, game time runs slow because of the dt cap (edge). Same claim as the earlier row; the cap is required by the spec.
  - `[low]` `[patch]` frame() loop wiring is not asserted: re-queue, bootstrap and the render call (verification) — patched: recording rAF through load globals; asserts 1 call after load, 2 after frame(0), and the score drawn.
  - `[low]` `[patch]` A pillar already behind the bird is not asserted, so a max(p.x, BIRD_X) mutant passes (verification) — patched: pillar at x=-10 stays playing with the bird at y=100 and at y=400.
  - `[low]` `[reject]` Drawn pillar geometry is not asserted (verification) — hypothetical regression; the fix needs a recording canvas harness, more than a direct correction. Draw calls match the hitbox on reading.
  - `[low]` `[patch]` render() leaving game state alone is not asserted (verification) — patched: state snapshot before and after render().
  - `[low]` `[reject]` carried — score awarded before the death check (verification). Same as the row above.
  - `[low]` `[defer]` carried — CODEBASE_MAP:17 "no commits yet" (verification). Already in `deferred`.
  - `[low]` `[patch]` hover() comment "frames without dying" is wrong (verification) — patched: comment says it holds y at 300 and does not stop on death.
  - `[low]` `[patch]` exact 5-tick dt-cap assert pins float rounding (verification) — grouped with the blind dt-cap row; patched there.
  - `[low]` `[patch]` Off-canvas: a pillar can kill the bird while it is above the canvas, and the open-top reading is where no player looks (intent) — grouped with the no-ceiling and no-top-clamp rows: one root cause. Patched: README note. Whether to clamp instead is left to the user.
  - `[low]` `[patch]` carried — caps and beak are not lethal while drawn outside the hitbox (intent). Fix already applied in the first pass (comment at hits()); no new change.
  - `[false]` `[reject]` Restart returns to ready, not straight into play (intent) — documented in README and spec; the intent does not specify; no defect shown.
  - `[low]` `[patch]` 100 ms frame cap gives 5 ticks (intent) — grouped with the blind and verification dt-cap rows; patched there.
  - `[low]` `[reject]` carried — frame cap stretches the 500 ms gate at low frame rates (intent). Same as the below-10-Hz row.
  - `[low]` `[patch]` Canvas 400x600 attributes are not asserted (intent) — patched: regex assert on the canvas tag.
  - `[low]` `[reject]` carried — tests run on the logic layer; no real pointer, touch, click or rAF (intent). Same claim as the earlier rows.
  - `[false]` `[reject]` 60 px margins and the ramp schedule are the diff's own choices (intent) — the spec documents both and the intent gives neither; no defect shown.
  - `[low]` `[reject]` Parallax layer speeds are not asserted (intent) — needs draw-call capture through the harness; more than a direct correction.
  - `[low]` `[reject]` carried — score awarded about 12 px before the body clears the pillar (intent). Same root as the score rows.

## Auto Run Result

- **Summary:** Gapwing is built and reviewed. The second follow-up pass changed only tests, one CSS line in `gapwing.html`, one comment, and README wording. Game rules did not change.
- **Files changed in this pass:**
  - `gapwing.html` -- body `min-height: 100vh`; frame() cap comment reworded.
  - `test-gapwing.mjs` -- canvas size assert, cleared-pillar hitbox, render() state snapshot, rAF wiring, per-pillar gap, non-Space keys, dt-cap range, comments.
  - `README.md` -- pass definition and the open-ceiling note.
  - `_bmad-output/implementation-artifacts/spec-gapwing-flappy-game.md` -- this record.
- **Review findings, follow-up 2:** 44 findings, 0 high, 0 medium, 39 low, 5 false.
  - Patched: 18 rows covering 13 fixes.
  - Deferred: 8 rows. One is new (CLAUDE.md shape section omits pointer input); the rest are carried CODEBASE_MAP items already in `deferred`.
  - Rejected: 18 rows (13 low, 5 false). Reasons are in the triage log.
- **Follow-up review recommended:** false. No high was patched, so the work has converged.
- **Verification:** `node test.mjs && node test-snake.mjs && node test-gapwing.mjs` all pass after the patches. I re-ran three new asserts against mutants (cleared-pillar hitbox, 117 ms frame cap, missing rAF re-queue); each mutant fails the suite. The implementer reported eight more mutant checks on the other new asserts.
- **Open design question for the user:** the bird can fly above the top of the screen, and a pillar there can kill it while it is off-canvas. The spec keeps the top open and the README now says so. Decide whether to clamp the bird at the top instead; that changes spec-settled behaviour.
- **Residual risks:**
  - `snake.html` has the same `height: 100vh` body rule and clips on short viewports. Not changed here.
  - The `min-height` change is not checked in a browser at short heights.
  - Feel and difficulty have not been played by hand. Real mouse, touch and frame cadence have not run in a browser.
  - The dt-cap assert accepts 5 or 6 ticks, so caps from 101 to 116 ms are not distinguished.
  - `_bmad/config.toml` was edited to drop duplicate `[modules.gds]` path keys. A BMAD reinstall puts them back.
  - The README Play link stays dead until this merges and GitHub Pages rebuilds.

## Design Notes

Frame accumulator, as in Snake: `acc += dt; while (acc >= FRAME) { acc -= FRAME; tick(); }`. `step` also adds `dt` to `overTime` while `over`, which gates restart. Parallax is pure render: `dist` (total px scrolled) drives layers at `dist * 0.2`, `dist * 0.5` and `dist * 1` modulo their tile width.

## Verification

**Commands:**
- `node test.mjs && node test-snake.mjs && node test-gapwing.mjs` -- expected: all three print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `gapwing.html`: flap with Space, click and touch; pipes arrive every 1.5 s; score counts; ground and pipes end the run; restart works only after half a second.
