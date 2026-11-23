# retro-games

## Codebase Overview

Standalone retro browser games, one self-contained HTML file each. Currently five: `gapwing.html` (an original one-button flyer), `snake.html` (classic grid snake), `stackfall.html` (an original falling-blocks puzzle), `twofold.html` (an original sliding-merge number puzzle, DOM-based) and `minefield.html` (a mine-sweeping puzzle, DOM-based with a rAF timer). `harness.mjs` runs a game's inline script in `node:vm` with a stub DOM, and `test-gapwing.mjs` / `test-snake.mjs` / `test-stackfall.mjs` / `test-twofold.mjs` / `test-minefield.mjs` assert the rules. Specs from BMAD workflows live in `_bmad-output/implementation-artifacts/`.

**Stack**:
- Game code: vanilla JS, Canvas 2D (Twofold: DOM + CSS transitions; Minefield: DOM grid of buttons), inline CSS.
- No build and no dependencies. Node is used only for tests: `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs`.
- Agent tooling: BMAD v6.12.4 with the core, bmm, gds, cis, tea, bmb and bmad-loop modules.

**Structure**:
- Games, the harness and the tests are at the root.
- BMAD config and scripts are in `_bmad/`.
- The vendored skills in `.agents/`, `.claude/` and `.qwen/` are identical copies. Don't hand-edit them; customize through `_bmad/custom/`.

New games follow the shared shape:
- exactly one bare `<script>`;
- top-level `let` state;
- `reset()`, `step(dt)` and a read-only `render()`;
- `onKey(e)` on `e.code` via `document.addEventListener`;
- pointer input, if any, via `document.addEventListener('pointerdown', …)`;
- a rAF `frame` loop;
- a `test-<name>.mjs` that uses `load()` from `harness.mjs`.

A turn-based DOM game (like `twofold.html`) may skip the canvas, `step(dt)` and the rAF loop: its actions update state and call `render()` directly, and CSS animates. `render()` must reuse one element per tile id across moves, or tiles jump instead of sliding. Its tests pass a `document` stub with `createElement`/`appendChild` through `load()`'s `globals`. A DOM game that needs a clock (like `minefield.html`) keeps `step(dt)` and the rAF loop for it, and renders from the loop only when what it shows changes.

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
