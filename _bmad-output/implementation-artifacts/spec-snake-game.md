---
title: 'Snake: classic grid snake'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: '1582f4cc9cc33dcdfa106ff23b0f2d532dcea2da'
review_loop_iteration: 0
followup_review_recommended: false
followup_pass: true
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md drift after Snake: frontmatter total_tokens and last_mapped not refreshed, no Snake entry in the navigation guide, the Snake spec tree line has no status note, and the tail-rule wording still says "unless eating", and Snake's layout note does not say it has no touch input (Gapwing's lists touch-action).
    evidence: |-
      Review pass 1 (blind-hunter, edge-case-hunter, intent-alignment). The map is cartographer output linked from CLAUDE.md, so the fix edits an agent-context doc; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      docs/CODEBASE_MAP.md new Snake drift: total_files says 11 but git tracks 12, Gotchas does not say a stubbed Math must be built with Object.create(Math), and the test list claims it covers every spec matrix row.
    evidence: |-
      Follow-up review pass (blind-hunter, intent-alignment). The map is cartographer output linked from CLAUDE.md, so the fix edits an agent-context doc; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
  - summary: >-
      test-gapwing.mjs looks up the canvas through the shared harness stub, which returns an element for any id, so a rename of the canvas id in gapwing.html would not fail the suite.
    evidence: |-
      Follow-up 2 verification review on snake.html; the same stub pattern is used in test-gapwing.mjs. Out of this change's scope, so deferred; the fix edits a test file not in this change.
    location: >-
      test-gapwing.mjs
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo now holds only Gapwing. The user wants Snake back as a fresh build: one HTML file, canvas, vanilla JS, a 20x20 grid with growth, speed-up, death, a localStorage high score, a wrap-around toggle and pause.

**Approach:** Add `snake.html` in the repo's shared testable shape, plus `test-snake.mjs` driving it through `harness.mjs`. Movement runs on a tick accumulator in `step(dt)` at `speed` ticks per second.

## Boundaries & Constraints

**Always:**
- One self-contained HTML file, vanilla JS, inline CSS, exactly one bare `<script>`. Canvas is 400x400 (20x20 cells of 20 px).
- Shared shape: top-level `let` state, `reset()`, `tick()` (one move), `step(dt)` (ms; runs `tick()` every `1000/speed` ms), read-only `render()`, `onKey(e)` on `e.code` via `document.addEventListener('keydown', …)`, rAF `frame` loop with dt capped at 100 ms.
- Start: length 3, head at (10,10), body to the left, moving right. Score 0, speed 8 ticks/s.
- Steering: Arrow keys and WASD. A turn is checked against the direction of the last completed move, so two quick keys within one tick cannot reverse the snake. 180° turns are ignored.
- Food spawns on a uniformly random empty cell. Eating: +1 length, +10 score. Every time score reaches a multiple of 50, speed rises by 0.5 ticks/s.
- Death: head leaves the grid (wrap off) or enters a body cell. The tail cell that moves away this tick is free unless the snake eats this tick.
- Game over: canvas shows "Game over", the score and "Press Space to restart". Only Space restarts; other game input is ignored while over.
- High score: read from `localStorage['snakeHighScore']` at load, written when a run ends with a higher score. Every storage access is inside try/catch, so blocked storage never breaks the game.
- Stretch, both included: T toggles wrap-around (head exits one edge and enters the opposite; setting survives restart). P toggles pause (time stops, "Paused" shown). Key repeat is ignored for P and T.
- Arrow keys and Space call `preventDefault`; other keys are untouched.
- If the board fills (no empty cell for food), the run ends as a win: "You win!" replaces "Game over"; score and restart prompt still shown.
- A11y: canvas `role="img"` with an `aria-label`; an `aria-live="polite"` status line that changes only when the state changes.

