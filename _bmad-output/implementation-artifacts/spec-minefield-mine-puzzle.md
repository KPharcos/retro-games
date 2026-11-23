---
title: 'Minefield: mine-sweeping puzzle'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_revision: '56667effcfb9bb728787b5d1e83998cace8c1a47'
review_loop_iteration: 0
followup_review_recommended: false
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      Docs drift after Minefield: docs/CODEBASE_MAP.md frontmatter (total_files, total_tokens, last_mapped) and the 18-files line are stale, the spec tree line has no status, the Minefield section still describes marking via pointerdown button 2 (now contextmenu), the setText convention line omits Minefield, and CLAUDE.md and the README "add a game" text don't describe the DOM-plus-rAF-timer shape Minefield uses.
    evidence: |-
      Review pass 1 (blind-hunter, verification-gap). CODEBASE_MAP and CLAUDE.md are agent-context docs, so the fix is deferred; a cartographer re-map refreshes them.
    location: >-
      docs/CODEBASE_MAP.md, CLAUDE.md, README.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no mine-sweeping puzzle. The user wants one in a single HTML file: three difficulties (9x9/10, 16x16/40, 30x16/99), a safe first click, left-click reveal with an iterative flood fill for zeros, right-click flag cycling, chording, a mine counter, a timer, a reset button without a smiley, a win when every safe cell is revealed, and a Board model kept separate from rendering. Stretch: long-press to flag on touch.

**Approach:** Add `minefield.html` under the name "Minefield" with an original look (no smiley, not the look of any existing product), plus `test-minefield.mjs` driving it through `harness.mjs`. The board model is plain functions over a plain object; a turn-based DOM layer renders it and handles input, like `twofold.html`.

## Boundaries & Constraints

**Always:**
- One self-contained HTML file, vanilla JS, inline CSS, exactly one bare `<script>`. DOM grid of cell buttons; no canvas.
- Board model, no DOM or globals, testable through `run()`: `newBoard(w, h, mines)` (all cells hidden, no mines yet), `placeMines(board, safe, rand)` (puts exactly `mines` mines on random cells, never on the `safe` cell or its neighbours, then computes neighbour counts), `reveal(board, i)`, `cycleMark(board, i)`, `chord(board, i)`, `status(board)` returning `'ready' | 'playing' | 'won' | 'lost'`. Cells are a flat array indexed `y * w + x`. Model functions may mutate the board they are given; they never touch the DOM.
- Difficulties: Easy 9x9 with 10 mines, Medium 16x16 with 40, Hard 30x16 (30 wide, 16 tall) with 99. Choosing one starts a new game.
- First click: mines are placed on the first reveal, excluding the clicked cell and its neighbours, so the first click always opens an area.
- Reveal: revealing a 0 cell opens its connected region with an iterative breadth-first queue (no recursion), including the numbered border; flagged cells are never opened by a flood. Revealing a mine loses.
- Marks: right click cycles hidden → flag → question → hidden. Flags and question marks block reveal. The mine counter shows mines minus flags (can go negative).
- Chord: clicking a revealed number whose adjacent flag count equals the number reveals every adjacent hidden, unflagged cell (and can lose if a flag is wrong). Otherwise it does nothing.
- Timer: starts on the first reveal, counts whole seconds, stops on win or loss, caps at 999. Time runs in `step(dt)` driven by a rAF `frame` loop with dt capped at 100 ms (no `setInterval`).
- Win: every non-mine cell revealed. On win, remaining mines show as flags and the counter reads 0. On loss, all mines show, the clicked mine is marked, and wrong flags are marked.
- Reset: a text button ("New game", no face or smiley) restarts the current difficulty. Input on the board is ignored after a win or loss.
- Right click and long press never open the browser context menu on the board.
- Long press (stretch): a touch held at least 450 ms without moving more than 10 px cycles the mark of that cell and suppresses the click that follows.
- A11y: board `role="grid"` with an `aria-label`; each cell is a `button` with an `aria-label` describing its state; an `aria-live="polite"` status line that changes only when its text changes (won, lost).

