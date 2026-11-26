---
title: 'Rallyline: paddle-and-ball duel'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_revision: '81050303b0a3e628aad8b214f2c56bea3c74129a'
review_loop_iteration: 0
followup_review_recommended: true
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md was hand-edited, not re-mapped: its frontmatter totals (total_files 30, total_tokens, last_mapped) and the "30 tracked project files" line do not count the three new files, and its spec-status line for Rallyline will lag.
    evidence: |-
      Review pass 1 (blind-hunter, edge-case-hunter). CODEBASE_MAP is an agent-context doc linked from CLAUDE.md, so the fix is deferred; a cartographer re-map refreshes it, as after earlier games.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no two-paddle ball duel. The user wants one in a single HTML file on an 800x500 canvas: left paddle on W/S, right paddle a beatable AI that follows the ball's y at up to 4 px per frame, serve from centre at a random angle in -30..30°, ball speed +5% per paddle hit, bounce angle set by the hit position, first to 7 wins, score at the top and "Space to serve". Stretch: a 2-player local mode toggle and an AI difficulty slider.

**Approach:** Add `rallyline.html`, an original paddle duel in the repo's canvas game shape (copy `bricklash.html`'s structure), plus `test-rallyline.mjs` on `harness.mjs`. The user said "Pong"; the game ships under the original name Rallyline with its own palette, since the repo builds originals in a genre, not copies of a named game (same call as Bricklash).

## Boundaries & Constraints

**Always:**
- Shared shape: one bare `<script>`, top-level `let` state, `reset()`, `step(dt)`, read-only `render()`, `onKey(e)` on `e.code` via `document.addEventListener`, rAF `frame` loop with dt capped at 100 ms, `#status` aria-live written through `setText`.
- Fixed 60 Hz step: `step(dt)` accumulates and runs `tick()` every `1000 / 60` ms, so "per frame" means per tick on any display. All speeds below are px per tick.
- Canvas `width="800" height="500"`. Paddles 12x80; left paddle x = 20, right paddle x = 768; both start vertically centred and stay inside 0..500.
- Left paddle: W up, S down, 6 px per tick while held (keydown/keyup). `onblur` clears held keys.
- Right paddle, 1 player: AI moves its centre toward the ball's y by at most `aiSpeed` px per tick (default 4). 2 players: ArrowUp / ArrowDown at 6 px per tick, AI off.
- Ball 10x10 square, centred on (x, y). Serve state: ball at (400, 250), still; paddles move. Space (not a repeat) serves at speed 5, angle `(Math.random() * 60 - 30)°` from horizontal, toward the right if a second `Math.random() < 0.5`, else left.
- Top and bottom walls reflect (direction away from the wall).
- Paddle hit only when the ball's leading edge crosses the paddle's front face this tick while moving toward it, and the ball's y span overlaps the paddle. Then: speed × 1.05, angle `60° * clamp((ballY - paddleCentreY) / 45, -1, 1)` from horizontal, x direction away from the paddle, ball set flush with the face. Centre = flat, edge = 60°.
- A ball fully past the left edge scores for the right side, past the right edge for the left side. At 7 the match ends (state over, winner shown); otherwise back to serve with speed reset to 5.
- Score drawn as two large numbers at the top, left and right of a dashed centre line; serve screen shows "Space to serve"; over screen names the winner and "Space to play again", which resets scores to 0-0 and serves again.
- Stretch controls in the page: a "2 players" checkbox (`#two`) and an "AI speed" range (`#ai`, 2..8, step 1, value 4), read through one `document.addEventListener('input', …)`. Mode and AI speed apply at once, no match reset; the range is disabled in 2-player mode. Space on the focused checkbox toggles it and does not serve; a checkbox changed by mouse loses focus so Space serves next.
- Space always gets `preventDefault`; arrows get it only in 2-player mode (so the range stays keyboard-adjustable in 1-player mode).