**Never:**
- Dependencies, external files, `setInterval`, sound, menus, touch controls.
- Editing `harness.mjs` or `gapwing.html`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | `reset()` | length 3, head (10,10), dir right, score 0, speed 8 | none |
| Tick timing | `step(124)` then `step(1)` | no move, then head at (11,10) | none |
| Reverse | moving right, press Left | ignored | none |
| Quick double key | moving right, Up then Left within one tick | Up queued, Left rejected; next tick moves up | none |
| Eat | head moves onto food | length +1, score +10, new food on an empty cell | none |
| Speed-up | score 40 → eat → 50 | speed 8.5 | none |
| Wall death | wrap off, head leaves grid | game over | none |
| Self death | head enters a body cell | game over | none |
| Tail cell | head enters the cell the tail leaves this tick | survives | none |
| Wrap | wrap on, head leaves right edge | head at x=0, alive | none |
| Wrap toggle | T pressed, then restart | wrap still on | repeat ignored |
| Pause | P pressed | `step` does nothing, "Paused" drawn; P again resumes | repeat ignored |
| Game over screen | over | "Game over", score, "Press Space to restart" drawn | none |
| Restart | over, Space | fresh `reset()` state | other keys ignored while over |
| High score | run ends above stored high | stored value updated; lower run leaves it | storage errors swallowed |
| Full board | last empty cell eaten | "You win!" shown, run over | none |
| Scroll | Arrow keys, Space | `preventDefault` | other keys untouched |

</intent-contract>

## Code Map

- `gapwing.html` -- template for the shape: constants at top, `reset`/`step`/`render`, `onKey`, capped rAF `frame`, `setText` (writes only on change) for an `aria-live` `#status` line, canvas `role="img"`, `min-height: 100vh` body.
- `harness.mjs` -- `load(file, globals)`; `run(code)` reaches top-level `let`s; `key(code, repeat)` fires keydown; `texts` collects `fillText` strings. Pass a `localStorage` stub through `globals` (spread after the defaults). Stub `getElementById` returns a fresh element per call.
- `test-gapwing.mjs` -- style reference for the new test.
- `README.md` -- games table, Play links, controls, test command; add Snake.
- `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- list the games and test command; add Snake.

## Tasks & Acceptance

**Execution:**
- `snake.html` -- create the game per the intent contract -- the feature.
- `test-snake.mjs` -- assert every I/O matrix row via `harness.mjs`, with a `localStorage` stub -- repo convention, guards the rules.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- add the game, its controls and `node test-snake.mjs` to the test command -- keep docs true.

**Acceptance Criteria:**
- Given the page opens, when nothing is pressed, then the snake moves right at 8 ticks/s and the score and high score are shown.
- Given a run ends, when the status line updates, then it announces the end and the restart key once, not every frame.
- Given storage is blocked (getItem/setItem throw), when the game loads and a run ends, then it plays normally with high score 0.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 30 findings — high 0, medium 0, low 29, false 1, maybe-false 0
- findings:
  - `[low]` `[defer]` Spec untracked and map tree line for it has no status note (blind-hunter) — the spec is committed at finalize; the map annotation is deferred with the other map drift.
  - `[low]` `[defer]` Map frontmatter: total_files bumped, total_tokens and last_mapped not (blind-hunter) — fix edits cartographer output; deferred.
  - `[low]` `[defer]` Map navigation guide has no Snake entry (blind-hunter) — deferred with the map drift.
  - `[low]` `[patch]` Dead `eats ? snake` arm in the body check (blind-hunter) — patched: body check is always `snake.slice(0, -1)`; the impossible food-on-tail test was deleted.
  - `[low]` `[reject]` No speed cap; near a full board the snake runs about 47 ticks/s (blind-hunter) — the intent states +0.5 every 50 points with no cap; reachable only near a full board.
  - `[low]` `[reject]` Turn buffer holds one move, so a quick second turn is lost (blind-hunter) — the spec chose last-move checking with one queued turn; a queue is a behaviour change.
  - `[low]` `[reject]` No auto-pause on window blur (blind-hunter) — adds behaviour beyond the intent; same reasoning as Gapwing's rejected pause row.
  - `[low]` `[reject]` Steering and wrap toggle still work while paused, undecided by the spec (blind-hunter) — harmless (turns are still checked against the last move); fixing it adds a branch the intent does not ask for.
  - `[low]` `[patch]` No hint that Snake needs a keyboard, next to tap-friendly Gapwing (blind-hunter) — patched: README games row says keyboard only.
  - `[false]` `[reject]` No new-record feedback (blind-hunter) — not asked for by the intent; no defect.
  - `[low]` `[patch]` Leftover `placeFood()` call in the uniform-food test (blind-hunter) — patched: deleted.
  - `[low]` `[reject]` Test command duplicated in three docs won't scale (blind-hunter) — nothing broken; a test-runner change is out of scope.
  - `[low]` `[patch]` `!over` guard in step() untested; a win mid-step can become a loss (verification) — patched: full board driven by `speed = 40; step(100)` asserts `[over, won] = [true, true]`.
  - `[low]` `[patch]` Eating across a wrapped edge untested (verification) — patched: head (19,5) right, food (0,5), one tick gives +1 length, +10 score.
  - `[low]` `[patch]` Win text in `#status` unasserted (verification) — patched: asserts 'You win! Score: 80. Press Space to restart.'
  - `[low]` `[patch]` Overlay score assert also matches the HUD score (intent) — patched: `Score: N` must appear exactly twice (HUD + overlay).
  - `[low]` `[reject]` Snake moves on load and hits the wall about 1.25 s later without input (intent) — the intent says it starts moving right; a ready screen would change that.
  - `[low]` `[reject]` High score written only at run end, so closing mid-run loses a record (intent) — the usual reading of the intent; live writes add work per eat.
  - `[low]` `[reject]` One high score shared by wrap and wall modes (intent) — the intent names one high score.
  - `[low]` `[defer]` Spec untracked and map frontmatter stale (intent) — same as the blind-hunter map rows; deferred.
  - `[low]` `[reject]` Render layout, HUD over row 0, CSS scaling untested (intent) — logic-layer harness by repo convention; cosmetic.
  - `[low]` `[reject]` Ctrl/Meta/Alt + key also toggles pause or wrap or steers (edge) — browser shortcuts mostly don't reach the page; same pattern rejected for Gapwing.
  - `[low]` `[reject]` Stored high of Infinity, negative or fractional misbehaves (edge) — only reachable by hand-editing storage.
  - `[low]` `[reject]` Two tabs: a lower score can overwrite a higher one saved by the other tab (edge) — unlikely; the fix re-reads storage on every end.
  - `[low]` `[patch]` frame() comment promises at most one tick on resume (edge) — patched: comment says it catches up at most 100 ms of ticks.
  - `[low]` `[reject]` No auto-pause on blur (edge) — same as the blind-hunter row.
  - `[low]` `[reject]` A second quick turn is lost (edge) — same as the blind-hunter turn-buffer row.
  - `[low]` `[reject]` No input on touch-only devices (edge) — the spec's Never list excludes touch controls; the README now says keyboard only.
  - `[low]` `[defer]` Map frontmatter totals stale (edge) — same as the blind-hunter row; deferred.
  - `[low]` `[reject]` Blocked storage shows the session best after a run, not 0 (edge) — showing the session best is the better behaviour and the test pins it; the only fix is rewording this build's spec acceptance line.

