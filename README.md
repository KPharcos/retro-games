# Retro Games

Small retro browser games. Each game is one self-contained HTML file with no build step, no dependencies and nothing to install.

| Game | File | What it is |
|---|---|---|
| Gapwing | `gapwing.html` | An original one-button flyer: flap a bird through gaps between scrolling pillars |
| Snake | `snake.html` | Classic grid snake on a 20x20 board, with a saved high score, optional wrap-around walls (T) and pause (keyboard only) |
| Stackfall | `stackfall.html` | An original falling-blocks puzzle on a 10x20 board, with a 7-bag, next preview, hold and ghost (keyboard only) |
| Twofold | `twofold.html` | An original sliding-merge number puzzle on a 4x4 board, with one-step undo and a saved best score (keyboard or swipe) |
| Minefield | `minefield.html` | A mine-sweeping puzzle in three sizes, with a safe first click, flags and question marks, chording and a timer (mouse, touch or keyboard) |
| Molebop | `molebop.html` | An original 30-second whack-the-mole game on a 3x3 field, with golden moles, bombs and a saved best score (mouse, touch or keyboard) |
| Pairflip | `pairflip.html` | An original memory game: find the matching letter pairs on a 4x4 or 6x6 board, with a moves counter and a timer (mouse, touch or keyboard) |

## Play

