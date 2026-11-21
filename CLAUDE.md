# retro-games

## Codebase Overview

Standalone retro browser games, one self-contained HTML file each: `snake.html` and `stackfall.html` (an original falling-block puzzle). Both use the same testable shape. `harness.mjs` runs a game's inline script in `node:vm` with a stub DOM, and `test.mjs` (Stackfall) and `test-snake.mjs` (Snake) assert the rules. Specs from BMAD workflows live in `_bmad-output/implementation-artifacts/`.

**Stack**:
- Game code: vanilla JS, Canvas 2D, inline CSS.
- No build and no dependencies. Node is used only for tests: `node test.mjs && node test-snake.mjs`.
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
- a rAF `frame` loop;
- a `test-<name>.mjs` that uses `load()` from `harness.mjs`.

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).