**Never:**
- A smiley or face on the reset button; the look of any existing product; external assets; dependencies; `setInterval`; sound; canvas.
- Recursion in the flood fill.
- Editing `harness.mjs` or the other games.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New board | `newBoard(9, 9, 10)` | 81 hidden cells, no mines, status ready | none |
| Mine placement | `placeMines` with a safe cell | exactly N mines, none on the safe cell or its neighbours, counts correct | none |
| First click | first reveal anywhere | mines placed then, clicked cell is a 0 and opens a region | none |
| Flood fill | reveal a 0 | connected zeros and their numbered border revealed, nothing else; flagged cells stay hidden | large open board: no stack growth |
| Number | reveal a numbered cell | only that cell revealed | none |
| Mine | reveal a mine | lost, all mines shown, wrong flags marked, timer stops | further board input ignored |
| Marks | right click ×3 | flag → question → hidden; counter −1 then back | revealed cell: no change |
| Blocked | reveal on a flag or question | nothing happens | none |
| Chord | revealed 2 with 2 adjacent flags | adjacent hidden unflagged cells revealed | flag count differs: nothing |
| Chord loss | chord with a wrong flag | lost | none |
| Win | last safe cell revealed | won, mines flagged, counter 0, timer stops | further board input ignored |
| Timer | `step` before first reveal / after | stays 0 / counts seconds, caps at 999 | none |
| Difficulty | choose Medium / Hard | 16x16 with 40 / 30x16 with 99, timer 0 | none |
| Reset | New game | fresh board of the current difficulty, timer 0, counter = mines | none |
| Long press | touch held ≥ 450 ms, still | mark cycles, following click ignored | moved > 10 px or released early: normal click |
| Context menu | right click or long press on board | `preventDefault` | none |

</intent-contract>

## Code Map

- `twofold.html` -- nearest template for a turn-based DOM game: pure model functions at the top, shell state in top-level `let`s, `render()` writing the DOM via `setText`, click delegation on `document` by target (harness stub elements have no `addEventListener`), pointer handlers on `document`, `role="grid"` board, `aria-live` status.
- `snake.html` -- rAF `frame(t)` with `step(Math.min(t - last, 100))`, for the timer.
- `harness.mjs` -- `load(file, globals)`; the default `document` stub lacks `createElement`, so tests pass a `document` (see `makeDoc()` in `test-twofold.mjs`), a `Math` built with `Object.create(Math)` to pin `random`, and a recording `requestAnimationFrame` if needed.
- `test-twofold.mjs` -- style reference for the new test.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- list the games and the test command; add Minefield.

## Tasks & Acceptance