**Never:** the name "Pong" or Atari-style branding; touch or pointer paddle control, sound, pause, saved scores, a speed cap or ball spin; a dependency or build step; edits to `harness.mjs` or other games.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open | load | serve, 0-0, ball at centre, paddles centred | — |
| Serve | Space, random 0.5 / 0.2 | speed 5, angle 0°, moving right / left | repeat ignored; Space while playing ignored |
| Serve angle range | random 0 / 0.999… | -30° / just under +30° | — |
| Left paddle | W held 1 tick, at top | y - 6, then clamped at 0 | keyup and blur stop it |
| AI | ball 100 px below AI centre | AI centre moves 4 / tick; aiSpeed 8 → 8 | gap < aiSpeed → lands exactly on ball y |
| 2 players | `#two` checked | arrows move right paddle 6/tick, AI does not move it | unchecking hands back to AI |
| Paddle hit | ball reaches left face at paddle centre / bottom edge | flat to the right / 60° down-right, speed 5.25 | ball moving away or already past the face: no hit |
| Speed up | two hits | speed 5 × 1.05² | — |
| Wall | ball at top moving up | vy flips down | — |
| Point | ball past right edge | left +1, serve, speed 5 | — |
| Win | left at 6 scores | over; 1 player: "You win" / "AI wins", 2 players: "Left wins" / "Right wins" | Space → 0-0 serve |
| Fixed step | step(16) then step(1) | 0 ticks, then 1 | frame() caps dt at 100 ms |

</intent-contract>

## Code Map

- `bricklash.html` -- template: page CSS, `#status`, `setText`, `step`/`frame` accumulator and 100 ms cap, `onKey` with `String(e.code)`, `onKeyUp`, bare `onblur =` global, read-only `render()`.
- `harness.mjs` `load(file, globals)` -- stub `document`; `addEventListener` keeps the last listener per type (`listeners.input`, `listeners.keyup` available); stub elements accept any property set. Stub Math via `globals: { Math: Object.create(Math) }`.
- `test-bricklash.mjs` -- test style: markup asserts, `run(...)`, `key()`, `near()`, spreading vm arrays before `deepEqual`, render-is-read-only, status text, rAF wiring.
- `README.md` (table, play links, open-file list, controls sections, test command), `CLAUDE.md` (game count, list, test command), `docs/CODEBASE_MAP.md` (summary count, diagram, tree, sections, test notes, navigation, test command) -- add Rallyline between Pairflip and Snake.

## Tasks & Acceptance

**Execution:**
- `rallyline.html` -- the game per the contract -- new feature.
- `test-rallyline.mjs` -- node:vm self-check of every I/O matrix row, canvas size, one script, no "pong", render() read-only, status text, rAF wiring, input handler for `#two`/`#ai` -- repo rule: new logic leaves a test.
- `README.md` -- table row, play link, file list, controls section, test command -- docs list every game.
- `CLAUDE.md` -- nine games, Rallyline in list and test command -- agent context.
- `docs/CODEBASE_MAP.md` -- Rallyline entries where other games are listed, test command -- keeps the map current.

**Acceptance Criteria:**
- Given the page is open, when it loads, then the canvas shows both paddles, the ball at centre, a dashed centre line, "0" and "0" at the top and "Space to serve".
- Given 1-player mode and AI speed 4, when the ball leaves the left paddle at a 60° edge angle, then the AI paddle can fail to reach it (beatable).
- Given the AI speed slider is moved to 8, when play continues, then the AI paddle moves up to 8 px per tick.
- Given the full test command, when run, then every suite passes.

## Spec Change Log

## Review Triage Log

