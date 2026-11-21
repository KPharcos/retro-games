---
title: 'Gapwing: original flap-through-gaps game'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: 'cc1e333ac446c0fb9c50b61560eb2e122a164c9c'
review_loop_iteration: 0
followup_review_recommended: false
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

## Auto Run Result

- **Summary:** Added Gapwing, an original one-button flyer with fixed 60 Hz physics, 1.5 s pillar spawns, a ready/playing/over flow with a 500 ms restart gate, parallax layers and a gap ramp, plus its harness test and doc updates. A follow-up review pass changed only the tests.
- **Files changed:**
  - `gapwing.html` -- the game (unchanged in the follow-up pass).
  - `test-gapwing.mjs` -- covers every I/O matrix row, the first-pass review gaps and the follow-up gaps.
  - `README.md` -- games table, controls, test command, Play link.
  - `CLAUDE.md` -- games list and test command.
  - `docs/CODEBASE_MAP.md` -- overview, tree and test lines.
- **Review findings, first pass:** 17 findings, 4 medium and 13 low. 12 patched in 9 fixes (3 medium entries, 6 low), 3 deferred (CODEBASE_MAP, low), 2 rejected (score timing, browser-level tests).
- **Review findings, follow-up pass:** 29 findings, 0 high, 0 medium, 24 low, 5 false.
  - Patched: 9 low, in 9 test additions: gap ramp steps, death mid-step, `dist` scroll, status write count, spawn bounds with stubbed random, pillar cull, `reset()` fields, ramp through real play, exact dt-cap frame count.
  - Deferred: 5 low, all `docs/CODEBASE_MAP.md`. 4 are carried from the first pass; 1 is new (gapwing.html section drift).
  - Rejected, low: 10 (hidden-tab burst, reported twice; score on the death frame, reported twice and carried; gap reachability; render interpolation and DPR; early status prompt; Ctrl/Alt/Meta+Space; slow-motion below 10 fps; logic-layer-only tests, carried). Reasons are in the triage log.
  - False: 5 (alternate keys, negative rAF delta, `getContext` null, pointer button filter, additions beyond intent).
- **Follow-up review recommended:** false. The follow-up pass patched no `high` entry, so the work has converged.
- **Verification:** `node test.mjs && node test-snake.mjs && node test-gapwing.mjs` all pass after the patches. I re-ran 5 mutants of `gapwing.html` against the new tests (no `dist` scroll, smooth gap shrink, 117 ms dt cap, no `playing` check in the step loop, no cull); all 5 fail the suite, and the game file is unchanged.
- **Residual risks:**
  - Feel and difficulty have not been played by hand, and the `button === 0` filter and dt cap have not run on real mouse or touch hardware.
  - The exact dt-cap assertion (`vy === 2.5`) depends on float rounding of `100 / (1000/60)`; changing `FRAME` breaks it even if the game still works.
  - Returning to a hidden tab resumes the run live after one capped burst (at most 6 frames); there is no pause.
  - The README Play link stays dead until this merges and GitHub Pages rebuilds.
  - `_bmad/config.toml` was edited to remove the `[modules.gds]` path keys that duplicate `[modules.bmm]`. A BMAD reinstall will put them back.

## Design Notes

Frame accumulator, as in Snake: `acc += dt; while (acc >= FRAME) { acc -= FRAME; tick(); }`. `step` also adds `dt` to `overTime` while `over`, which gates restart. Parallax is pure render: `dist` (total px scrolled) drives layers at `dist * 0.2`, `dist * 0.5` and `dist * 1` modulo their tile width.

## Verification

**Commands:**
- `node test.mjs && node test-snake.mjs && node test-gapwing.mjs` -- expected: all three print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `gapwing.html`: flap with Space, click and touch; pipes arrive every 1.5 s; score counts; ground and pipes end the run; restart works only after half a second.
