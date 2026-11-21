# Retro Games

Small retro browser games. Each game is one self-contained HTML file with no build step, no dependencies and nothing to install.

| Game | File | What it is |
|---|---|---|
| Gapwing | `gapwing.html` | An original one-button flyer: flap a bird through gaps between scrolling pillars |
| Snake | `snake.html` | Classic grid snake on a 20x20 board, with a saved high score, wrap-around walls and pause (keyboard only) |

## Play

Play online: [Gapwing](https://kpharcos.github.io/retro-games/gapwing.html) · [Snake](https://kpharcos.github.io/retro-games/snake.html)

You can also clone the repo and open `gapwing.html` or `snake.html` in a browser.

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

The snake starts at length 3 and 8 moves per second. Each food adds 1 length and 10 points, and every 50 points the snake speeds up by 0.5 moves per second. Hitting a wall (with wrap off) or the body ends the run; filling the whole board wins it. The high score is kept in `localStorage`.

## Tests

The tests need Node 18+ and nothing else:

```sh
node test-gapwing.mjs && node test-snake.mjs
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