### 2026-11-26 — Review pass
- verdicts: 24 findings — high 0, medium 3, low 10, false 9, maybe-false 2
- findings:
  - `[low]` `[defer]` CODEBASE_MAP frontmatter `total_files` / `last_mapped` and the "30 tracked project files" line not updated (blind-hunter) — agent-context doc; deferred, a cartographer re-map refreshes it, as after earlier games.
  - `[low]` `[patch]` literal `45` in paddleHit and `RX = 768` hand-computed (blind-hunter) — derived from `PH / 2 + HALF` and `W - LX - PW`.
  - `[medium]` `[patch]` paddle y overlap and hit offset checked at end-of-tick y, not at the face crossing (blind-hunter) — y at the crossing is computed and used for the overlap test and the bounce offset; hit/miss tests added where the two disagree.
  - `[low]` `[patch]` dt-cap test comment says 6 ticks and accepts two values; the code always runs 5 (blind-hunter) — exact count asserted, comment fixed.
  - `[medium]` `[patch]` 60 Hz tick equals a 60 Hz display's frame period, so rAF jitter gives 0-tick then 2-tick frames (blind-hunter) — `acc` snaps to `TICK` within 0.5 ms; step(16) → 0 then step(1) → 1 still holds; jitter test added. Gapwing uses the same 60 Hz step and is not touched (other games out of scope).
  - `[low]` `[patch]` right paddle tested only at centre (blind-hunter) — mirrored edge-angle, moving-away/past-face, outside-span and no-tunnel tests for the right paddle.
  - `[low]` `[patch]` right side reaching 7 through play never tested (blind-hunter) — grouped with the verification-gap row; test drives scoreR 6 → 7 through tick().
  - `[low]` `[reject]` winner label follows a mode change made on the over screen (blind-hunter) — happens only if the player ticks the box after the match ends; a fix adds stored mode state. Mid-match mode change is spec'd ("no match reset").
  - `[maybe-false]` `[reject]` Space on the focused checkbox may toggle twice in a browser that activates on keyup (blind-hunter) — both keydown and keyup Space are `preventDefault`ed and the implementer saw one toggle in real Chrome; settling it needs Firefox/Safari runs. If true: low (the box ends unchanged, game state stays in sync with it, mouse toggling works).
  - `[false]` `[reject]` review not done; spec in-progress (blind-hunter) — this log is that review; finalize sets status done. The map's spec-status line is in the deferred map row.
  - `[medium]` `[patch]` overlap at end-of-tick y (edge-case-hunter) — same entry as the blind-hunter crossing row.
  - `[maybe-false]` `[reject]` Space on checkbox toggles twice on keyup (edge-case-hunter) — same as the blind-hunter row.
  - `[false]` `[reject]` restored form state desyncs the controls from the game (edge-case-hunter) — both inputs carry `autocomplete="off"`, which stops Firefox form restoration; a bfcache restore keeps the JS state with the DOM.
  - `[low]` `[defer]` CODEBASE_MAP totals stale (edge-case-hunter) — same as the blind-hunter map row.
  - `[low]` `[patch]` right side reaching 7 via point(false) untested; a `scoreL === WIN`-only mutant passes (verification-gap) — test added.
  - `[low]` `[patch]` step() loop guard after a mid-step win untested (verification-gap) — test with step(34) across the winning point added.
  - `[low]` `[patch]` left-edge "still on screen" scoring boundary not pinned (verification-gap) — mirror assertion added.
  - `[false]` `[reject]` game named Rallyline, not Pong; a test forbids the word (intent-alignment) — deliberate: the repo builds originals in a genre, not named-game copies; every Pong-genre rule in the intent is built (same call as Bricklash).
  - `[false]` `[reject]` displayed size may be under 800x500 (intent-alignment) — the canvas is 800x500; CSS only shrinks it on small viewports, like every canvas game here.
  - `[false]` `[reject]` "per frame" redefined as a 60 Hz tick (intent-alignment) — equal to one frame on 60 Hz displays and keeps 4 px/frame speed the same on 120/144 Hz ones; recorded in the contract.
  - `[false]` `[reject]` at slider max 8 the AI is beatable only after the ball speeds up (intent-alignment) — "beatable" is about the 4 px default, which a 60° edge shot beats at once; 8 is the hard end of the requested difficulty slider.
  - `[false]` `[reject]` score placement "at top" untested (intent-alignment) — score is drawn at y 70 on a 500 px canvas, and the headless Chrome screenshot shows it at the top; the harness records text only.
  - `[false]` `[reject]` stretch controls tested through stubs, not real widgets (intent-alignment) — the implementer drove the real checkbox and range in Chrome over DevTools; Firefox/Safari carried to residual risk.
  - `[false]` `[reject]` extra files beyond a single HTML file (intent-alignment) — the game is one file; the test and docs follow repo convention.

