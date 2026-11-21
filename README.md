# Retro Games

Small retro browser games. Each game is one self-contained HTML file with no build step, no dependencies and nothing to install.

| Game | File | What it is |
|---|---|---|
| Snake | `snake.html` | Classic grid snake with a high score, pause and wrap-around mode |
| Stackfall | `stackfall.html` | An original falling-block puzzle with a 7-bag randomizer, hold, ghost piece and lock delay |
| Gapwing | `gapwing.html` | An original one-button flyer: flap a bird through gaps between scrolling pillars |

## Play

Play online: [Snake](https://kpharcos.github.io/retro-games/snake.html) · [Stackfall](https://kpharcos.github.io/retro-games/stackfall.html) · [Gapwing](https://kpharcos.github.io/retro-games/gapwing.html)

You can also clone the repo and open any of the HTML files in a browser.

### Snake controls

| Key | Action |
|---|---|
| Arrows / WASD | Steer |
| P | Pause |
| T | Toggle wrap-around |
| Space | Restart after game over |

Each food is worth 10 points, and the snake speeds up every 50 points. Your high score is saved in the browser.

### Stackfall controls

| Key | Action |
|---|---|
| ← → | Move |
| ↑ | Rotate |
| ↓ | Soft drop |
| Space | Hard drop |
| C / Shift | Hold |
| R | Restart after game over |

Line clears score 100 / 300 / 500 / 800 × level. The level goes up every 10 lines.

### Gapwing controls

| Input | Action |
|---|---|
| Space / click / tap | Flap; starts a run; from 0.5 s after game over, returns to the ready screen |

Each pillar scores 1 point when its right edge passes the bird's centre. The gap starts at 150 px and shrinks by 5 px every 5 points, down to 100 px. There is no ceiling: the bird can fly above the top of the screen, but a pillar still ends the run if the bird is over it.

## Tests

The tests need Node 18+ and nothing else:

```sh
node test.mjs && node test-snake.mjs && node test-gapwing.mjs
```

`harness.mjs` loads a game's inline `<script>` into `node:vm` with a stub DOM, so the tests can drive game state and key presses directly.

## Adding a game

Copy the shape of `snake.html`:

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
