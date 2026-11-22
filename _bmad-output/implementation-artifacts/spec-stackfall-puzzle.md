---
title: 'Stackfall: original falling-blocks puzzle'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_revision: 'e52916eaf218b6e5194342eeea11bfe090a907df'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md drift after Stackfall: the spec tree line says in-progress, total_tokens and last_mapped are stale, and Stackfall's layout row does not say keyboard only.
    evidence: |-
      Review pass 1 (blind-hunter). The map is cartographer output linked from CLAUDE.md, so the fix edits an agent-context doc; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
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

## Auto Run Result

- **Summary:** Built Stackfall as `stackfall.html` in the shared shape, with `test-stackfall.mjs`. It covers the full intent and both stretch goals: hold (C/Shift, once per piece) and ghost.
- **Files changed:**
  - `stackfall.html` -- the game.
  - `test-stackfall.mjs` -- every I/O matrix row plus the review gaps.
  - `README.md` -- games table, controls, rules (including the I-piece wall note), test command.
  - `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- games list, test command, Stackfall section.
- **Review findings:** 29 findings: 0 high, 3 medium, 24 low, 2 false.
  - Patched: 12 rows in 8 fixes. One medium entry: `dropAcc` not cleared after a soft drop or a landing.
  - Deferred: 3 low rows (map drift) as one `deferred` item.
  - Rejected: 12 low and the 2 false. Reasons are in the triage log.
- **Follow-up review recommended:** false. No high was patched and only one medium entry.
- **Verification:**
  - `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs` passes.
  - The implementer broke the game on purpose for every new assert (18 checks in all); each failed the suite. I re-checked the `dropAcc` fix: removing every reset fails the suite.
- **Residual risks:**
  - Not played in a real browser.
  - An upright I flush against the left wall can't rotate (literal kick rule).
  - Moves and soft drop use OS key repeat, so their speed varies by machine.
  - No pause.
  - The README Play link stays dead until merge and GitHub Pages rebuild.

## Design Notes

Gravity and lock share `step(dt)`: `dropAcc += dt` and fall a row each `interval()` ms while the piece can move down; when it cannot, `lockTimer += dt` and lock at 500. A successful fall sets `lockTimer = 0`. Kicks are just `for (const dx of [0, -1, 1])` over the rotated matrix.

## Verification

**Commands:**
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs` -- expected: all three print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `stackfall.html`: move, rotate against walls, soft and hard drop, clear lines, hold, watch the ghost and next preview, top out and restart with R.
