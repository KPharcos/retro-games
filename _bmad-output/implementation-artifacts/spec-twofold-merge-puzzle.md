---
title: 'Twofold: original sliding-merge puzzle'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_revision: 'baf2047e364b6c337e3454fcabdd65b0250fb4d6'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md drift after Twofold: the spec tree line has no status note, total_tokens and last_mapped are stale, "All three draw their score on the canvas" now reads as if Twofold were included, and the harness gotcha does not list the DOM stub surface Twofold needs (createElement, appendChild, style, hidden, disabled, remove, focus).
    evidence: |-
      Review pass 1 (blind-hunter). The map is cartographer output linked from CLAUDE.md, so the fix edits an agent-context doc; a cartographer re-map refreshes it.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no sliding-merge number puzzle. The user wants one in a single HTML file with a DOM grid and CSS transitions: a 4x4 board, two starting tiles, arrow keys and swipe, full slides with single merges, spawn only on a changed board, win at 2048 with continue, loss when stuck, and game logic as pure, unit-testable functions. Stretch: one-step undo and a best score in localStorage.

**Approach:** Add `twofold.html` under an original name and palette (not the look of any existing game), plus `test-twofold.mjs` driving it through `harness.mjs`. Game rules live in pure functions that take a board and return a new one; a thin DOM layer renders state and handles input.

## Boundaries & Constraints

**Always:**
- One self-contained HTML file, vanilla JS, inline CSS, exactly one bare `<script>`. Original name "Twofold" and an original tile palette. The board is a DOM grid of absolutely positioned tile elements; moves animate with CSS `transition` on `transform`.
- Pure functions, no DOM or global state: `emptyBoard()`, `slide(board, dir)` returning `{ board, gained, moved }`, `addTile(board, rand)` returning a new board, `canMove(board)`, `hasTile(board, value)`. A board is a 4x4 array of numbers (0 = empty). Inputs are never mutated.
- `addTile` puts a 2 (90%) or 4 (10%) on a uniformly random empty cell, using the passed `rand` function.
- Game shell: top-level `let` state (`board`, `score`, `best`, `won`, `keepPlaying`, `over`, `prev`), `reset()` (empty board + two `addTile`), `move(dir)` (calls the pure functions, updates state), read-only `render()` that writes the DOM, `onKey(e)` on `e.code` via `document.addEventListener('keydown', …)`, and swipe via `pointerdown`/`pointerup` on `document`.
- Slide: every tile moves as far as it can in the direction. Equal neighbours merge once per move (a merged tile cannot merge again in that move; with three equal in a row, the pair nearest the move direction merges). The merged value is added to the score.
- A new tile spawns only if the move changed the board.
- Win: when a 2048 tile first appears, show a "You reached 2048" message with Continue; after Continue, play goes on and the message does not reappear.
- Lose: when no slide changes the board, show game over. New game restarts at any time (N key or button).
- Undo (stretch): U or a button restores the board and score from before the last move; one step only; disabled after a new game.
- Best score (stretch): `localStorage['twofoldBest']`, updated whenever score exceeds it; every access in try/catch.
- Swipe: a pointer drag of at least 30 px picks the dominant axis; shorter drags do nothing.
- Arrow keys call `preventDefault`; other keys are untouched. Key repeat moves again.
- A11y: board container `role="grid"` with an `aria-label`; an `aria-live="polite"` status line that changes only when its text changes (win, game over, undo).

**Never:**
- The name "2048", its exact tile palette or its layout; external assets; dependencies; `setInterval`; sound; canvas.
- Editing `harness.mjs` or the other games.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | `reset()` | exactly two tiles, each 2 or 4, score 0 | none |
| Spawn value | `addTile` with rand < 0.9 / ≥ 0.9 for the value draw | 2 / 4 | full board: board unchanged |
| Slide | `[2,0,0,2]` left | `[4,0,0,0]`, gained 4, moved | none |
| No double merge | `[2,2,4,0]` left | `[4,4,0,0]`, gained 4 | none |
| Three equal | `[2,2,2,0]` left / right | `[4,2,0,0]` / `[0,0,2,4]` | none |
| Four equal | `[2,2,2,2]` left | `[4,4,0,0]`, gained 8 | none |
| Purity | any `slide` / `addTile` | input board unchanged | none |
| No change | slide that moves nothing | `moved` false, no spawn, score unchanged | none |
| Spawn on change | slide that moves | exactly one new tile | none |
| Win | move creates 2048 | won, message shown, Continue keeps playing | message not shown again |
| Lose | full board, no equal neighbours | over, game over shown | moves ignored until new game |
| Undo | U after a move | board and score restored; second U does nothing | none before any move |
| Best | score beats best | best updated and saved | storage errors swallowed |
| Swipe | drag ≥ 30 px | move in dominant direction | shorter drag ignored |
| Keys | Arrow keys | move + `preventDefault` | other keys untouched |

