---
title: 'Pairflip: memory card game'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_revision: '04615c250e81514f56aeeda453f2c53d22efb3b6'
review_loop_iteration: 0
followup_review_recommended: true
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md does not cover Pairflip: it still says six games and has no pairflip.html / test-pairflip.mjs entries or per-game section.
    evidence: |-
      Review pass 1 (blind-hunter). CODEBASE_MAP is an agent-context doc linked from CLAUDE.md, so the fix is deferred; a cartographer re-map refreshes it, as after Minefield and Molebop.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no memory/pairs game. The user wants one in a single HTML file, DOM + CSS (no canvas): a 4x4 grid of 8 pairs with letter faces, click to flip, a match stays open, a mismatch flips back after 800 ms, clicks blocked while two cards are face-up, a moves counter and a timer, a win screen, a Fisher-Yates shuffle and a Restart button. Stretch: a 6x6 hard mode and a CSS 3D flip animation.

**Approach:** Add `pairflip.html` under the original name "Pairflip" (generic genre rules, no existing product's name or look), plus `test-pairflip.mjs` driving it through `harness.mjs`. It is a DOM game with a clock, like `minefield.html`: one `<button>` per card, `step(dt)` and a rAF loop run the timer and the 800 ms flip-back, and `render()` runs from the loop only when what it shows changes. Both stretch goals are in scope.

## Boundaries & Constraints

**Always:** exactly one bare `<script>`; top-level `let` state; `reset()`, `step(dt)`, read-only `render()`; `onKey(e)` on `e.code` via `document.addEventListener`; rAF `frame` loop with `dt` capped at 100 ms. Faces are plain letters `A`.. (`A`-`H` normal, `A`-`R` hard), never emoji. The deck is shuffled with an in-place Fisher-Yates over `Math.random`. `render()` reuses one button per card index (rebuilt only when the card count changes). A move = one completed pair of flips. Timer starts on the first flip and stops on the win. The 800 ms flip-back is counted in `step(dt)`, not `setTimeout`. Cards keep accessible names (`aria-label`) that say face-down / the letter / matched. `prefers-reduced-motion` turns the flip transition off.

**Never:** canvas, `setTimeout`/`setInterval`, audio, external assets or dependencies, emoji, saved best scores, extra modes beyond Normal 4x4 and Hard 6x6.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First flip | fresh board, click card | card face-up, timer starts, moves 0 | — |
| Match | second card same letter | both stay face-up as matched, moves +1, clicks open again at once | — |
| Mismatch | second card other letter | both face-up; at 799 ms still up, at 800 ms both face-down; moves +1 | — |
| Third click during hold | two unmatched face-up | ignored (no flip, no move) | — |
| Re-click | face-up or matched card | ignored | — |
| Win | last pair matched | win panel shows moves and time, timer frozen, card clicks ignored | — |
| Restart | any time, incl. during hold | new shuffled deck, all face-down, moves 0, timer 0 and stopped, win panel hidden | — |
| Hard mode | press Hard 6x6 | 36 cards (18 pairs), new game; Normal 4x4 goes back to 16 | — |
| Key R | keydown `KeyR`, not repeat, no Ctrl/Meta/Alt | same as Restart | repeat / modified ignored |

</intent-contract>

## Code Map

- `minefield.html` -- pattern to copy: level buttons with `aria-pressed`, `cellEls` reuse in `render()`, `setText()`, `frame()` rendering only when the shown second changes, document `click` listener dispatching by `cellEls.indexOf(target)` / button id, `KeyN` guard on `repeat`/modifiers.
- `harness.mjs` -- `load(file, globals)`; pass `document`, `Math` and `requestAnimationFrame` stubs via `globals`.
- `test-minefield.mjs:18-60` -- `makeDoc()` stub DOM (persistent element per id, `createElement`/`appendChild`, attribute tracking) and `stubMath`; copy the trimmed parts needed.
- `README.md:5-18,98-107` -- games table, play links, open-file line, per-game controls section, test command.
- `CLAUDE.md` -- game count/list, stack line, DOM-with-clock note, test command.

## Tasks & Acceptance

**Execution:**
- `pairflip.html` -- the game: header (title, Moves, Time `m:ss`), mode buttons `normal`/`hard` + `restart`, `#board` CSS grid of card buttons (3D flip via `transform: rotateY(180deg)` on `.up`, faces from `::before`/`::after` with `backface-visibility: hidden`, letter from `data-face`), `#win` panel (hidden until won) with text and a Play again button, aria-live status.
- `test-pairflip.mjs` -- node:vm self-check covering every I/O matrix row, the Fisher-Yates order for a fixed `Math.random`, each letter appearing exactly twice, button reuse across moves, and page rules (one script, no canvas/timers/emoji).
- `README.md`, `CLAUDE.md` -- add Pairflip to the lists, a controls section, and `node test-pairflip.mjs` to the test command.

**Acceptance Criteria:**
- Given the page opens, when it loads, then a 4x4 grid of 16 face-down cards shows with Moves 0 and Time 0:00.
- Given a board with a pair face-up after a mismatch, when the clock advances 800 ms through `frame`, then both cards render face-down without any click.
- Given all pairs matched, when the last match lands, then the win panel is visible with the move count and time and the Play again button starts a new game.
- Given `node test-gapwing.mjs && ... && node test-pairflip.mjs`, when run, then every suite passes.

## Spec Change Log

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 23 findings — high 0, medium 4, low 13, false 6, maybe-false 0
- findings:
  - `[medium]` `[patch]` rAF re-arm in `frame()` untested; deleting it keeps the suite green but softlocks the game after the first mismatch (verification-gap, pre-verified by mutation) — test asserts `rafs` grows by one per tick.
  - `[false]` `[reject]` README "timer pauses while the tab is hidden" overstates the code (verification-gap) — browsers stop rAF in hidden tabs and `dt` is capped at 100 ms, so the timer does pause; same wording and mechanism as Minefield.
  - `[low]` `[reject]` 3D flip only checked as CSS text (intent-alignment) — settled by hand: headless Chrome screenshots show the back hidden, the letter unmirrored on face-up and matched cards, and the 6x6 layout; no browser harness in the repo to add.
  - `[low]` `[reject]` the face is fully visible ~650 ms of the 800 ms because the 0.3 s turn overlaps the hold (intent-alignment) — 800 ms from the second click is the literal intent; delaying the hold until the turn ends adds a branch for no felt gain.
  - `[false]` `[reject]` blocking ends while cards are still turning back; Restart/mode buttons not blocked (intent-alignment) — once state has turned the pair down no two cards are face-up, so the intent's block no longer applies; Restart must always work.
  - `[low]` `[reject]` Enter/Space flipping untested (intent-alignment) — native `<button>` activation fires `click`, which the tests drive; a stub can't observe the browser's key-to-click mapping.
  - `[false]` `[reject]` timer measured in game time, not wall time (intent-alignment) — the intent sets no clock source; game-time pause while hidden is the repo's Minefield behaviour.
  - `[low]` `[reject]` win overlay covering the board untested (intent-alignment) — settled by hand: headless Chrome win screenshot shows the panel over the whole board.
  - `[low]` `[reject]` `data-face` holds the letter on face-down cards (intent-alignment) — only visible in devtools; accessible names hide it; moving it adds a blank-face flash on flip-back.
  - `[false]` `[reject]` shuffle fairness untested (intent-alignment) — `j = floor(rand() * (i + 1))` is the unbiased Fisher-Yates step and the exact-sequence test pins it.
  - `[false]` `[reject]` test file and doc edits exceed "single HTML file" (intent-alignment) — the game is one self-contained file; tests and docs follow the repo convention for every game.
  - `[medium]` `[patch]` win panel leaves focus on a card under the overlay and every card in the Tab order (edge-case-hunter; same as blind-hunter row below) — `boardEl.inert = won()` in render, `#again` focused on the winning flip.
  - `[low]` `[reject]` first started frame can count up to 100 ms from before the first flip (edge-case-hunter) — at most one frame (~16 ms normally); fix needs a flip timestamp.
  - `[medium]` `[patch]` win panel focus (blind-hunter) — grouped with the edge-case row above; same fix.
  - `[low]` `[patch]` Play again hides the focused button, dropping focus to `<body>` (blind-hunter) — first card focused after a reset from `#again`.
  - `[medium]` `[patch]` screen readers hear nothing until the win (blind-hunter) — a `note` string set in `flip()` ("B", "B and C, no match", "B and B, matched") goes to `#status`.
  - `[low]` `[reject]` blocked cards still show the hover ring during the 800 ms hold (blind-hunter) — cosmetic, 0.8 s window, needs a board busy class.
  - `[low]` `[defer]` `docs/CODEBASE_MAP.md` not updated (blind-hunter) — agent-context file; recorded in `deferred`.
  - `[false]` `[reject]` spec file untracked, so the test header points to nothing (blind-hunter) — the spec is committed with the change at finalize.
  - `[low]` `[patch]` Hard mode kept by Play again / Restart / R untested (blind-hunter) — test added.
  - `[low]` `[patch]` Play again reshuffle untested (rand stayed 0) (blind-hunter) — test now changes `rand` and asserts a new order.
  - `[low]` `[patch]` render-only-on-change in `frame` untested (blind-hunter) — test counts DOM writes over quiet frames.
  - `[low]` `[patch]` `Object.hasOwn` raises the browser floor for nothing (blind-hunter) — `MODES[t.id]`; README compat line lowered.

## Design Notes

State: `mode` (`'normal'|'hard'`), `cards` (`[{face, up, matched}]`), `open` (indices of face-up unmatched cards, 0-2), `moves`, `elapsed` (ms), `hold` (ms left before a mismatch flips back, 0 = none). `won` = every card matched; `started` = any card ever flipped this game.

```js
function shuffle(a, rand) { // Fisher-Yates, in place
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
```

## Verification

**Commands:**
- `node test-pairflip.mjs` -- expected: prints `all pairflip tests passed`, exit 0.
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs` -- expected: all pass.

**Manual checks (if no CLI):**
- Open `pairflip.html`: cards flip in 3D, mismatches turn back after ~0.8 s, Hard shows 6x6, win panel appears.

## Auto Run Result

Status: done

**Summary:** Added Pairflip, an original memory pairs game: one `<button>` per card in a CSS grid, letter faces (A-H on Normal 4x4, A-R on Hard 6x6), Fisher-Yates shuffle, a CSS 3D flip (`rotateY` with pseudo-element faces and `backface-visibility`, off under reduced motion), a match stays up and a mismatch turns back after 800 ms counted in `step(dt)`, card clicks blocked while two are face-up, a moves counter (one per pair), an `m:ss` timer from the first flip to the win, a win panel with Play again, Restart button and `R` key. `#status` announces each flip, match and mismatch; on the win the board goes inert and focus moves to Play again.

**Files changed:**
- `pairflip.html` -- the game.
- `test-pairflip.mjs` -- node:vm self-check for every I/O matrix row plus rAF re-arm, quiet frames, focus/inert and status notes.
- `README.md` -- Pairflip row, play link, controls section, browser-compat line, test command.
- `CLAUDE.md` -- seven games, Pairflip in the stack and DOM-with-clock notes, test command.
- `_bmad-output/implementation-artifacts/spec-pairflip-memory-game.md` -- this spec.

**Review findings:** 23 total (high 0, medium 4, low 13, false 6). Patched 9 rows in 8 fixes (medium: rAF re-arm test, win focus + inert board, `#status` flip notes; low: focus after Play again, Hard-mode restart test, Play again reshuffle test, quiet-frame test, `Object.hasOwn` dropped). Deferred 1 (CODEBASE_MAP refresh). Rejected 13: 3D flip / overlay checked only as text (settled by headless Chrome screenshots); face visible ~650 of 800 ms (literal intent); block ends during turn-back and Restart not blocked (false); Enter/Space untested (native button click); game-time timer (false); `data-face` on face-down cards (devtools only); shuffle fairness (false, pinned); scope beyond one file (false, repo convention); README hidden-tab pause (false); first-frame ≤100 ms (unfelt); hover ring during hold (cosmetic); untracked spec (false, committed now).

**Follow-up review recommendation:** true — first pass patched 3 medium entries (high 0, medium 3, low 5 entries). Unverified risk: the `#status` announcements and `inert`/focus moves were never run with a real screen reader, and the live 800 ms flip-back and timer were not observed in a browser (headless Chrome's rAF stalled under virtual time).

**Verification:** `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs` -- all pass. Headless Chrome (google-chrome-stable): screenshots of Normal mid-play, the win panel and Hard 6x6 render correctly; a scripted win leaves focus on `#again` with the board inert, and Play again focuses the first card with the board live.

**Residual risks:** Safari `preserve-3d` on `<button>` pseudo-elements not checked; screen-reader output not heard; `docs/CODEBASE_MAP.md` still lacks Pairflip (deferred).