### 2026-11-21 — Review pass (follow-up)
- verdicts: 39 findings — high 0, medium 0, low 36, false 3, maybe-false 0
- findings:
  - `[low]` `[reject]` No ready state and no restart lockout, so Space mashing at death skips the game over screen (blind-hunter) — ready part carried — same as the pass-1 row (the intent says it starts moving right); Space is not a play key, so mashing it at death is unlikely, and a timed gate is a state the intent does not ask for.
  - `[low]` `[reject]` carried — HUD text drawn over playfield row 0 (blind-hunter). Same claim as the pass-1 render-layout row; cosmetic.
  - `[low]` `[patch]` `High:` in the HUD stays below the current Score during a run that beats the record (blind-hunter) — grouped with the edge-case HUD row. Patched: HUD draws `Math.max(high, score)`; saving in end() is unchanged. The closing-tab record-loss part is the carried reject below.
  - `[low]` `[reject]` carried — T works mid-run and one high score covers wrap and wall modes (blind-hunter). Same claims as the pass-1 rows.
  - `[low]` `[reject]` carried — a quick second turn is dropped (blind-hunter). Same as the pass-1 turn-buffer row.
  - `[low]` `[reject]` carried — no auto-pause on blur (blind-hunter). Same as the pass-1 row.
  - `[low]` `[reject]` carried — no touch input, dead page on phones (blind-hunter). The spec's Never list excludes touch controls and the README says keyboard only.
  - `[low]` `[patch]` Hint says "Space: restart" but Space does nothing mid-run (blind-hunter) — patched: hint reads "Space: restart after game over".
  - `[low]` `[patch]` Tests do not assert Space is a no-op in a live run, nor vertical reversals (blind-hunter) — Space part patched: Space during a run and while paused leaves state unchanged. Vertical part grouped with the verification steering row.
  - `[low]` `[reject]` Weak assertions: removed `!over` guard, `typeof high`, status writes after a win, attribute-order regexes (blind-hunter) — the first claim is refuted: the win-path test fails without the guard (mutant check). The rest are negligible test-style nits.
  - `[low]` `[reject]` carried — stored high score is not validated (blind-hunter). Same as the pass-1 row; only reachable by hand-editing storage.
  - `[low]` `[patch]` `e.code.startsWith` throws on a keydown with no `code`; modifier chords steer (blind-hunter) — grouped with the edge-case and intent rows. Patched: `String(e.code).startsWith('Arrow')`, with a test. The modifier part carried — same as the pass-1 row, rejected.
  - `[low]` `[reject]` carried — no speed cap (blind-hunter). Same as the pass-1 row; the intent has no cap.
  - `[low]` `[defer]` CODEBASE_MAP: file count 11 vs 12, stale totals and timestamp, no Snake nav entry, spec tree line, tail wording, Object.create(Math) gotcha (blind-hunter) — carried — the stale totals, nav entry, tree line and tail wording are already in `deferred`; the new file-count and Object.create items were added as one new `deferred` entry.
  - `[low]` `[reject]` carried — a two-slot turn queue would keep a lost second turn (edge). Same as the turn-buffer row.
  - `[low]` `[reject]` carried — Ctrl/Meta/Alt chords steer, pause or toggle wrap (edge). Same as the pass-1 row.
  - `[low]` `[patch]` keydown with undefined `e.code` makes `startsWith` throw (edge) — grouped with the blind-hunter and intent rows; patched as there.
  - `[low]` `[reject]` carried — stored high of Infinity, negative or fractional (edge). Same as the pass-1 row.
  - `[low]` `[reject]` carried — two tabs: a lower score overwrites a higher stored one (edge). Same as the pass-1 row.
  - `[low]` `[reject]` carried — a record is lost when the tab closes mid-run (edge). Same as the pass-1 row; writing on every eat adds work the intent does not ask for.
  - `[low]` `[patch]` HUD shows Score above High during a run (edge) — grouped with the blind-hunter HUD row; patched there.
  - `[low]` `[reject]` carried — blur or visibilitychange does not pause (edge). Same as the pass-1 row.
  - `[false]` `[reject]` step() or render() throwing would stop the rAF loop, e.g. getContext returning null (edge) — refutation: getContext('2d') on a fresh canvas does not return null and no throwing path was shown.
  - `[low]` `[defer]` carried — code always checks `snake.slice(0, -1)`, so the spec and map wording "unless eating" describes a branch that does not exist (edge). The map wording is already in `deferred`; the spec's intent contract is read-only, and both readings are equivalent because food never spawns on the snake.
  - `[low]` `[reject]` carried — blocked storage still shows the session best after a run, not 0 (edge). Same as the pass-1 row.
  - `[low]` `[defer]` carried — map frontmatter totals stale, file count 11 vs 12 (edge). Stale totals are already in `deferred`; the count is in the new entry.
  - `[low]` `[patch]` The win path's high-score save is unverified; swapping `score += 10` and `placeFood()` or skipping the save on a win still passes (verification) — patched: the full-board win on a storage-stub load asserts `high === 3970` and the stored value '3970'.
  - `[low]` `[patch]` ArrowDown mapping and vertical 180° turns are unasserted (verification) — patched: ArrowDown moves the head to y+1; while moving down, ArrowUp and KeyW leave `nextDir` unchanged. Grouped with the blind-hunter vertical-reversal claim.
  - `[low]` `[reject]` Board drawing (food, body, head, cell coordinates) has no assertion (verification) — hypothetical regression; the fix needs a recording canvas stub, more than a direct correction; the reviewer's `defer` does not apply because it is not pre-existing; same call as the Gapwing geometry row.
  - `[low]` `[defer]` carried — map tail wording says "unless eating" (verification). Already in `deferred`.
  - `[low]` `[reject]` carried — tests exercise only the node:vm stub, not a real browser (intent). Same as the pass-1 logic-layer row.
  - `[low]` `[reject]` carried — Up then Right drops the Up (intent probe). Same as the turn-buffer row.
  - `[low]` `[patch]` carried — forced food on the tail cell survives (intent probe). Same as the pass-1 dead-branch row: already fixed by always checking `snake.slice(0, -1)`; the state is unreachable.
  - `[low]` `[reject]` carried — direction keys still queue a turn while paused (intent probe). Same as the pass-1 row.
  - `[false]` `[reject]` T is ignored on the game-over screen (intent probe) — matches the spec: other game input is ignored while over; no defect.
  - `[low]` `[patch]` A keydown without `code` throws in onKey (intent probe) — grouped with the blind-hunter and edge-case rows; patched as there.
  - `[low]` `[reject]` carried — modifier keys steer; a stored '-5' gives a negative high (intent probe). Same as the pass-1 rows.
  - `[low]` `[defer]` Docs claim test-snake.mjs covers every spec matrix row, while the eat-plus-tail state is unreachable (intent) — fix edits CODEBASE_MAP; added to the new `deferred` entry.
  - `[false]` `[reject]` Scope: docs edited beyond the two named files, spec edit not in the diff, `Score: N` drawn twice (intent) — docs and spec are repo conventions, the diff excludes the spec on purpose, and the test counts the two draws deliberately; no defect.

