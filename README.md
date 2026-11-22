# Retro Games

Small retro browser games. Each game is one self-contained HTML file with no build step, no dependencies and nothing to install.

| Game | File | What it is |
|---|---|---|
| Gapwing | `gapwing.html` | An original one-button flyer: flap a bird through gaps between scrolling pillars |
| Snake | `snake.html` | Classic grid snake on a 20x20 board, with a saved high score, optional wrap-around walls (T) and pause (keyboard only) |
| Stackfall | `stackfall.html` | An original falling-blocks puzzle on a 10x20 board, with a 7-bag, next preview, hold and ghost (keyboard only) |

## Play

Play online: [Gapwing](https://kpharcos.github.io/retro-games/gapwing.html) · [Snake](https://kpharcos.github.io/retro-games/snake.html) · [Stackfall](https://kpharcos.github.io/retro-games/stackfall.html)

You can also clone the repo and open `gapwing.html`, `snake.html` or `stackfall.html` in a browser.

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

Pieces come from a 7-bag: each bag holds all seven shapes once, in random order, and a held piece can reappear sooner. The level is 1 + lines / 10 (rounded down), and pieces fall one row every max(50, 1000 · 0.8^(level-1)) ms. A resting piece locks 500 ms after it lands; only falling a row restarts that timer. Clearing 1 / 2 / 3 / 4 rows scores 100 / 300 / 500 / 800 × level, using the level before the clear; soft and hard drops score nothing. The game ends when a new piece has no room to spawn.

←, → and ↓ repeat while held; ↑, Space and hold act once per press. There is no pause.

Rotation only tries one column of shift sideways and never shifts up, so a piece resting flat on the floor or on a flat stack cannot rotate, and an upright I flush against either wall cannot rotate from one of its two vertical positions; move it one column away from the wall first.

## Tests

The tests need Node 18+ and nothing else:

```sh
node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs
```

`harness.mjs` loads a game's inline `<script>` into `node:vm` with a stub DOM, so the tests can drive game state and key presses directly.

## Adding a game

Copy the shape of `gapwing.html`:

- exactly one bare `<script>`
- state in top-level `let`s
- `reset()`, `step(dt)` and a read-only `render()`
- an `onKey(e)` handler that reads `e.code`
- a `requestAnimationFrame` loop

Then add a `test-<name>.mjs` that calls `load('./<name>.html')` from `harness.mjs`. See [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for the full layout.

## AI tooling (optional)

The games were planned with the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) agent framework. The design specs are in `_bmad-output/implementation-artifacts/`. The framework itself is not committed. To restore it:

```sh
npx bmad-method@6.12.4 install --directory . --modules bmm,gds,cis,tea,bmb,bmad-loop \
  --tools claude-code,opencode,qwen --set gds.primary_platform=other --yes
```

## License

[MIT](LICENSE)