## Design Notes

At speed 5 and 60°, vy ≈ 4.33 px/tick, already faster than the default AI's 4, and speed grows each hit, so edge shots beat the AI. Front-face crossing (prev leading edge on the near side, new one past it) stops fast balls tunnelling through the 12 px paddle without a cap.

## Verification

**Commands:**
- `node test-bricklash.mjs && node test-gapwing.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs && node test-rallyline.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs` -- expected: all pass, exit 0.

**Manual checks (if no CLI):**
- Headless Chrome screenshot of the serve screen shows paddles, ball, centre line, score and "Space to serve".

## Auto Run Result

Status: done

**Summary:** Added Rallyline, an original paddle-and-ball duel on an 800x500 canvas: left paddle on W/S, right paddle an AI that follows the ball's y at up to 4 px per tick (beatable by edge shots), serve from centre at a random -30..30° toward a random side, speed ×1.05 per paddle hit, bounce angle from the hit point (centre flat, edge 60°), first to 7 wins, score at the top, "Space to serve" and "Space to play again". Both stretch items ship: a "2 players" checkbox (right paddle on ↑/↓) and an AI speed slider (2-8). The game runs a 60 Hz fixed step with the dt capped at 100 ms. The user said "Pong"; it ships under the original name Rallyline, as with Bricklash.

**Files changed:**
- `rallyline.html` -- the game.
- `test-rallyline.mjs` -- node:vm self-check of every I/O matrix row plus the review-pass cases.
- `README.md` -- table row, play link, file list, controls section, test command.
- `CLAUDE.md` -- nine games, test command.
- `docs/CODEBASE_MAP.md` -- Rallyline entries and section (totals not re-mapped; deferred).
- `_bmad-output/implementation-artifacts/spec-rallyline-paddle-duel.md` -- this spec.

**Review findings:** 24 total (high 0, medium 3, low 10, false 9, maybe-false 2). Patched 8 entries (medium 2: paddle hit at the face-crossing y, 60 Hz jitter snap; low 6: derived constants, exact dt-cap test, right-paddle mirror tests, right-side win through play, step() guard after a mid-step win, left-edge scoring boundary). Deferred 1 (CODEBASE_MAP totals and status line). Rejected: the name (deliberate), display size (CSS shrink only), per-frame as a 60 Hz tick (contract), slider max hard to beat (by design), score placement untested (screenshot checked), stub-tested controls (driven in real Chrome), extra files (repo convention), restored form state (`autocomplete="off"`), the winner label following a post-match mode change (rare, adds state), Space double toggle on keyup browsers (maybe-false, low if true), "review not done" (this pass).

**Follow-up review recommendation:** true -- this first pass patched 2 medium entries (high 0, medium 2, low 6 entries). Unverified risk: the collision now uses the crossing y and runs before the wall bounce, which was checked only in node:vm, and the Chrome checks were not re-run after the patches.

**Verification:** `node test-bricklash.mjs && node test-gapwing.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs && node test-rallyline.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs` -- all nine pass. The implementer broke four rules on purpose (step guard, jitter snap, crossing y, flush y) and each made the suite fail. Before the patches, a headless Chrome screenshot of the serve screen showed the paddles, ball, centre line, 0-0 and "Space to serve", and real Chrome checks via DevTools showed that Space on the checkbox and a mouse click on it behave as specified.

**Residual risks:** Space on the focused checkbox not checked in Firefox or Safari; real-browser play not re-checked after the collision patch; Gapwing keeps the same 60 Hz jitter (other games out of scope); `docs/CODEBASE_MAP.md` totals stale (deferred).