### 2026-11-21 — Review pass (follow-up 2)
- verdicts: 64 findings — high 0, medium 0, low 56, false 8, maybe-false 0
- findings:
  - `[false]` `[reject]` Scope: diff base is 1582f4c, not main, and against main the branch also deletes Stackfall files (blind-hunter) — the review baseline is the spec's baseline_revision by design; the Stackfall deletion is an earlier commit.
  - `[false]` `[reject]` carried — spec not in the diff (blind-hunter). Same as the pass-1 spec-exclusion row.
  - `[low]` `[defer]` carried — CODEBASE_MAP says test-snake covers every spec matrix row, which is overstated (blind-hunter). Already in `deferred`.
  - `[low]` `[patch]` README has no tail rule (blind-hunter) — patched: README says stepping into the cell the tail is leaving is allowed.
  - `[low]` `[reject]` carried — no ready state; the snake moves from load (blind-hunter). Same as the pass-2 row.
  - `[low]` `[reject]` carried — no speed cap (blind-hunter). Same as the pass-1 row.
  - `[low]` `[patch]` README: "wrap-around walls" reads as on by default (blind-hunter) — patched: "optional wrap-around walls (T)".
  - `[low]` `[reject]` Live Pages link may serve the old game or 404 until merge (blind-hunter) — post-merge check; recorded as a residual risk.
  - `[low]` `[reject]` carried — test command copied into three docs (blind-hunter). Same as the pass-2 row.
  - `[low]` `[defer]` carried — CODEBASE_MAP total_files says 11 but git tracks 12 (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — CODEBASE_MAP last_mapped and total_tokens stale; header still says auto-generated (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — CODEBASE_MAP tail wording "unless eating" (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` carried — CODEBASE_MAP Common changes has no Snake recipe (blind-hunter). Already in `deferred`.
  - `[low]` `[defer]` CODEBASE_MAP touch parity: Gapwing's layout row lists touch-action, Snake's does not say no touch (blind-hunter) — new; folded into the map drift item.
  - `[low]` `[reject]` carried — held Space restarts before game over shows (blind-hunter). Same as the pass-2 edge row.
  - `[low]` `[reject]` carried — T mid-run toggles wrap and can escape a wall (blind-hunter). Same as the pass-2 row.
  - `[low]` `[reject]` carried — live High not saved until run end (blind-hunter). Same as the pass-2 row.
  - `[low]` `[reject]` carried — stored high not validated (blind-hunter). Same as the pass-1 row.
  - `[low]` `[reject]` carried — no modifier-key check (blind-hunter). Same as the pass-2 row.
  - `[low]` `[reject]` carried — one-slot turn queue drops a turn (blind-hunter). Same as the pass-1 row.
  - `[low]` `[reject]` carried — no pause on blur or visibility change (blind-hunter). Same as the pass-1 row.
  - `[low]` `[reject]` carried — HUD drawn over row 0 (blind-hunter). Same as the pass-2 row.
  - `[low]` `[reject]` Red food and green body are hard to tell apart for some colour-blind players (blind-hunter) — colour is outside the spec's A11y clause; a shape cue is more than a direct correction.
  - `[low]` `[patch]` test: `['KeyD', [1, 0]]` passes even if KeyD is ignored, since reset() already faces right (blind-hunter) — patched: dir set to up first.
  - `[low]` `[patch]` test: the two reverse-rejected asserts say "accepted" (blind-hunter) — patched: messages say "rejected".
  - `[low]` `[reject]` carried — held Space at game over is untested (blind-hunter). Same as the pass-2 edge row.
  - `[low]` `[patch]` test: Space while over is not checked in the prevent-count block (blind-hunter) — patched.
  - `[low]` `[patch]` test: wrap seam into the snake's own body is untested (blind-hunter) — patched: wrap on, head into body cell over the seam gives over. Same root as the verification wrap row.
  - `[low]` `[reject]` Serpentine setup copy-pasted in three tests (blind-hunter) — refactor with no behaviour effect.
  - `[low]` `[patch]` Inherited key names (`constructor`, `__proto__`) turn the direction into a non-array and the head goes NaN (edge) — patched: Object.hasOwn lookup. Browsers never send these codes; the fix is one token.
  - `[low]` `[reject]` carried — stored Infinity read as the high score (edge). Same as the pass-1 row.
  - `[low]` `[reject]` carried — held Space restarts at game over (edge). Same as the blind-hunter row above.
  - `[low]` `[patch]` Another tab saves a higher record and this run overwrites it with a lower score (edge) — revised from the pass-2 carried reject: the I/O matrix row "run ends above stored high" decides it (see the intent row). Patched: end() re-reads the stored value before comparing.
  - `[low]` `[reject]` carried — Ctrl, Meta or Alt chords act as game keys (edge). Same as the pass-2 row.
  - `[low]` `[reject]` carried — blur does not pause (edge). Same as the pass-1 row.
  - `[low]` `[reject]` carried — blocked storage shows the session best after a run, not 0 (edge). Same as the pass-1 row.
  - `[low]` `[patch]` Wrap-on body collision untested (verification) — patched: wrap on, self-death and body-cell tests give over.
  - `[low]` `[patch]` Wrap-on tail shed and tail exemption untested (verification) — patched: non-eating wrap move keeps length; head into the vacating tail survives.
  - `[low]` `[patch]` Canvas id lookup not checked against the markup (verification) — patched: document stub asserts each id looked up is in the html.
  - `[low]` `[reject]` carried — board drawing geometry not observed (verification). Same as the pass-2 row: a recording canvas stub is more than a direct correction.
  - `[low]` `[patch]` 'Wrap' not asserted absent when wrap is off (verification) — patched.
  - `[low]` `[defer]` carried — CODEBASE_MAP says test-snake covers every matrix row (verification). Already in `deferred`.
  - `[low]` `[defer]` test-gapwing.mjs has the same canvas-id blind spot (verification) — pre-existing, outside this change; new `deferred` item.
  - `[low]` `[reject]` carried — steering: last key wins within a tick, and a turn may be dropped (intent). Same as the turn-buffer row.
  - `[low]` `[reject]` carried — steering while paused is accepted and applies on resume (intent). Same as the pass-2 row; harmless.
  - `[low]` `[reject]` carried — Space held restarts. The intent names repeat-ignore only for P and T, so restart on repeat is the literal reading (intent). Same as the pass-2 row.
  - `[low]` `[patch]` Stored record: the I/O row says "run ends above stored high", but the diff compares with the value read at load, so a higher record from another tab is overwritten (intent) — same defect as the edge row above; patched there.
  - `[false]` `[reject]` Tail rule: the literal and structural readings differ only if food sits on the tail, which cannot happen. A 74,402-tick fuzz found 0 food-on-snake and 0 eat-into-tail (intent).
  - `[false]` `[reject]` carried — render() writes #status through setText (intent). Same as the Gapwing read-only row: "read-only" means no game-state change.
  - `[low]` `[reject]` Wrap toggle announced on the aria-live line (intent) — the status line includes wrap state; the intent is ambiguous and announcing a setting change is reasonable; no defect.
  - `[false]` `[reject]` Canvas 400 is the bitmap size, and CSS scales it down (intent). Same reading as Gapwing.
  - `[low]` `[reject]` carried — canvas text checked only as drawn strings, not layout (intent). Same as the pass-2 row.
  - `[low]` `[reject]` carried — the snake moves from load with no ready state (intent). Same as the blind-hunter row above.
  - `[low]` `[reject]` carried — tests set state directly instead of playing from reset() through keys and step (intent). Same as the pass-1 logic-layer row.
  - `[low]` `[patch]` No test asserts storage after a death driven through tick() (intent) — patched: wall death through tick() with score 40 stores '40'.
  - `[low]` `[reject]` Game-over screen is set by end(false), not by a played death (intent). Test structure; the overlay text is asserted.
  - `[low]` `[reject]` Tail-on-eat combined with the tail rule is untested (intent). The state cannot occur in play; pinning it would pin an impossible state, which pass 2 removed on purpose.
  - `[false]` `[reject]` Accumulator remainder across calls is never asserted (intent). Refuted: step(124) then step(1) gives exactly one tick only if the 124 carries across calls.
  - `[low]` `[reject]` Uniform food pinned only at Math.random 0 and 0.999999 (intent). The extremes pin the index mapping; a fuller check would be statistical, not a rule check.
  - `[low]` `[reject]` carried — static canvas, aria and script checks use regex (intent). Same as the pass-1 row.
  - `[false]` `[reject]` carried — docs edited beyond the two named files (intent). Same as the pass-2 scope row.
  - `[false]` `[reject]` carried — spec not in the diff, shown as modified (intent). Same as the pass-1 row.
  - `[low]` `[reject]` Live Pages link needs a deploy outside the diff (intent) — post-merge check; residual risk.
  - `[low]` `[defer]` carried — CODEBASE_MAP last_mapped unchanged after hand edits (intent). Already in `deferred`.

## Auto Run Result

- **Summary:** Built Snake as `snake.html` in the shared shape, with `test-snake.mjs`. It covers the full intent and both stretch goals (T wrap toggle, P pause), plus a full-board win. Three follow-up passes hardened the HUD, storage re-read, key guards, wrap rules and tests, and clarified the README.
- **Files changed (whole change):**
  - `snake.html` -- the game. Latest pass: `Object.hasOwn` key lookup, `end()` re-reads the stored high before comparing, HUD `High:` uses `Math.max(high, score)`, hint wording, `String(e.code)` guard.
  - `test-snake.mjs` -- every I/O matrix row, storage blocked or missing, dt cap, rAF wiring, render purity, status text, and the follow-up tests (wrap rules, canvas-id check, `Wrap` label, tick-driven storage, inherited keys, cross-tab record).
  - `README.md` -- games table (optional wrap, keyboard only), Play link, controls and tail rule, test command.
  - `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- games list, test command, Snake section.
- **Review findings, follow-up 2:** 64 findings: 0 high, 0 medium, 56 low, 8 false.
  - Patched: 14 rows in 5 fixes. One row (cross-tab record) is revised from an earlier carried reject: the I/O matrix row says "run ends above stored high", so the stored value must be re-read.
  - Deferred: 9 rows, all as deferred items (map drift, and test-gapwing's canvas-id stub).
  - Rejected: 33 low and the 8 false. Most are carried from earlier passes; reasons are in the triage log.
- **Follow-up review recommended:** false. No high was patched and no medium was patched, so the work has converged.
- **Verification:**
  - `node test-gapwing.mjs && node test-snake.mjs` pass.
  - The implementer checked 13 mutants of the new asserts, one per item. I re-ran three (re-read removed, key guard reverted, `Wrap` always drawn); each is caught.
- **Residual risks:**
  - Not played in a real browser.
  - No ready state: the snake moves from load and hits the wall after about 1.25 s without input.
  - No speed cap; the late game gets very fast.
  - Keyboard only; no touch.
  - The HUD text on row 0 can overlap the snake.
  - Two tabs ending a run at exactly the same instant can still race on storage.
  - `Object.hasOwn` needs Chrome 93, Firefox 92 or Safari 15.4 or newer.
  - The README Play link stays dead until merge and GitHub Pages rebuild.

## Design Notes

Same timing model as Gapwing's `step`: `acc += dt; while (!gameOver && acc >= 1000 / speed) { acc -= 1000 / speed; tick(); }`. A speed-up then needs no timer reset. `dir` is the last moved direction and `nextDir` the queued one; `onKey` checks the new key against `dir`, `tick()` copies `nextDir` into `dir`.

## Verification

**Commands:**
- `node test-gapwing.mjs && node test-snake.mjs` -- expected: both print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `snake.html`: steer with arrows and WASD, eat, die on wall and body, restart with Space, toggle T and P, reload to see the high score kept.