</intent-contract>

## Code Map

- `snake.html` -- nearest template for the shell: top-level `let` state, `reset()`, `onKey` with `Object.hasOwn` lookups and `String(e.code)` guards, `setText` for an `aria-live` `#status`, `localStorage` high score in try/catch, `min-height: 100vh` body.
- `gapwing.html` -- `pointerdown` on `document` with `e.button === 0` (pattern for swipe start).
- `harness.mjs` -- `load(file, globals)`; `run(code)` reaches top-level functions and `let`s; default `getElementById` returns `{getContext, textContent}` only, so DOM rendering needs a `document` stub passed in `globals` (with `createElement`, `appendChild`, `style`, `classList` as used). Pass `Math` as `Object.assign(Object.create(Math), { random })` if needed.
- `test-snake.mjs`, `test-stackfall.mjs` -- style references, including persistent-element `document` stubs and storage stubs (`memStorage`).
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- list games and the test command; add Twofold and note it is DOM-based (no canvas, no rAF loop).

## Tasks & Acceptance

**Execution:**
- `twofold.html` -- create the game per the intent contract -- the feature.
- `test-twofold.mjs` -- assert every I/O matrix row; test the pure functions directly through `run()` -- repo convention, guards the rules.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- add the game, controls and `node test-twofold.mjs` to the test command; in CLAUDE.md note that DOM games may skip the canvas/rAF parts of the shared shape -- keep docs true.

**Acceptance Criteria:**
- Given the page opens, when nothing is pressed, then a 4x4 board with two tiles, the score and the best score are shown.
- Given a tile moves, when the DOM updates, then the tile element keeps its identity so the CSS transition animates its slide.

## Spec Change Log

## Review Triage Log

### 2026-11-22 — Review pass
- verdicts: 27 findings — high 0, medium 6, low 19, false 2, maybe-false 0
- findings:
  - `[false]` `[reject]` The intent says "Build 2048" but the game is named Twofold with its own palette (intent) — deliberate: repo rule against recreating a specific game's name or look; mechanics and the 2048 goal are kept.
  - `[false]` `[reject]` Delivery goes beyond one file: tests, README, CLAUDE.md and the map are edited (intent) — repo conventions for every game; no defect.
  - `[low]` `[reject]` No merge pop, and the surviving tile shows its new value at slide start (intent) — cosmetic; slides, ghosts and spawn animations are in place.
  - `[low]` `[reject]` Pure functions are testable only by loading the whole page script, not imported alone (intent) — the single-file constraint rules out a module; they are pure and tested directly through run().
  - `[medium]` `[patch]` No pointercancel, so a gesture the browser takes over leaves a stale swipe start (intent) — grouped with the swipe rows below; patched there.
  - `[medium]` `[patch]` touch-action covers only the board, so swipes starting elsewhere behave differently (intent) — grouped with the swipe rows; patched: swipes now start only inside the board.
  - `[low]` `[reject]` Tests exercise only a stub DOM, not visible motion or a real touch screen (intent) — repo has no browser harness; residual risk.
  - `[low]` `[reject]` Best score is tested against a stub, not real localStorage (intent) — same stub approach as Snake; residual risk.
  - `[low]` `[reject]` Button clicks are handled by a document listener checking target ids because the harness stubs have no addEventListener (intent) — documented harness constraint; behaviour is correct.
  - `[medium]` `[patch]` Stale swipe start: no pointercancel, and pointerup doesn't match pointerId or button (blind-hunter) — patched: start recorded per pointer id for primary button-0 pointers inside the board; pointerup ignores other ids; pointercancel clears it. Tests added.
  - `[medium]` `[patch]` Swipe not limited to the board; a 30 px drag anywhere moves tiles (blind-hunter) — patched: the start must be inside .wrap and not on a button. Tests added.
  - `[low]` `[reject]` Ctrl, Alt or Meta chords trigger moves, new game or undo (blind-hunter) — same call as the other three games.
  - `[low]` `[reject]` New game can't be undone and has no confirm (blind-hunter) — the intent asks for undo of the last move only; a confirm is beyond it.
  - `[low]` `[patch]` Win screen is keyboard-hostile: no Continue key and no focus (blind-hunter) — patched: Enter or C continue, focus moves to Continue; hint and README list it.
  - `[low]` `[reject]` role="grid" without row and gridcell children, so screen readers can't read the board (blind-hunter) — the spec's intent contract requires role="grid"; the fix would edit this build's spec. Residual risk noted.
  - `[low]` `[defer]` Spec untracked and map frontmatter stale (blind-hunter) — the spec is committed at finalize; the map drift is deferred.
  - `[low]` `[reject]` Stored best accepts Infinity, negatives or fractions (blind-hunter) — only by hand-editing storage; same call as Snake.
  - `[low]` `[patch]` A move that both wins and ends the game is untested (blind-hunter) — patched: win message first, game over after Continue, undo restores the board before the move.
  - `[low]` `[patch]` Swipe edge cases are untested (blind-hunter) — patched with the swipe fix: second pointer, pointercancel, other id, drag on a button, drag outside the board.
  - `[low]` `[patch]` Game-over text points touch players to a key and the overlay shows no score (blind-hunter) — patched: overlay and status show the score and name the Undo and New game buttons.
  - `[low]` `[defer]` Map line "All three draw their score on the canvas" and the harness gotcha are now misleading (blind-hunter) — fix edits CODEBASE_MAP; deferred with the map drift.
  - `[low]` `[patch]` reset() clearing keepPlaying, undone and ghosts is unpinned, because setBoard() clears them too (verification) — patched: New game after Continue and after Undo, without setBoard, checks all three.
  - `[low]` `[patch]` move() clearing the undo status is unpinned (verification) — patched: status is empty after a move that follows an undo.
  - `[medium]` `[patch]` A second touch overwrites the swipe start, so a lift can move the wrong way (edge) — grouped with the blind-hunter swipe row; patched there.
  - `[medium]` `[patch]` A drag that starts on Undo or New game moves the board and then the click also fires (edge) — grouped with the swipe rows; patched: swipes can't start on a button.
  - `[low]` `[reject]` Ctrl, Alt or Meta chords act as game keys (edge) — same as the blind-hunter row.
  - `[low]` `[reject]` Stored best of Infinity, negative or fractional (edge) — same as the blind-hunter row.

