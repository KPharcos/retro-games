---
title: 'Rallyline: paddle-and-ball duel'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_revision: '81050303b0a3e628aad8b214f2c56bea3c74129a'
review_loop_iteration: 0
followup_review_recommended: false
followup_pass: true
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
  - summary: >-
      docs/CODEBASE_MAP.md's getElementById gotcha names only test-rallyline, test-snake and test-stackfall as checking element ids; the Minefield, Molebop, Pairflip and Twofold tests check them too.
    evidence: |-
      Follow-up pass (blind-hunter). Each of those four tests asserts that every requested id exists in the markup. The sentence already left them out on main (8105030). Agent-context doc, so deferred.
    location: >-
      docs/CODEBASE_MAP.md (Gotchas, default getElementById stub)
    severity: low
  - summary: >-
      docs/CODEBASE_MAP.md's data-flow diagram note and Conventions section do not mention Rallyline's document-level input listener for page controls.
    evidence: |-
      Follow-up pass (blind-hunter). The diagram note (keydown, pointerdown to flap()) is unchanged from main and Conventions has no mention of the listener; the Rallyline module section does describe it. Agent-context doc, so deferred.
    location: >-
      docs/CODEBASE_MAP.md (data-flow diagram note, Conventions)
    severity: low
  - summary: >-
      docs/CODEBASE_MAP.md's Rallyline gotcha says #two and #ai are read only through the input listener, but the Space toggle also calls readControls(); the navigation bullet omits that call too.
    evidence: |-
      Follow-up pass 2 (blind-hunter, verification-gap). The Space branch of onKey calls readControls() as well as the input listener does. Agent-context doc, so deferred to the cartographer re-map.
    location: >-
      docs/CODEBASE_MAP.md (Rallyline gotchas and navigation)
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

