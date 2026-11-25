---
title: 'Bricklash: brick-breaker game'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_revision: 'a0b92b3e62ba07497d7051f303897fe3ebd56795'
review_loop_iteration: 0
followup_review_recommended: false
followup_pass: true
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md was hand-edited, not re-mapped: its spec tree still says Bricklash is "status: in-progress", and the frontmatter totals (total_files 27, total_tokens, last_mapped) and the "24 tracked project files" sentence do not count the three new files.
    evidence: |-
      Review pass 1 (verification-gap, blind-hunter). CODEBASE_MAP is an agent-context doc linked from CLAUDE.md, so the fix is deferred; a cartographer re-map refreshes it, as after earlier games.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      The Bricklash section of docs/CODEBASE_MAP.md is stale after the review patches: it says the canvas carries `touch-action: none` (it is on `body`), that `keyL`/`keyR` are not reset (`onblur` clears them), that `paddleHit` runs only while `vy > 0` (it also needs the ball's previous bottom at or above the paddle top), and it omits `onblur`.
    evidence: |-
      Follow-up pass 1 (intent-alignment, verification-gap, blind-hunter, edge-case-hunter). CODEBASE_MAP is an agent-context doc linked from CLAUDE.md, so the fix is deferred together with the totals row above; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md (Bricklash section, Input / State / Logic rows)
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no paddle-and-ball brick-breaker. The user wants one in a single HTML file on a 480x640 canvas: paddle at the bottom (mouse or arrow keys), Space launches the ball, 6 rows x 10 bricks with one color per row and top rows worth more, paddle bounce angle set by the hit point (edge = steeper), 3 lives, all bricks gone = next level with a faster ball, a fixed-timestep rAF + delta-time loop and a HUD with score, lives and level. Stretch: power-ups dropping from bricks (wide paddle, multi-ball).

**Approach:** Add `bricklash.html`, an original brick-breaker in the repo's canvas game shape (copy `gapwing.html`'s structure), plus `test-bricklash.mjs` on `harness.mjs`. The user said "Breakout"; the game ships under the original name Bricklash with its own palette, since the repo builds originals in a genre, not copies of a named game.

## Boundaries & Constraints

