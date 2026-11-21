---
title: Snake Game Implementation
type: feature
created: 2026-11-20
status: done
---

<intent-contract>
## Intent

**Problem:** Need a classic Snake game implementation in a single HTML file with canvas and vanilla JavaScript.

**Approach:** Create a complete, playable Snake game with all core features including grid movement, food collection, scoring, and game over conditions, plus stretch goals for wrap-around mode and pause functionality.

## Boundaries & Constraints

**Always:** 
- Single HTML file implementation using only vanilla JavaScript
- Canvas-based rendering
- 20x20 grid with 20px cells
- Arrow keys or WASD controls
- No 180-degree reversals allowed
- Game speed increases every 50 points
- High score persistence using localStorage

**Never:** 
- External libraries or frameworks
- External stylesheets (inline `<style>` is fine)
- Multiple files for implementation
- Complex game features beyond the core requirements

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Game Start | Initial state | Snake starts at center, moving right, food appears randomly | None expected |
| Food Collection | Snake head on food cell | Snake grows by 1, score increases by 10, new food spawns | None expected |
| Collision | Snake hits wall or self | Game over screen with score and restart prompt | Show game over UI |
| Key Press | Arrow/WASD key pressed | Snake direction changes (with no 180-degree reversal) | Ignore invalid inputs |
| Speed Increase | Score reaches multiple of 50 | Game speed increases by 0.5 ticks/sec | Update game loop speed |
| Pause | P pressed (not held) | Time stops, "Paused" overlay; P again resumes | Key repeat ignored |
| Wrap toggle | T pressed | Walls wrap to the opposite side; setting survives restart | Key repeat ignored |
| Full board | Last empty cell eaten | "You win!" overlay, high score saved | n/a |
| Game over input | Any key but Space/T after game over | Ignored; Space restarts | n/a |
| Page scroll | Arrow keys / Space | `preventDefault`, page doesn't scroll | Other keys untouched |
</intent-contract>

## Code Map

- `snake.html` -- Main HTML file containing the complete Snake game implementation
- `canvas` -- Canvas element for rendering the game grid and snake
- `keydown` -- `onKey(e)` via `document.addEventListener`, reads `e.code` (arrows/WASD, P, T, Space)
- `localStorage['snakeHighScore']` -- high score persistence, wrapped in try/catch
- `test-snake.mjs` -- Node self-check via shared `harness.mjs`

## Tasks & Acceptance

**Execution:**
- `snake.html` -- Create complete HTML file with canvas, JavaScript, and all game logic -- Implement all core Snake game functionality in a single file

**Acceptance Criteria:**
- Given the game starts, when player controls snake, then snake moves in direction of input
- Given snake eats food, when snake head is on food cell, then snake grows by 1 and score increases by 10
- Given snake hits wall or itself, when collision occurs, then game over screen appears with score and restart prompt
- Given score reaches multiple of 50, when points are earned, then game speed increases by 0.5 ticks/sec
- Given player presses P key, when pause is triggered, then game pauses until P is pressed again

## Design Notes

Same testable shape as Stackfall: state in module-level `let`s, `tick()` does one move, `step(dt)` accumulates time and runs ticks at `1000/speed` ms, `render()` only reads state, and a `requestAnimationFrame` loop drives it. No `setInterval`, so a speed-up needs no timer reset.

Original plan:

The implementation will use a single HTML file with embedded JavaScript and CSS to create a complete Snake game. The game will be structured as:

1. Canvas setup with 20x20 grid of 20px cells
2. Snake movement logic with direction controls
3. Food generation and collision detection
4. Scoring system with speed adjustment
5. Game over handling with restart functionality
6. High score persistence using localStorage
7. Stretch goals for wrap-around mode and pause functionality

## Verification

**Commands:**
- `node test-snake.mjs` -- expected: prints `all snake tests passed`, exit 0.

**Manual checks (if no CLI):**
- Open the HTML file in a browser and verify all functionality works as specified
- Test keyboard controls (arrow keys/WASD)
- Verify score and high score persistence
- Confirm game speed increases appropriately
- Test game over conditions

## Spec Change Log

### 2026-11-21 — testable rewrite
- Rewrote the script to the Stackfall pattern (`reset`/`tick`/`step(dt)`/`render`, rAF loop) so `test-snake.mjs` can drive it in `node:vm`.
- Input moved to `e.code`; arrow keys and Space now `preventDefault`; P/T ignore key repeat.
- Full board now shows "You win!" instead of "Game Over".
- Game-over overlay drawn on canvas; DOM `#game-over` box replaced by an `aria-live` `#status` line. Canvas has `role="img"` and an `aria-label`.
- "Never: CSS beyond basic structure" relaxed to "no external stylesheets" to match the shipped inline theme.
- Added I/O rows for pause, wrap, full board, game-over input and scroll prevention, and swapped the placeholder `echo` for a real test.