### 2026-11-26 — Review pass (follow-up)
- verdicts: 35 findings — high 0, medium 3, low 28, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` wall bounce and paddle face in the same tick: crossing y ignores the wall (blind-hunter) — reproduced: three covered balls missed and one took its angle from y 2.8; the pass-1 patch caused it by moving paddleHit ahead of the wall checks. The crossing y is now mirrored off the wall before overlap and angle; top and bottom tests pin the y, the velocity and the call order.
  - `[low]` `[patch]` tests miss the paddle-before-wall order, paddles staying after a point and held keys surviving reset (blind-hunter) — the wall tests pin the order; the other two have new tests.
  - `[low]` `[patch]` tests never check the drawing (blind-hunter) — the stub records fillRect and text positions; paddles, ball, a centre dash and both scores asserted.
  - `[low]` `[patch]` aria-live, autocomplete="off" and the repeat guard on the checkbox are unasserted (blind-hunter) — asserts added; a checkbox-only repeat mutant now fails.
  - `[false]` `[reject]` readControls() never runs at load (blind-hunter) — carried: both inputs have autocomplete="off", which stops form restoration, and a bfcache restore keeps the JS state with the DOM.
  - `[low]` `[reject]` onInput blurs the checkbox on any activation, not just the mouse (blind-hunter) — real for assistive-technology or switch clicks; focus can be tabbed back, and the fix adds pointer-detection logic.
  - `[low]` `[reject]` after tabbing to the checkbox, Space keeps toggling it while the screen says "Press Space to serve" (blind-hunter) — normal behaviour for a focused checkbox and what the contract asks; Tab moves off it; not worth more hint text.
  - `[low]` `[reject]` onKey ignores Ctrl, Meta and Alt (blind-hunter) — a modified key is unlikely mid-rally, blur or another keyup frees a stuck key, and the fix adds a guard.
  - `[low]` `[patch]` README says speeds are per frame on any display (blind-hunter) — now stated per 1/60 s step in the table and the rules paragraph.
  - `[low]` `[reject]` AI speed slider shows no number (blind-hunter) — the thumb shows the level; a readout adds an element and update code the intent did not ask for.
  - `[low]` `[reject]` winner label changes if the mode is toggled after the match (blind-hunter) — carried: needs a tick of the box after the match ends; the fix adds stored mode state.
  - `[low]` `[defer]` CODEBASE_MAP spec-status line and totals stale (blind-hunter) — carried: already in the deferred map entry.
  - `[low]` `[defer]` CODEBASE_MAP element-id gotcha omits four tests that check ids (blind-hunter) — verified; the omission is on main; agent-context doc.
  - `[low]` `[defer]` CODEBASE_MAP diagram note and Conventions omit the input listener (blind-hunter) — verified; agent-context doc.
  - `[medium]` `[patch]` ball crossing a wall and the paddle face in one tick misses a covering paddle (edge-case-hunter) — same entry as the blind-hunter wall row; mirrored rather than clamped, so the y matches the bounce.
  - `[low]` `[reject]` a ball that just misses a paddle end can then overlap the paddle body (edge-case-hunter) — visual only, the ball is already past the face and goes on to score; the contract limits hits to a front-face crossing and side collision adds a branch.
  - `[low]` `[reject]` winner label changes if the mode is toggled on the over screen (edge-case-hunter) — carried: as the blind-hunter winner row.
  - `[low]` `[reject]` Ctrl, Meta or Alt keydown moves paddles or serves (edge-case-hunter) — as the blind-hunter modifier row.
  - `[low]` `[reject]` mouse press dragged off the checkbox leaves it focused, so Space toggles it (edge-case-hunter) — rare gesture, the box visibly changes and Space again restores it; the fix adds a pointer listener.
  - `[low]` `[reject]` non-mouse checkbox activation loses focus (edge-case-hunter) — as the blind-hunter blur row.
  - `[low]` `[defer]` CODEBASE_MAP totals stale (edge-case-hunter) — carried: already in the deferred map entry.
  - `[low]` `[patch]` no test for a ball passing above a paddle (verification-gap) — left and right cases added.
  - `[low]` `[patch]` no test that paddles, ball or centre line are drawn (verification-gap) — fillRect asserts added.
  - `[low]` `[patch]` right-hand canvas score and hiding the serve prompt untested (verification-gap) — in-play canvas text asserted as exactly 2 and 4 at their positions.
  - `[low]` `[patch]` no test for a held key carrying through a restart (verification-gap) — test added.
  - `[low]` `[patch]` no test that paddles stay put after a point (verification-gap) — test added.
  - `[medium]` `[patch]` ball passes through a paddle when it reaches a wall and the face in one tick, including at serve speed (verification-gap) — same entry as the blind-hunter wall row.
  - `[low]` `[defer]` CODEBASE_MAP spec-status line outdated (verification-gap) — carried: already in the deferred map entry.
  - `[low]` `[reject]` the 0.5 ms snap lets 58.3-61.8 Hz displays tick at their refresh rate, not exactly 60 Hz (intent-alignment) — at most about 3% in speed, unlikely to be noticed; a narrower window brings jitter back and interpolation adds code.
  - `[false]` `[reject]` restarting takes two Space presses (intent-alignment) — the matrix row "Space → 0-0 serve" names the serve state, and the restarted screen shows "Space to serve".
  - `[low]` `[reject]` a finished match can be relabelled by the mode toggle (intent-alignment) — carried: as the blind-hunter winner row.
  - `[low]` `[patch]` tests do not see drawing or score placement (intent-alignment) — covered by the new fillRect and text-position asserts.
  - `[false]` `[reject]` displayed size may be under 800x500 (intent-alignment) — carried: the canvas is 800x500; CSS only shrinks it on small viewports.
  - `[false]` `[reject]` controls tested through stubs, not real widgets (intent-alignment) — carried: real-browser checks cover them; this auditor reports Chrome and Firefox matching the contract.
  - `[low]` `[defer]` CODEBASE_MAP spec-status line and totals (intent-alignment) — carried: already in the deferred map entry.

### 2026-11-26 — Review pass (follow-up 2)
- verdicts: 34 findings — high 0, medium 0, low 25, false 8, maybe-false 1
- findings:
  - `[low]` `[patch]` walls clamp the overshoot while paddleHit mirrors it, so a wall bounce is not a reflection (blind-hunter) — walls now reflect: top `min(2 * HALF - y, H - HALF)`, bottom `max(2 * (H - HALF) - y, HALF)`, so an extreme overshoot stays on court. Pinned expectations are now [7, 3, 4] and [493, 3, -4], derived from the inputs. The map's Logic row also now says walls reflect; that is an agent-context edit routing would defer, kept so the map does not describe the old clamp (flagged in the Auto Run Result).
  - `[low]` `[reject]` carried: the 0.5 ms snap makes the tick rate follow 59 and 61 Hz displays (blind-hunter) — carried: same row as the first follow-up pass (intent-alignment): about 3% in the 58.3-61.8 Hz band; a narrower window brings jitter back, and a carry changes the snap that fixed it.
  - `[low]` `[reject]` carried: Space on the focused checkbox keeps focus, so the next Space toggles it again (blind-hunter) — carried: the spec says Space toggles the focused box and only a mouse change loses focus; Tab moves off it.
  - `[maybe-false]` `[reject]` carried: Space on the checkbox could toggle twice in a browser that also toggles on keyup (blind-hunter) — carried: keydown and keyup are both prevented; Chrome and Firefox show one toggle; Safari unchecked.
  - `[low]` `[defer]` carried: the map's spec-status line says "in-progress, no review passes yet" (blind-hunter) — carried: already in the deferred map entry.
  - `[low]` `[defer]` carried: the map's totals (total_files 30, "30 tracked project files") do not count the three new files (blind-hunter) — carried: already in the deferred map entry.
  - `[low]` `[defer]` the map's Rallyline gotcha says #two and #ai are read only through the input listener, but the Space toggle also calls readControls() (blind-hunter) — new; same entry as the verification-gap gotcha row; agent-context doc, deferred.
  - `[false]` `[reject]` carried: controls are not read at load, so the page defaults are copied into twoPlayer and aiSpeed (blind-hunter) — carried: both inputs carry autocomplete="off", which stops form restoration; a bfcache restore keeps the JS state with the DOM.
  - `[false]` `[reject]` the Spec Change Log is empty (blind-hunter) — refuted: the template fills it only on a bad_spec loopback; this pass patched code without one.
  - `[false]` `[reject]` the bounce-angle clamp in paddleHit is dead code (blind-hunter) — refuted as a defect: the overlap guard bounds the offset to ±45 px, so the clamp never fires; harmless, nothing to fix.
  - `[false]` `[reject]` onKeyUp reads e.code without String() (blind-hunter) — refuted: onKeyUp only compares and deletes; a missing code matches nothing and does no harm.
  - `[false]` `[reject]` the second paddleHit reads pre-tick px/py after the first call moved the ball (blind-hunter) — refuted: the right check needs the ball's lead at or past the right face; a left hit leaves it at x 37, so the right check cannot pass today; latent only.
  - `[low]` `[patch]` no test where a paddle moves into the ball in the same tick (blind-hunter) — verified: a mutant that moves the paddles after the collision checks survived; test added (left paddle at 260 with KeyW held hits the ball).
  - `[low]` `[patch]` no AI top-bound test (blind-hunter) — same entry as the verification-gap top-bound row; test added.
  - `[low]` `[patch]` no top/bottom clamp test for the 2-player arrows (blind-hunter) — same entry; tests added at 0 and 420.
  - `[low]` `[reject]` W/S use e.code, so on AZERTY the letters are not where the hint says (blind-hunter) — repo-wide convention shared with Snake and Stackfall; the key in the W/S position works on any layout; switching to e.key changes three games' convention, more than a direct correction.
  - `[low]` `[reject]` a vertical step larger than the court mis-places the crossing y (edge-case-hunter) — needs a vertical step above about 490 px per tick, about 97 paddle hits with no point; the AI cannot track a ball that fast; the fix needs a fold helper, more than a direct correction.
  - `[low]` `[reject]` carried: a ball that has passed the paddle face can overlap the paddle body and still scores (edge-case-hunter) — carried: the I/O matrix says no hit once past the face; visual only.
  - `[low]` `[reject]` carried: fixed-step drift at 58.3-61.9 Hz (edge-case-hunter) — carried: same as the blind-hunter drift row.
  - `[false]` `[reject]` carried: the AI moves 2 px per frame on a 120 Hz display (edge-case-hunter) — carried: the contract defines speeds per 60 Hz tick; README says so.
  - `[low]` `[patch]` the right paddle's top bound (AI and 2-player) is unverified: dropping it leaves the suite green (verification-gap) — pre-verified by the layer's mutant; tests added: the AI reaches 0 after 100 ticks, 2-player reaches 0 and stays at 420.
  - `[low]` `[patch]` right-paddle motion during serve is unverified: freezing the AI or the 2-player arrows leaves the suite green (verification-gap) — pre-verified; tests added: AI 420 to 210 in 60 serve ticks, ArrowUp in serve moves 6 px per tick. Same entry as the intent row on AI motion in serve.
  - `[low]` `[patch]` walls clamp instead of reflecting, unlike paddleHit's mirror (verification-gap) — same entry as the blind-hunter wall row.
  - `[low]` `[defer]` carried: the map's spec-status row is wrong (verification-gap) — carried: already in the deferred map entry.
  - `[low]` `[defer]` the Rallyline gotcha is overstated (verification-gap) — same entry as the blind-hunter gotcha row.
  - `[low]` `[defer]` carried: the map's file count is stale (verification-gap) — carried: already in the deferred map entry.
  - `[low]` `[reject]` carried: the snap makes the tick rate follow 58-62 Hz displays, not the literal 1000/60 ms rule (intent-alignment) — carried: same as the blind-hunter drift row.
  - `[false]` `[reject]` Space keyup is also prevented, beyond the contract (intent-alignment) — refuted as a defect: the keyup prevent stops a browser that toggles on keyup from flipping the box a second time; tests assert it.
  - `[low]` `[patch]` AI motion during serve is untested (intent-alignment) — same entry as the verification-gap serve row.
  - `[low]` `[patch]` Space on the focused checkbox is tested only in serve (intent-alignment) — verified: a mutant limiting the toggle to serve survived; test added (toggle during play, state unchanged).
  - `[low]` `[reject]` carried: focus stays on the checkbox after a keyboard toggle (intent-alignment) — carried: same as the blind-hunter focus row.
  - `[low]` `[reject]` carried: the browser tier is covered by stubs (CSS, focus, blur, rAF, canvas pixels) (intent-alignment) — carried: real-browser checks from earlier passes cover it; the repo's tests use stubs by design.
  - `[false]` `[reject]` the listener count cannot be verified because the stub keeps one listener per type (intent-alignment) — refuted: the game adds keydown, keyup and input once each at load, so each type has one listener.
  - `[low]` `[defer]` carried: the map's spec-status side note (intent-alignment) — carried: already in the deferred map entry.

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

### Follow-up pass 2026-11-26

**Summary:** A fresh review pass (`followup_pass`) on the committed change, run from `done`. Four reviewers, 35 findings (high 0, medium 3, low 28, false 4). It found one real gameplay bug: if the ball bounced off the top or bottom wall and reached a paddle face in the same tick, the paddle could miss a ball it covered, which scored a wrong point. The pass-1 collision patch had introduced it. It happened at serve speed with a paddle close to, but not touching, a wall, and with a paddle flush on the wall once the ball was fast.

**Patched:** 8 entries (high 0, medium 1, low 7).
- `rallyline.html`: the crossing y is mirrored off the wall before the overlap test and the bounce angle (medium).
- `test-rallyline.mjs`: ball above a paddle; paddle, ball and centre-dash drawing; in-play scores and their positions; a held key through a restart; paddles staying after a point; the aria-live, autocomplete and checkbox-repeat guards. Top and bottom wall cases cover the fix.
- `README.md`: speeds are stated per 1/60 s step, not per frame.

**Files changed:** `rallyline.html`, `test-rallyline.mjs`, `README.md`, `docs/CODEBASE_MAP.md` (one clause on the mirrored y), and this spec.

**Deferred:** two new `docs/CODEBASE_MAP.md` entries (element-id gotcha; input listener missing from the diagram note and Conventions). The earlier totals and status-line entry is carried.

**Rejected:** carried: controls not read at load; the winner label following a mode change after the match; display size; stub-tested controls. New: a non-mouse checkbox activation losing focus (needs pointer detection); Space toggling a tabbed-to checkbox (normal checkbox behaviour, per the contract); Ctrl/Meta/Alt not filtered (unlikely, adds a guard); no number on the AI slider (not asked for); overlap with a paddle body after a miss (visual only, front-face hits per the contract); a drag-off leaving the checkbox focused (rare, adds a listener); 58.3-61.8 Hz displays ticking at refresh rate (about 3% at most); two presses to restart (false: the matrix says Space goes to the serve state).

**Follow-up review recommendation:** false. Follow-up pass converged: no high patched (high 0, medium 1, low 7).

**Verification:** all nine suites pass (the command under Verification), run after the patches. The three missed-ball repros and the off-court-angle repro now hit inside the court. On a scratch copy, removing the mirror, moving the paddle checks after the wall checks, and letting a repeat Space toggle the checkbox each failed the suite.

**Process notes:** the harness only runs subagents in the background, so the run waited for their completion notices instead of making blocking calls. This pass left the spec out of the review diff; the pass-1 diff had included it. Even so, reviewers other than the edge-case layer saw it: the intent auditor said it opened the file, and the blind hunter cited its contents.

**Residual risks:** no real-browser rally played since either collision change. The intent auditor reports one toggle per Space on the checkbox in Chrome and Firefox; Safari is unchecked. A ball bouncing off both walls in one tick is not handled; by the speed formula that needs roughly 97 paddle hits. `docs/CODEBASE_MAP.md` still lags in the deferred places.

### Follow-up pass 2026-11-26 (2)

**Summary:** Third review pass (`followup_pass`) on the committed change, run from `done`. Four reviewers, 34 findings (high 0, medium 0, low 25, false 8, maybe-false 1). Nine rows were patched in five entries: walls now reflect instead of clamping, so a wall bounce matches the paddle path; the right paddle's bounds and motion during serve, a same-tick paddle move and the checkbox toggle during play are now tested. One new deferred item: the map's Rallyline gotcha. Everything else was carried, rejected or refuted.

**Patched:** 9 rows (low 9). Entries: walls (rows 1, 23); right-paddle bounds (14, 15, 21); right-paddle motion in serve (22, 29); same-tick paddle move (13); checkbox toggle during play (30).
- `rallyline.html`: a wall bounce reflects with the overshoot kept, clamped to the court.
- `test-rallyline.mjs`: asserts for those cases; wall expectations now [7, 3, 4] and [493, 3, -4].
- `docs/CODEBASE_MAP.md`: the Logic row says walls reflect. Agent-context edit that routing would defer; kept so the map does not describe the old clamp.

**Deferred (new):** the Rallyline gotcha in `docs/CODEBASE_MAP.md` (readControls() also runs on the Space toggle).

**Rejected:** carried from earlier passes: the snap drift band, focus after a keyboard toggle, the double-toggle maybe-false, controls not read at load, the stub-tested browser tier, AI per frame at 120 Hz, a ball past the face overlapping the body. New: a vertical step above the court (about 97 paddle hits, needs a fold helper), the AZERTY letters (convention across three games), the keyup prevent (deliberate), the dead clamp and onKeyUp String() (no outcome), stale px in the second paddleHit (not reachable today), the empty Spec Change Log (filled only on bad_spec loopbacks), listener count (one per type).

**Follow-up review recommendation:** false. No high or medium patched; converged.

**Verification:** all nine suites pass after the patches. Mutants run on a scratch copy: paddles moved after the collision checks (killed), checkbox toggle limited to serve (killed), walls back to a clamp (killed). The implementer reports the AI and 2-player top bounds, the frozen serve motion and the 2-player bottom bound killed too; not rerun here.

**Process notes:** the intent-alignment reviewer opened the spec file, which holds the claims; routing gives the claims to the edge-case layer alone. The spec was left out of the review diff. The map Logic edit above is an agent-context change routing would defer; kept and flagged here.

**Residual risks:** a vertical step above the court needs about 97 paddle hits with no point; the README's "whatever the display's refresh rate" overstates the 58-62 Hz band; real-browser rallies not re-run after the wall and collision patches; Safari unchecked for the checkbox keyup case; W/S follow key position, not the letter.
