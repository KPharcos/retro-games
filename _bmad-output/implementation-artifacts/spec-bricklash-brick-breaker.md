---
title: 'Bricklash: brick-breaker game'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_revision: 'a0b92b3e62ba07497d7051f303897fe3ebd56795'
review_loop_iteration: 0
followup_review_recommended: true
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