Play online: [Gapwing](https://kpharcos.github.io/retro-games/gapwing.html) · [Snake](https://kpharcos.github.io/retro-games/snake.html) · [Stackfall](https://kpharcos.github.io/retro-games/stackfall.html) · [Twofold](https://kpharcos.github.io/retro-games/twofold.html) · [Minefield](https://kpharcos.github.io/retro-games/minefield.html) · [Molebop](https://kpharcos.github.io/retro-games/molebop.html) · [Pairflip](https://kpharcos.github.io/retro-games/pairflip.html)

You can also clone the repo and open `gapwing.html`, `snake.html`, `stackfall.html`, `twofold.html`, `minefield.html`, `molebop.html` or `pairflip.html` in a browser.

### Gapwing controls

| Input | Action |
|---|---|
| Space / click / tap | Flap; starts a run; from 0.5 s after game over, returns to the ready screen |

Each pillar scores 1 point when its right edge passes the bird's centre. The gap starts at 150 px and shrinks by 5 px every 5 points, down to 100 px. There is no ceiling: the bird can fly above the top of the screen, but a pillar still ends the run if the bird is over it.

### Snake controls

| Input | Action |
|---|---|
| Arrow keys / WASD | Steer (180° turns are ignored) |
| P | Pause / resume |
| T | Toggle wrap-around walls (kept across restarts) |
| Space | Restart after the run ends |

The snake starts at length 3 and 8 moves per second. Each food adds 1 length and 10 points, and every 50 points the snake speeds up by 0.5 moves per second. Hitting a wall (with wrap off) or the body ends the run, but moving into the cell the tail is leaving is allowed; filling the whole board wins it. The high score is kept in `localStorage`.

### Stackfall controls

| Input | Action |
|---|---|
| ← / → | Move one column |
| ↑ | Rotate clockwise (tries one column left, then right, if blocked) |
| ↓ | Soft drop one row |
| Space | Hard drop and lock |
| C / Shift | Hold (once per piece) |
| R | Restart after game over |

Pieces come from a 7-bag: each bag holds all seven shapes once, in random order, and a held piece can reappear sooner. The level is 1 + lines / 10 (rounded down), and pieces fall one row every max(50, round(1000 · 0.8^(level-1))) ms. A piece locks after 500 ms of total resting time since it last fell a row; time in the air does not count, and sliding on a rest spot does not restart the timer. Clearing 1 / 2 / 3 / 4 rows scores 100 / 300 / 500 / 800 × level, using the level before the clear; soft and hard drops score nothing. The game ends when a new piece has no room to spawn. The ghost is an outline of where the piece would land.

←, → and ↓ repeat while held; ↑, Space and hold act once per press. There is no pause. There is no high score; nothing is saved between runs.

Rotation only tries one column of shift sideways and never shifts up, so a piece resting flat on the floor or on a flat stack cannot rotate, and an upright I flush against either wall cannot rotate from one of its two vertical positions; move it one column away from the wall first.

### Twofold controls

| Input | Action |
|---|---|
| Arrow keys / swipe (drag 30 px or longer, starting on the board) | Slide all tiles; holding a key repeats |
| Enter / numpad Enter / C / Continue button | Keep playing after the 2048 message |
| U / Undo button | Undo the last move (one step) |
| N / New game button | Start a new game at any time |

Every tile slides as far as it can. Two equal tiles that meet merge into their sum, which is added to the score; a tile merges at most once per move, and with three equal in a row the pair nearest the wall merges. After a move that changed the board, a new tile appears on a random empty cell: a 2 (90%) or a 4 (10%). The first 2048 tile shows a message with Continue. The message shows once per game, and undoing past it shows it again when 2048 is reached again. The game is over when no slide can change the board. Undo also works from the game-over and 2048 screens. The best score is kept in `localStorage`. The current run is not saved; only the best score is kept, so reloading starts a new game.

Twofold is DOM-based: tiles are positioned `<div>`s that slide with a CSS transition, so there is no canvas and no animation loop.

Twofold needs a browser from about 2022 or later (it uses CSS `scale` in keyframes, `aspect-ratio` and `Object.hasOwn`).

### Minefield controls

| Input | Action |
|---|---|
| Click / tap a hidden cell, or Enter / Space on the focused cell | Reveal it |
| Right click / Ctrl+click (Mac) / Menu key or Shift+F10 / long press (touch, about 450 ms) / F on the focused cell | Cycle the mark: flag, question mark, none |
| Click a revealed number (or Enter / Space on it) | Chord: if its adjacent flags equal the number, reveal every adjacent cell that is not flagged |
| Easy / Medium / Hard buttons | Start a new game at 9x9 with 10 mines, 16x16 with 40, or 30x16 with 99 |
| N / New game button | Start a new game at the current difficulty |

Mines are placed on the first reveal, never on the clicked cell or its eight neighbours, so the first click always opens an area, unless you flagged cells around it first, since flags hold a flood. Revealing a 0 opens its connected zeros and their numbered border. A flood or a chord also opens question-marked cells; only flags protect a cell. Flags and question marks both block a direct click. The mine counter is mines minus flags and can go negative. The timer starts on the first reveal, counts whole seconds up to 999 and stops on a win or a loss; it pauses while the tab is hidden. You win when every safe cell is revealed; the remaining mines then show as flags. Revealing a mine shows every mine, marks the one that went off and crosses out wrong flags. After a win or a loss the board ignores input until a new game. Nothing is saved.

Minefield is DOM-based: each cell is a `<button>` in a CSS grid. The Medium and Hard boards are wider than a portrait phone screen and scroll sideways. Tab moves focus between cells; each cell has a label for screen readers.

Minefield needs a browser from about 2022 or later (it uses `Object.hasOwn`, `?.` and `clamp()`).

### Molebop controls

| Input | Action |
|---|---|
| Start button / Space / Enter | Start a round, from the start screen or the end screen; the end screen ignores it for 0.5 s after a round ends |
| Click / tap a hole, or Enter / Space on the focused hole | Whack it |
| 1-9 | Whack a hole in reading order (1 is top-left, 9 bottom-right) |
| Numpad 1-9 | Whack a hole as laid out on the pad (7 is top-left, 3 bottom-right) |

A round lasts 30 seconds. The first mole pops up 0.5 s after Start, then a new one 800 ms after each pop, or 450 ms after a pop made with 10 seconds or less left, into a random empty hole; several can be up at once, and a pop is skipped when all nine holes are up. Each stays up for 700-1200 ms. A mole scores 1, a golden mole (★, 10% of pops) scores 5, and a bomb (✸, 10%) ends the round at the current score. Whacking an empty hole costs 1 point, never going below 0. Holes ignore input outside a round. The best score is kept in `localStorage`; nothing else is saved. There is no pause button, but the round waits while the tab is hidden.

Molebop is DOM-based: each hole is a `<button>` and the moles slide with a CSS transition; a rAF loop runs only the clock. Each hole has a label for screen readers.

Molebop needs a browser from about 2023 or later (it uses `inert`, `aspect-ratio`, `inset`, `min()` / `clamp()`, `?.` and `catch {}` without a binding). An older browser without `inert` still plays the same; Tab just also walks the empty holes between rounds.

### Pairflip controls

| Input | Action |
|---|---|
| Click / tap a card, or Enter / Space on the focused card | Flip it |
| Tab / Shift+Tab | Move focus between cards and buttons |
| Normal 4x4 / Hard 6x6 buttons | Start a new game with 8 pairs (letters A-H) or 18 pairs (A-R) |
| R / Restart button / Play again button | Start a new game in the current mode |

The deck is shuffled with Fisher-Yates at the start of every game. A move is one pair of flips. A matching pair stays face-up; a mismatched pair turns back after 0.8 s, and other cards ignore clicks until it does. Face-up and matched cards ignore clicks. The timer starts on the first flip, shows minutes and seconds, stops when the last pair is found and pauses while the tab is hidden. Finding every pair shows a panel with your moves and time. Nothing is saved.

Pairflip is DOM-based: each card is a `<button>` that turns over with a CSS 3D transition (off when the system asks for reduced motion); a rAF loop runs only the clock and the flip-back. Each card has a label for screen readers.

Pairflip needs a browser from about 2021 or later (it uses `?.`, `min()` and `inset`). It also uses `inert` (about 2023) to lock the board under the win panel; an older browser without `inert` still plays the same, Tab just also walks the covered cards. `:focus-visible` (available in all current browsers since March 2022) draws the keyboard focus ring; an older browser still plays the same but shows no ring on a focused card.

## Tests

The tests need Node 18+ and nothing else:

```sh
node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs && node test-pairflip.mjs
```

`harness.mjs` loads a game's inline `<script>` into `node:vm` with a stub DOM, so the tests can drive game state and key presses directly.

## Adding a game

Copy the shape of `gapwing.html`:

- exactly one bare `<script>`
- state in top-level `let`s
- `reset()`, `step(dt)` and a read-only `render()`
- an `onKey(e)` handler that reads `e.code`
- a `requestAnimationFrame` loop

A turn-based DOM game like `twofold.html` may skip `step(dt)` and the loop: its moves update state and call `render()` directly, and CSS does the animation.

Then add a `test-<name>.mjs` that calls `load('./<name>.html')` from `harness.mjs`. See [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for the full layout.

## AI tooling (optional)

The games were planned with the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) agent framework. The design specs are in `_bmad-output/implementation-artifacts/`. The framework itself is not committed. To restore it:

```sh
npx bmad-method@6.12.4 install --directory . --modules bmm,gds,cis,tea,bmb,bmad-loop \
  --tools claude-code,opencode,qwen --set gds.primary_platform=other --yes
```

## License

[MIT](LICENSE)