## Auto Run Result

- **Summary:** Built Twofold as `twofold.html`: pure board functions (`emptyBoard`, `track`, `slide`, `addTile`, `canMove`, `hasTile`), a DOM grid whose tiles keep their elements so CSS transitions animate slides and merges, arrow keys and swipe, win at 2048 with Continue, game over, one-step undo and a saved best score. `test-twofold.mjs` drives it through `harness.mjs`.
- **Files changed:**
  - `twofold.html` -- the game.
  - `test-twofold.mjs` -- pure functions directly through `run()`, every I/O matrix row, tile identity across moves, swipe edge cases, reset and undo state, status text.
  - `README.md` -- games table, controls (Continue keys, swipe on the board), test command.
  - `CLAUDE.md` -- game list, test command, and a note that turn-based DOM games may skip canvas, `step(dt)` and rAF.
  - `docs/CODEBASE_MAP.md` -- Twofold section.
- **Review findings:** 27 findings: 0 high, 6 medium, 19 low, 2 false.
  - Patched: 12 rows in 6 fixes. The medium rows are one entry: swipe handling (pointer id, pointercancel, board-only start, no drags from buttons).
  - Deferred: 2 rows (map drift) as one `deferred` item.
  - Rejected: 11 low and the 2 false. Reasons are in the triage log.
- **Follow-up review recommended:** false. No high was patched and only one medium entry.
- **Verification:**
  - All four suites pass.
  - The implementer broke each new guard on purpose and each failed the suite. I re-checked one: removing the `pointercancel` handler fails the suite.
- **Residual risks:**
  - Not played on a real phone or in Firefox; motion checked only as still screenshots.
  - `role="grid"` has no row or cell children, as the spec asks, so screen readers get no board structure.
  - Modifier keys are not filtered (Ctrl+N, Ctrl+U act).
  - The README Play link stays dead until merge and GitHub Pages rebuild.

## Design Notes

The shared shape's `step(dt)`/rAF loop is dropped on purpose: Twofold is turn-based and CSS animates the motion, so `move()` updates state and calls `render()` directly. Tiles keep a stable id across a move (tracked in the shell, not the pure board) so the same element slides. Merges: process each line toward the move direction, compress zeros, then merge adjacent equals left to right with a skip after each merge.

## Verification

**Commands:**
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs` -- expected: all four print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `twofold.html`: slide with arrows and swipe, see tiles animate, merge, win and continue, lose, undo, reload and see best kept.