**Execution:**
- `minefield.html` -- create the game per the intent contract -- the feature.
- `test-minefield.mjs` -- assert every I/O matrix row; test the model functions directly through `run()`, including a large flood fill -- repo convention, guards the rules.
- `README.md`, `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- add the game, its controls and `node test-minefield.mjs` to the test command -- keep docs true.

**Acceptance Criteria:**
- Given the page opens, when nothing is clicked, then an Easy 9x9 board, mine counter 10, timer 0 and the New game button are shown.
- Given a Hard game, when the board renders, then it is 30 cells wide and 16 tall.

## Spec Change Log

## Review Triage Log

### 2026-11-23 — Review pass
- verdicts: 28 findings — high 0, medium 3, low 20, false 5, maybe-false 0
- findings:
  - `[false]` `[reject]` Named Minefield instead of Minesweeper (intent) — deliberate: repo rule against recreating a specific product's name or look, and the intent's "smiley-free" points the same way; the rules are standard.
  - `[low]` `[reject]` Right click cycles three states (flag, ?, none) rather than toggling a flag (intent) — spec choice matching the classic game; the counter counts flags only.
  - `[medium]` `[patch]` Mac Ctrl+click arrives as button 0, so it could not flag (intent) — grouped with the blind and edge marking rows; patched: marking moved to contextmenu.
  - `[low]` `[reject]` The timer sums capped frame times, not wall-clock time, and pauses in a hidden tab (intent) — the spec puts time in step(dt) with a 100 ms cap and no setInterval; the README says it pauses.
  - `[low]` `[reject]` Long press cycles the mark rather than only flagging, and is untested on a real phone (intent) — spec choice (same as right click); residual risk.
  - `[low]` `[reject]` Model separation is a convention: look() reads the global board.boom and shell functions render (intent) — the model functions are DOM-free and tested directly; the shell owns rendering by design.
  - `[false]` `[reject]` Iterative BFS (intent) — covered by a 300x300 flood and a source check; no defect.
  - `[false]` `[reject]` First click excludes the 3x3 and mines are placed on the first reveal only (intent) — spec choice that satisfies "first click is always safe"; no defect.
  - `[low]` `[reject]` Chord is left click only, no both-button chord (intent) — the intent says "click revealed number".
  - `[false]` `[reject]` The spec is not in the reviewed diff (intent) — excluded by design; committed at finalize.
  - `[low]` `[patch]` A question-marked mine on the loss screen is untested (verification) — patched: it renders as a mine.
  - `[low]` `[patch]` A question-marked mine on the win screen is untested (verification) — patched: it renders as a flag and the counter reads 0.
  - `[low]` `[defer]` CODEBASE_MAP totals and last_mapped are stale (verification) — agent-context doc; deferred.
  - `[low]` `[patch]` A long press in the after-loss test leaves suppress set, so the next chord assert proves nothing (edge) — patched: the press is ended and suppress asserted false.
  - `[low]` `[patch]` After a long press with no click, the next keyboard activation is swallowed (edge) — patched: keydown, pointerdown and any click clear suppress; detail-0 clicks are never swallowed.
  - `[medium]` `[patch]` Mac Ctrl+click is blocked from the context menu but marks nothing (edge) — grouped with the marking rows; patched.
  - `[low]` `[reject]` The spec says "like twofold.html" but render also runs from the rAF loop (edge) — the spec also requires the rAF timer; frame now renders only when the shown seconds change.
  - `[false]` `[reject]` Spec file untracked, so references dangle (blind-hunter) — committed at finalize.
  - `[low]` `[defer]` Map frontmatter and the 18-files line are stale (blind-hunter) — deferred with the docs drift.
  - `[low]` `[defer]` The setText convention line, the CLAUDE.md shape paragraph and the README add-a-game text don't cover Minefield's DOM-plus-timer shape (blind-hunter) — agent-context docs; deferred.
  - `[low]` `[patch]` Win message reads "in 1 seconds" (blind-hunter) — patched: singular at 1, with a test.
  - `[low]` `[reject]` role="grid" without rows or gridcells, and no arrow-key navigation across up to 480 cells (blind-hunter) — the spec requires role="grid"; keyboard navigation is beyond the intent and more than a direct correction. Residual risk.
  - `[medium]` `[patch]` Flagging only through pointerdown button 2 misses Mac Ctrl+click, the ContextMenu key and Shift+F10, and Ctrl+click may reveal (blind-hunter) — patched: marking via contextmenu, long press marks once, Ctrl+click never reveals; tests added.
  - `[low]` `[patch]` Number, flag-hover and wrong-flag colours fall below contrast minimums (blind-hunter) — patched: numbers at 5.0 or more, flag 3.17 on hidden and 4.06 on hover, wrong flag 4.61.
  - `[low]` `[patch]` render() runs on the whole board every frame and writes aria-pressed unchecked (blind-hunter) — patched: frame renders only when the shown seconds change; aria-pressed written on change; tested with a write counter.
  - `[low]` `[patch]` Board rebuild keyed on cell count only (blind-hunter) — patched: keyed on count or level; tested.
  - `[low]` `[patch]` Tests miss the 1-second message and a pending long press dropped by reset (blind-hunter) — patched: both added.
  - `[low]` `[reject]` The source check for a non-recursive flood is brittle (blind-hunter) — kept on purpose: the intent requires "iterative BFS, not recursion", and the check pins it alongside the 300x300 run.

## Auto Run Result

- **Summary:** Built Minefield as `minefield.html`. A DOM-free board model (`newBoard`, `placeMines`, `reveal` with an iterative BFS flood, `cycleMark`, `chord`, `status`) sits under a DOM grid of cell buttons. It has three difficulties, a safe first click that opens an area, flag and question marks, chording, a mine counter, a rAF-driven timer, a "New game" text button, and long press to mark on touch.
- **Files changed:**
  - `minefield.html` -- the game.
  - `test-minefield.mjs` -- the model directly through `run()` (seeded mine placement, a 300x300 flood), every I/O matrix row, input paths (contextmenu, Ctrl+click, long press, keyboard), rendering and contrast-bearing classes.
  - `README.md` -- games table, controls, test command.
  - `CLAUDE.md`, `docs/CODEBASE_MAP.md` -- game list, test command, Minefield section.
- **Review findings:** 28 findings: 0 high, 3 medium, 20 low, 5 false.
  - Patched: 12 rows in 7 fixes. The medium entry is marking: moved to `contextmenu` so Mac Ctrl+click and the keyboard menu keys work and a long press marks once.
  - Deferred: 3 rows (docs drift) as one `deferred` item.
  - Rejected: 8 low and 5 false. Reasons are in the triage log.
- **Follow-up review recommended:** false. No high was patched and only one medium entry.
- **Verification:** all five suites pass. The implementer checked each new test against a deliberate bug; I re-ran one (the Ctrl-key guard) and it is caught.
- **Residual risks:**
  - Not played on a real phone or Mac browser; long press and Ctrl+click event order are from platform behaviour, tested with stubs.
  - `role="grid"` has no rows or gridcells, and there is no arrow-key navigation, so keyboard play on Hard means tabbing through 480 buttons.
  - Hard (30 wide) scrolls sideways on a phone.
  - The timer pauses while the tab is hidden.
  - The README Play link stays dead until merge and GitHub Pages rebuild.

## Design Notes

Flood fill: `const queue = [i]; while (queue.length) { const j = queue.shift(); … if (count[j] === 0) push hidden unflagged neighbours not yet queued }` — a `seen` set (or marking revealed before pushing) keeps each cell queued once. Use an index pointer instead of `shift()` if needed for speed on 480 cells.

## Verification

**Commands:**
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs` -- expected: all five print their pass line, exit 0.

**Manual checks (if no CLI):**
- Open `minefield.html`: play each difficulty, flood fill, flag and question marks, chord, lose and win, reset, and long-press on a phone.