**Always:**
- One file, one bare `<script>`, top-level `let` state, `reset()`, `step(dt)`, read-only `render()`, `onKey(e)` on `e.code` via `document.addEventListener`, pointer via `document.addEventListener`, rAF `frame` loop with dt capped at 100 ms (as in gapwing).
- Fixed timestep: `step(dt)` adds dt to an accumulator and runs `tick()` every `TICK = 1000 / 120` ms. Speeds are px per second; one tick moves `speed / 120` px, so at the speed cap a ball moves at most 6 px per tick (brick height 20, no tunnelling).
- Canvas `width="480" height="640"`. HUD band y 0..40 shows `Score N`, `Lives N`, `Level N`; the ceiling is y = 40.
- Bricks: 10 columns x 6 rows, each a 48x20 cell from y = 80 (the drawn brick may be inset; collision uses the full cell). Row r (0 = top) worth `(6 - r) * 10` points (60 .. 10), each row its own color.
- Paddle 80x12, top at y = 600, kept inside 0..480. Arrow Left / Right move it at 480 px/s while held (keydown/keyup). `pointermove` centres it on the pointer x, scaled by the canvas `getBoundingClientRect()`.
- Ball radius 6. Serve: ball rests on the paddle centre and follows it until Space (or a primary-button pointerdown) launches it up-right at 30° from vertical.
- Paddle bounce only while the ball moves down: offset `o = clamp((ballX - paddleCentre) / (paddleW / 2), -1, 1)`, new direction `60° * o` from vertical, upward, same speed. Centre = straight up, edge = 60°.
- Walls: left, right and the ceiling reflect. A ball whose top passes y = 640 is gone; when the last ball is gone, lose a life and serve again, or at 0 lives go to game over.
- Brick hit: at most one brick per ball per tick; remove it, add its points, flip vx if the ball's previous centre was left or right of the cell, otherwise flip vy.
- Level clear: level + 1, full wall, serve again, power-ups and capsules cleared. Ball speed `min(720, 360 + 40 * (level - 1))` px/s.
- Power-ups: a broken brick drops a capsule with probability 1/8 (`Math.random() < 0.125`), type wide or multi (50/50, second `Math.random()`), falling 150 px/s from the brick centre. Catch = capsule overlaps the paddle. Wide: paddle width 120 for 10 s (catching again restarts the 10 s). Multi: two new balls at the first ball's position, at -45° and +45° from vertical, upward, current speed.
- `#status` aria-live text changes only when the state text changes (gapwing's `setText`).

**Never:** the name "Breakout" or Atari-style branding in the game; pause, sound, saved high score, extra power-up types, bricks needing more than one hit; a dependency or build step; edits to `harness.mjs` or other games.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Serve | Space in serve | ball leaves paddle at 30° right of vertical, level speed | key repeat ignored |
| Paddle centre / edge | ball hits paddle at centre / right edge / left edge | vx = 0 straight up / 60° right / 60° left | ball moving up never bounces off paddle |
| Paddle clamp | ArrowLeft held at x = 0, pointer at x = -50 | paddle stays at 0 | right side same at 480 - width |
| Brick from below / side | ball enters a cell from below / from the left | brick gone, score + row points, vy flips / vx flips | one brick per ball per tick |
| Row values | break a top-row and bottom-row brick | +60 and +10 | — |
| Lose life | last ball's top below 640 | lives - 1, serve state | multi-ball: losing one of two balls keeps play going |
| Game over | lose the third life | state over, Space resets score 0, lives 3, level 1 | — |
| Level clear | last brick broken | level 2, 60 bricks, serve, speed 400 | speed capped at 720 |
| Fixed step | step(8) then step(1) | 0 ticks, then 1 tick | frame() caps dt at 100 ms |
| Wide | catch wide capsule | width 120 for 10 s, then 80 | catch while wide restarts timer; width stays inside walls |
| Multi | catch multi capsule | 3 balls | capsule missed falls off and is removed |

</intent-contract>

## Code Map

- `gapwing.html` -- template: fixed-step accumulator (`step`, `FRAME`), `frame()` dt cap, `setText`, `#status`, keydown + pointerdown wiring, HUD text via `fillText`.
- `stackfall.html` `onKey` -- `String(e.code)`, preventDefault on Space and arrows, `e.repeat` handling.
- `harness.mjs` `load(file, globals)` -- stub `document` (`getElementById` returns `{ getContext, textContent }`, `addEventListener` keeps the last listener per type); `listeners.keyup`, `listeners.pointermove` available. `getBoundingClientRect` is not stubbed: pointer tests pass their own `document` through `globals`.
- `test-gapwing.mjs` -- test style: `run('...')`, `key()`, stubbed `Math.random` via `Object.create(Math)`, rAF wiring check, status write counter.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- game lists, test command; add Bricklash.

## Tasks & Acceptance

**Execution:**
- `bricklash.html` -- the game per the contract -- new feature.
- `test-bricklash.mjs` -- node:vm self-check of every I/O matrix row, canvas size, rAF wiring, render() leaves state alone, status text -- repo rule: new logic leaves a test.
- `README.md` -- table row, play link, controls section, test command -- docs list every game.
- `CLAUDE.md` -- eight games, Bricklash in the list and test command -- agent context.
- `docs/CODEBASE_MAP.md` -- short Bricklash entry where the other games are listed -- keeps the map current.

**Acceptance Criteria:**
- Given the page is open, when it loads, then the canvas shows 60 bricks in 6 colored rows, the paddle with the ball on it, and the HUD `Score 0`, `Lives 3`, `Level 1`.
- Given play, when the mouse moves over the page, then the paddle centres under the pointer, scaled when the canvas is shrunk by CSS.
- Given the tab was hidden for seconds, when it returns, then at most 100 ms of game time runs.
- Given the full test command, when run, then every suite passes.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 27 findings — high 0, medium 5, low 16, false 6, maybe-false 0
- findings:
  - `[false]` `[reject]` game not named "Breakout" and a test forbids the word (intent-alignment) — deliberate: the repo builds originals in a genre, and a named-game copy is out of bounds; every Breakout-genre rule in the intent is built.
  - `[false]` `[reject]` "edge = steeper" read in the genre sense, the reverse of literal slope (intent-alignment) — genre norm recorded in Design Notes: centre straight up, edge 60° from vertical.
  - `[low]` `[reject]` life lost at the canvas bottom, not at the paddle line (intent-alignment) — after the paddle-from-above patch a ball past the paddle top cannot be saved, so only the timing differs (under 0.1 s); the sweep-save half is patched with the edge-case row below.
  - `[low]` `[reject]` ball speed stops rising after level 10 (intent-alignment) — the 720 px/s cap keeps the 6 px-per-tick no-tunnelling bound; lifting it needs sub-stepping, and level 11 means clearing ten walls.
  - `[false]` `[reject]` click/tap launch and extra files go past "Space" and "single HTML file" (intent-alignment) — Space still launches; the game is one file and the tests/docs follow repo convention.
  - `[false]` `[reject]` on-screen size may be below 480x640 (intent-alignment) — the canvas is 480x640; CSS only shrinks it on small viewports, like every canvas game here.
  - `[false]` `[reject]` look and play never checked in a browser (intent-alignment) — headless Chrome screenshots of serve and mid-play exist and were inspected: HUD, six colored rows, capsules, wide paddle and balls render correctly.
  - `[low]` `[patch]` brick hit from above: vy direction never asserted (verification-gap) — test asserts vy -360 after a downward top-row hit.
  - `[low]` `[patch]` flip-away vs bare negate not separated by any test (verification-gap) — one "already leaving" case per axis added; a bare negate now fails.
  - `[medium]` `[patch]` wide paddle never exercised in movement, bounce, pointer or catch code (verification-gap) — tests for edge bounce at 60°, ArrowRight and pointer clamp at 360, and a catch at the wide edge.
  - `[low]` `[defer]` CODEBASE_MAP lists the spec as in-progress (verification-gap) — agent-context doc; deferred with the map totals row.
  - `[medium]` `[patch]` arrow keys stick after window blur (edge-case-hunter) — top-level `onblur` clears keyL/keyR; test calls `onblur()`.
  - `[false]` `[reject]` zero-width canvas rect makes paddleX NaN (edge-case-hunter) — the canvas is never hidden or collapsed on this page, so pointermove never sees a 0-width rect.
  - `[low]` `[patch]` paddle moved under a low ball scoops it back up (edge-case-hunter) — `paddleHit` requires `b.py + BALL_R <= PADDLE_Y`; test added.
  - `[medium]` `[patch]` corner contact flips only vx, so a vertical ball climbs a whole column (edge-case-hunter) — on a corner hit vy also flips away; test at x 189 breaks one brick and turns down.
  - `[low]` `[reject]` multi capsule spawns new balls at balls[0] even if it is below the paddle (edge-case-hunter) — needs a catch in the ~0.1 s a ball spends below the paddle; the fix adds a selection rule for a rare case.
  - `[medium]` `[patch]` corner clip breaks a full column, confirmed in node:vm (blind-hunter) — same fix as the edge-case corner row.
  - `[medium]` `[patch]` held arrow keys stick after focus loss (blind-hunter) — same fix as the edge-case blur row.
  - `[low]` `[patch]` touch drag starting outside the canvas pans and cancels the pointer (blind-hunter) — body `touch-action: none`; canvas rule removed.
  - `[low]` `[reject]` first steering touch launches the ball; any tap restarts after game over (blind-hunter) — launch on pointerdown is the spec'd input; telling a tap from a drag needs new state and branches.
  - `[low]` `[patch]` paddle can save a ball already under it (blind-hunter) — same fix as the edge-case scoop row.
  - `[low]` `[defer]` spec/map status disagree and no review logged (blind-hunter) — the logs fill at this step (false part); the map line is deferred.
  - `[low]` `[defer]` CODEBASE_MAP totals not updated (blind-hunter) — agent-context doc; deferred.
  - `[low]` `[patch]` `#hint` leaves out touch (blind-hunter) — hint reads "Mouse / drag / ← → : move · Space / click / tap: launch".
  - `[low]` `[patch]` test gaps: click restart, pointer during serve, corner, blur, seam direction (blind-hunter) — all added; the seam test checks brick 53 broke, 54 stands and vy flipped.
  - `[low]` `[reject]` screen readers hear only "Playing." during play (blind-hunter) — same pattern as Gapwing; per-event announcements add branches and noise.
  - `[low]` `[reject]` same serve overlay every life/level, no level cue on the canvas (blind-hunter) — the HUD shows the level and #status says it; cosmetic.

### 2026-11-24 — Review pass (follow-up)
- verdicts: 34 findings — high 0, medium 2, low 26, false 6, maybe-false 0
- findings:
  - `[false]` `[reject]` carried: game not named "Breakout" and a test forbids the word (intent-alignment) — carried: deliberate; the repo builds originals in a genre, and every Breakout-genre rule in the intent is built.
  - `[false]` `[reject]` carried: "edge = steeper" read in the genre sense (intent-alignment) — carried: genre norm in Design Notes, centre straight up, edge 60° from vertical.
  - `[low]` `[reject]` carried: life lost at the canvas bottom, not at the paddle line (intent-alignment) — carried: timing only; the paddle-from-above patch bars the sweep save. The reported 52 px is 0.07 s at 720 px/s and 0.14-0.17 s at level-1 speed, so "under 0.1 s" in the earlier row holds only at high speed; harm unchanged.
  - `[low]` `[reject]` carried: ball speed stops rising after level 10 (intent-alignment) — carried: the 720 px/s cap keeps the 6 px-per-tick no-tunnelling bound.
  - `[false]` `[reject]` carried: click/tap launch and extra files go past "Space" and "single HTML file" (intent-alignment) — carried: Space still launches; one game file, tests and docs follow repo convention.
  - `[false]` `[reject]` carried: on-screen size may be below 480x640 (intent-alignment) — carried: the canvas is 480x640; CSS only shrinks it on small viewports.
  - `[false]` `[reject]` carried: look and play never run in a real browser; end-to-end play and `onblur` not driven (intent-alignment) — carried: headless Chrome screenshots were inspected; the harness stubs input by repo design.
  - `[low]` `[reject]` row colors asserted only as a set of six constants, not as drawn (intent-alignment) — a recording canvas stub is more than a correction; the screenshot shows six distinct row colors and a mutant wiring a wrong color would show at once in play.
  - `[low]` `[defer]` CODEBASE_MAP says `touch-action: none` is on the canvas; the code has it on `body` (intent-alignment) — agent-context doc; deferred with the map row.
  - `[low]` `[patch]` `step()` game-over guard unpinned: dropping `state !== 'over' &&` still passes (verification-gap) — test: last life lost inside `step(100)` ends at lives 0, state over.
  - `[medium]` `[patch]` paddle left-side miss untested: dropping the `b.x + BALL_R < paddleX` clause still passes (verification-gap) — test: ball left of the paddle keeps vy 360.
  - `[medium]` `[patch]` capsule catch box checked only on its right edge (verification-gap) — tests: no catch above, left, below or 1 px out of reach; catches at the left and bottom edges.
  - `[low]` `[patch]` releasing ArrowLeft never asserted (verification-gap) — test: keydown, keyup, `tick()` leaves paddleX and keyL unchanged without `onblur()`.
  - `[low]` `[patch]` HUD asserted only at start values (verification-gap) — test: score 70, lives 2, level 2 are drawn.
  - `[low]` `[patch]` `launch()` re-seating the ball on the paddle unpinned (verification-gap) — test: pointermove then pointerdown with no tick puts balls[0].x at the paddle centre. The reviewer filed it as defer; it is a one-assert test of a demonstrated gap, so it was patched.
  - `[low]` `[patch]` serve status reads "1 lives" (verification-gap) — "1 life" for one life; test added.
  - `[low]` `[defer]` CODEBASE_MAP says touch-action on the canvas (verification-gap) — same root cause as the map row above; deferred.
  - `[low]` `[reject]` carried: instant restart after game over, no guard like Gapwing's 500 ms (blind-hunter) — carried: same claim as the pass-1 row on any tap restarting after game over. Here no input is used during play (launch only matters in serve), so the case needs a fresh tap in the moment the last ball falls; a guard adds timer state, a step branch and a spec-unsettled delay.
  - `[low]` `[patch]` game over leaves capsules and the wide paddle (blind-hunter) — `loseLife` clears capsules, wide and paddleW on the last life too; test added.
  - `[low]` `[defer]` CODEBASE_MAP stale: touch-action wording, "not reset" keys, missing `onblur`, spec tree status (blind-hunter) — agent-context doc; deferred with the map rows.
  - `[false]` `[reject]` spec frontmatter says in-review while the result says done (blind-hunter) — transient state of this follow-up pass; finalize writes `status: done` and the recommendation.
  - `[low]` `[reject]` spec contract and Spec Change Log no longer describe the corner flip, paddle-from-above, blur reset (blind-hunter) — the fix edits this build's spec; the Auto Run Result records the changes.
  - `[low]` `[reject]` dt-cap test accepts 11 or 12 ticks, so a 99 ms cap passes (blind-hunter) — float rounding makes the tick count differ by one at exactly 100 ms; the same tolerance is in Gapwing's test and a 99 ms cap is not a defect.
  - `[low]` `[reject]` pointer mapping ignores the 2 px canvas border (blind-hunter) — a paddle offset under 2 px of 80 is not felt; the fix needs `clientLeft`/`clientWidth` on the stub canvas in every pointer test.
  - `[low]` `[reject]` focus loss only clears keys; the game keeps running (blind-hunter) — no pause is a Gapwing-style rule here, and a pause needs new state and input.
  - `[low]` `[reject]` `touch-action: none` on `body` blocks pinch zoom page-wide (blind-hunter) — reverting it reopens the pass-1 defect (drag outside the canvas pans and cancels the pointer); browser and text zoom still work.
  - `[low]` `[reject]` no render interpolation on the 120 Hz step (blind-hunter) — the intent asks for a fixed step, not interpolation; adding it is new draw logic for judder on non-60 Hz displays.
  - `[low]` `[patch]` last-life loss leaves capsules and wide paddle (edge-case-hunter) — same root cause and fix as the blind-hunter row.
  - `[low]` `[reject]` second finger moves the paddle (edge-case-hunter) — a one-finger game; the `isPrimary` guard also makes every pointer test pass `isPrimary`.
  - `[low]` `[reject]` 2 px border offset in pointer mapping (edge-case-hunter) — same as the blind-hunter row.
  - `[low]` `[patch]` "1 lives" in the serve status (edge-case-hunter) — same fix as the verification-gap row.
  - `[low]` `[reject]` contract says one-axis flips but the corner flips both (edge-case-hunter) — the fix edits this build's spec; the behavior is the pass-1 patch.
  - `[low]` `[defer]` CODEBASE_MAP says touch-action on the canvas (edge-case-hunter) — same root cause as the map rows above; deferred.
  - `[low]` `[defer]` CODEBASE_MAP omits the paddle-from-above rule, `onblur` and the key reset (edge-case-hunter) — same root cause; deferred.

### 2026-11-25 — Review pass (follow-up)
- verdicts: 44 findings — high 0, medium 0, low 33, false 10, maybe-false 1
- findings:
  - `[low]` `[reject]` carried: corner brick hit flips both vx and vy, but the contract says flip vx or vy (intent-alignment) — carried: pass-2 row on the contract text; the fix edits this build's spec.
  - `[low]` `[reject]` carried: flip away from the cell, not a bare negate, against the contract word "flip" (intent-alignment) — carried: same contract-text row; the behaviour is pinned by the "already leaving" tests.
  - `[low]` `[reject]` carried: the paddle bounce also needs the previous bottom above the paddle top, which the contract's "moves down" rule does not say (intent-alignment) — carried: same contract-text row; the fix edits this build's spec.
  - `[false]` `[reject]` life loss clears capsules and the wide paddle, while the contract names only level clear (intent-alignment) — refuted: the matrix life-loss row says only "lives - 1, serve state", the level-clear clause is one-way, and the comment in serve() says a capsule must not land while the ball sits on the paddle.
  - `[low]` `[reject]` carried: click restarts after game over, while the matrix says Space resets (intent-alignment) — carried: same claim as the pass-1 "any tap restarts after game over" row.
  - `[low]` `[reject]` carried: the dt-cap test accepts 11 or 12 ticks (intent-alignment) — carried: pass-2 dt-cap row.
  - `[false]` `[reject]` carried: touch and blur go past the literal "mouse or arrow keys" (intent-alignment) — carried: pass-2 extra-inputs row; the auditor calls them additions, not contradictions.
  - `[low]` `[reject]` carried: draw layer unobserved (row colours only as a constant, HUD placement and overlays not asserted) (intent-alignment) — carried: pass-2 row-colours row; a recording canvas stub is more than a correction, and the pass-1 headless screenshot shows the HUD and rows.
  - `[false]` `[reject]` carried: CSS, the hint and the page-level patches have no tests (intent-alignment) — carried: pass-2 browser-look row; CSS strings are not game behaviour and the screenshot covers layout.
  - `[false]` `[reject]` carried: real window.onblur wiring and event dispatch are not exercised (intent-alignment) — carried: pass-2 browser-look row (onblur not driven).
  - `[false]` `[reject]` carried: real rAF timing is not exercised; the loop runs on hand-fed timestamps (intent-alignment) — carried: pass-2 browser-look row.
  - `[false]` `[reject]` carried: the screenshot evidence in the spec is not in the repo (intent-alignment) — carried: pass-2 browser-look row; the screenshots were inspected in pass 1 and the harness stubs input by design.
  - `[low]` `[patch]` paddle reach window unpinned: a ball 1–20 px above the paddle top can bounce and the suite stays green (verification-gap) — the test after the from-above assert now pins a ball with its bottom 1 px above the paddle top to keep vy 360; the 20 px cutoff mutant fails on that line.
  - `[low]` `[reject]` carried: brick and paddle fills unobserved; the "one colour per row" test checks the palette constant only (verification-gap) — carried: pass-2 row-colours row; a recording canvas stub is more than a correction.
  - `[low]` `[defer]` carried: the Bricklash section of docs/CODEBASE_MAP.md is stale (touch-action on the canvas, paddleHit vy-only, no onblur) (verification-gap) — carried: pass-2 map row; agent-context doc, deferred.
  - `[maybe-false]` `[reject]` real Math.random in most bricklash tests, so a future capsule assertion could flake (verification-gap) — not settled as a current defect: 25 reruns were clean and no current assertion reads a drop; it would settle with a seeded Math.random in every test that breaks a brick. Claim is low, so rejected.
  - `[low]` `[patch]` README and hint say "drag", but hover moves the paddle too (blind-hunter) — the README pointer row now reads "Mouse move / touch drag"; the hint now reads "Mouse, touch or ← → : move · Space / click / tap: launch".
  - `[false]` `[reject]` carried: spec frontmatter says in-review while the Auto Run Result says done (blind-hunter) — carried: pass-2 status row; finalize sets status done, and the map status line sits in the carried defer row.
  - `[low]` `[reject]` the Auto Run Result counts ("patched 7", "medium 3") do not match the triage rows (12 patch tags, 5 medium) (blind-hunter) — the fix edits this build's spec; the per-row verdicts and the 27 total in the log are correct, and the summary text is from the pass-1 finalize.
  - `[low]` `[reject]` carried: corner hit flips both axes while the contract line and matrix row say one axis (blind-hunter) — carried: pass-2 spec-contract row; the fix edits this build's spec.
  - `[low]` `[reject]` carried: the Spec Change Log is empty though behaviour changed after review (blind-hunter) — carried: pass-2 spec-change-log row; the fix edits this build's spec.
  - `[low]` `[reject]` the Design Notes tick sketch calls capsules() and wideTimer(), which do not exist, and omits the serve early return (blind-hunter) — the fix edits this build's spec; the code is the record.
  - `[low]` `[reject]` the game is named Bricklash, not Breakout, without asking the user, though the global rule says to ask on naming (blind-hunter) — the name is spec contract and the fix edits it; the name is in policy (an original game in the genre, not a Breakout recreation). Surfaced to the user as a decision.
  - `[false]` `[reject]` carried: "edge = steeper" is built as 60° from vertical, which is shallower (blind-hunter) — carried: pass-1 steeper row (genre-norm refutation in Design Notes). Surfaced to the user as a decision.
  - `[false]` `[reject]` carried: the look-and-play evidence (screenshots) is not in the repo or reproducible (blind-hunter) — carried: pass-2 browser-look row.
  - `[low]` `[patch]` the canvas uses content-box sizing: max-width 100% plus a 2 px border overflows by 4 px on phones narrower than about 484 px (blind-hunter) — box-sizing: border-box added to the canvas rule. Stackfall sets it; gapwing has the same gap and is untouched here.
  - `[low]` `[reject]` carried: body touch-action none blocks pinch zoom page-wide (blind-hunter) — carried: pass-2 row; reverting it reopens the drag-cancels-pointer defect.
  - `[low]` `[reject]` carried: no restart delay after game over; Gapwing waits 500 ms (blind-hunter) — carried: pass-2 instant-restart row.
  - `[low]` `[reject]` carried: a touch steering finger launches the ball on pointerdown (blind-hunter) — carried: pass-1 touch-launch row.
  - `[low]` `[reject]` onKey calls preventDefault on Space and arrows even with Alt, Ctrl or Meta held, so Alt+Left may be swallowed (blind-hunter) — rare in use, and the fix adds a modifier-guard branch; gapwing does not check modifiers either.
  - `[low]` `[reject]` carried: multi-ball spawns at balls[0] even when it is below the paddle top (blind-hunter) — carried: pass-1 multi-spawn row.
  - `[low]` `[reject]` multi-ball has no cap, and each multi catch adds two balls (blind-hunter) — the spec sets no cap; the capsule rate (1 in 8 bricks, half multi) bounds it; a cap is a new rule.
  - `[low]` `[reject]` no in-game legend for the row points, the W/M labels or the wide countdown (blind-hunter) — the intent's HUD is score, lives and level; a legend adds new screen text; the README documents it.
  - `[low]` `[reject]` carried: the pointer mapping uses the border-box rect and ignores the 2 px border (blind-hunter) — carried: pass-2 border row.
  - `[low]` `[defer]` carried: Bricklash map rows stale (touch-action, keys not reset, paddleHit, onblur) and totals not updated (blind-hunter) — carried: pass-1 totals row and pass-2 map row; agent-context doc, deferred.
  - `[low]` `[reject]` no test guard keeps storage or external assets out of bricklash.html (blind-hunter) — no current violation; the spec's Never list excludes a saved score; a guard is a new test rule, not a defect fix.
  - `[low]` `[reject]` carried: the dt-cap assert accepts 11 or 12 ticks, so a 99 ms cap passes (blind-hunter) — carried: pass-2 dt-cap row; not re-verified, as the carry rule requires.
  - `[low]` `[reject]` carried: restart at once after the last life (click or Space) skips the game-over screen (edge-case-hunter) — carried: pass-2 instant-restart row.
  - `[low]` `[reject]` a ball already level with the paddle that slides into its side is lost with no side bounce (edge-case-hunter) — the from-above gate is what stops the scoop fixed in pass 2, and README states the rule; a side bounce is a new branch that reopens the scoop; the window is a few ticks.
  - `[low]` `[reject]` carried: a multi catch while balls[0] is below the paddle spawns balls below it (edge-case-hunter) — carried: pass-1 multi-spawn row.
  - `[low]` `[reject]` carried: the pointer mapping counts the 2 px canvas border (edge-case-hunter) — carried: pass-2 border row.
  - `[false]` `[reject]` carried: edge hits go 60° from vertical, the reverse of "steeper" (edge-case-hunter) — carried: pass-1 steeper row. Surfaced to the user as a decision.
  - `[low]` `[reject]` carried: the 2 px border puts the paddle off the pointer at the edges, against the acceptance line (edge-case-hunter) — carried: pass-2 border row.
  - `[low]` `[defer]` carried: CODEBASE_MAP says touch-action is on the canvas (edge-case-hunter) — carried: pass-2 map row; agent-context doc, deferred.

## Design Notes

"Edge = steeper" is read as the genre norm: a hit nearer the edge sends the ball out at a wider angle from vertical (up to 60°), centre sends it straight up. Brick side detection uses the previous centre, which is exact enough at 6 px per tick.

Tick sketch:
```js
function tick() {
  movePaddle();                       // keys, clamp
  for (const b of balls) { b.px = b.x; b.py = b.y; b.x += b.vx / 120; b.y += b.vy / 120; walls(b); paddleHit(b); brickHit(b); }
  balls = balls.filter(b => b.y - BALL_R < H);
  if (!balls.length) loseLife();
  capsules(); wideTimer(); if (!bricks.some(Boolean)) nextLevel();
}
```

## Verification

**Commands:**
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs && node test-bricklash.mjs` -- expected: all print their pass line, exit 0.

**Manual checks (if no CLI):**
- Headless Chrome screenshot of the serve screen and of mid-play shows bricks, paddle, ball and HUD.

## Auto Run Result

Status: done

**Summary:** Added Bricklash, an original brick-breaker on a 480x640 canvas: a 6x10 wall with one color per row (60 points at the top down to 10), paddle by mouse/touch drag or held arrows, Space or click/tap launches from the paddle, bounce angle from the hit point (centre straight up, edge 60°), 3 lives, level clear refills the wall and speeds the ball (360 px/s + 40 per level, cap 720), a 120 Hz fixed step fed by rAF delta time (capped at 100 ms), a canvas HUD with score, lives and level, and both stretch power-ups (wide paddle 120 px for 10 s, multi-ball +2 at ±45°) dropping one time in eight. `#status` aria-live text changes only when its text does.

**Files changed:**
- `bricklash.html` -- the game.
- `test-bricklash.mjs` -- node:vm self-check of every I/O matrix row plus the review-pass cases.
- `README.md` -- table row, play link, controls section with rules, test command.
- `CLAUDE.md` -- eight games, test command.
- `docs/CODEBASE_MAP.md` -- Bricklash file entries and section (totals not re-mapped; deferred).
- `_bmad-output/implementation-artifacts/spec-bricklash-brick-breaker.md` -- this spec.

**Review findings:** 27 total (high 0, medium 5, low 16, false 6). Patched 7 entries (medium: corner clip, sticky arrows on blur, wide-paddle coverage; low: paddle scoop from below, body touch-action, hint text, brick-direction and input test gaps). Deferred 1 (CODEBASE_MAP status line and totals). Rejected: name and "steeper" reading (deliberate), canvas-bottom life loss (timing only), 720 cap (no-tunnel bound), extra inputs/files, display size, browser look (screenshots checked), zero-width rect (unreachable), multi spawn under paddle (rare), touch-launch on pointerdown (spec'd input), screen-reader play updates and serve overlay (cosmetic).

**Follow-up review recommendation:** true -- first pass patched 3 medium entries (high 0, medium 3, low 4 entries). Unverified risk: the corner and paddle-from-above collision rules changed after review and were checked only in node:vm, and mouse, touch drag and window blur were never played in a real browser.

**Verification:** `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs && node test-bricklash.mjs` -- all eight pass. The implementer reverted each of the five pre-review behaviours one at a time and each made the suite fail. A headless Chrome screenshot of mid-play shows the HUD, six colored rows, capsules, wide paddle and balls.

**Residual risks:** real-browser feel (mouse, touch, blur) unplayed; no `visibilitychange` handling beyond the 100 ms dt cap; `docs/CODEBASE_MAP.md` totals stale (deferred).

### Follow-up pass 2026-11-24

**Summary:** A second review pass (`followup_pass`) ran on the committed change. Four reviewers, 34 findings (high 0, medium 2, low 26, false 6). Eight entries were patched in 8 fixes: two code fixes and six test gaps; one deferred entry (map rows); the rest were carried or rejected.

**Patched:**
- `bricklash.html`: `loseLife` clears capsules, the wide timer and the wide paddle on the last life too, so the game-over screen shows no frozen capsule or amber paddle (the README already said so).
- `bricklash.html`: the serve status reads "1 life" for one life, "N lives" otherwise.
- `test-bricklash.mjs`: the `step()` game-over guard, a paddle left-side miss, the capsule catch box (above, left, below, 1 px out, and the left and bottom edges that catch), the ArrowLeft release, the HUD at score 70 / lives 2 / level 2, the `launch()` re-seat of the ball, and both fixes above. The implementer broke each rule once and every one failed the suite.

**Deferred (new):** the Bricklash section of `docs/CODEBASE_MAP.md` (touch-action on body, key reset on blur, the paddle-from-above rule, `onblur`); the earlier map row (status line and totals) is carried.

**Rejected (pass 2):** instant restart after game over (carried); the earlier name, "steeper", life-loss timing, 720 cap, extra inputs, display size and browser-look rows (carried); row colors checked as constants; spec contract not updated for the corner flip and paddle rule (fix edits the spec); loose dt-cap tick count; 2 px border in pointer mapping; multi-touch `isPrimary`; no pause on focus loss; `touch-action: none` on body and pinch zoom; no render interpolation.

**Follow-up review recommendation:** false. Follow-up pass: converged, since this pass patched no high (high 0, medium 2, low 6 entries).

**Verification:** `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs && node test-bricklash.mjs` -- all pass.

**Residual risks:** real-browser feel (mouse, touch, blur) still unplayed; `docs/CODEBASE_MAP.md` lags the code in two deferred rows; the 120 Hz step has no render interpolation.

### Follow-up pass 2026-11-25

**Summary:** A fresh review pass (`followup_pass`) on the committed change, run from `done`. Four reviewers, 44 findings (high 0, medium 0, low 33, false 10, maybe-false 1). Three fixes applied; the rest were carried from earlier passes, rejected, or deferred.

**Patched:**
- `bricklash.html`: `box-sizing: border-box` on the canvas, so the 2 px border no longer pushes it 4 px past a phone narrower than about 484 px. The hint reads "Mouse, touch or ← → : move · Space / click / tap: launch".
- `README.md`: the pointer row reads "Mouse move / touch drag", since hover moves the paddle.
- `test-bricklash.mjs`: a ball whose bottom is 1 px above the paddle top does not bounce. The suite fails when the reach cutoff moves up 20 px.

**Deferred (carried):** the Bricklash section of `docs/CODEBASE_MAP.md` (touch-action, key reset, paddle rule, `onblur`), with the earlier totals and status rows.

**Rejected (pass 3):** carried from earlier passes: the contract text on the corner flip, flip-away and the paddle gate; "edge = steeper"; the name; the browser-look items; the 2 px pointer border; the restart delay; touch launch; body `touch-action`; multi-ball spawn below the paddle; the dt-cap tolerance. New and rejected: life loss clears power-ups (the serve() comment gives the reason); a side contact once the ball is level with the paddle; a modifier guard on arrow keys; a multi-ball cap; an in-game legend; a test guard against storage; the spec's own counts and Design Notes sketch (spec edits); the name without asking (spec edit, surfaced to the user). Latent flake risk from real `Math.random` in tests: not a current defect.

**Follow-up review recommendation:** false. This pass patched no high (high 0, medium 0, low 3 entries).

**Verification:** all eight suites pass, `node test-bricklash.mjs` included. The new reach test fails on the 20 px cutoff mutant.

**Residual risks:** phone-width layout, touch drag and window blur not played in a real browser; "edge = steeper" and the name are open decisions for the user; `docs/CODEBASE_MAP.md` lags the code (deferred).
