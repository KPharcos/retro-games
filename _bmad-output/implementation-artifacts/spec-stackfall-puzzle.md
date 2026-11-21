---
title: 'Stackfall: single-file block-stacking puzzle'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: 'NO_VCS'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The existing game file is a buggy prior attempt: no floor collision (pieces fall through the bottom), `rotate()` mutates the shared `SHAPES` table, colors index by cell value (always 1) so every piece looks the same, wall kick is not the requested x-1/x+1, no lock delay, no hold/ghost, and it uses a trademarked name.

**Approach:** Rewrite the old game file as `stackfall.html`, one self-contained HTML file with canvas, an original name ("Stackfall") and an original palette, implementing every listed feature plus both stretch goals (hold, ghost). Game logic stays in plain functions that a Node test can drive with stubbed DOM.

## Boundaries & Constraints

**Always:** One HTML file, no external assets or libraries. 10 cols x 20 rows. 7 tetrominoes, 7-bag randomizer (each bag is a shuffled permutation of all 7). Arrow Left/Right move, Arrow Up rotates clockwise with kick order: in place, x-1, x+1, up 1, up 2, else rotation is refused. Arrow Down soft-drops one row. Space hard-drops and locks immediately. Score per clear = [0,100,300,500,800][lines] x level. Level = 1 + floor(totalLines/10); gravity interval shrinks with level (level 1 = 1000ms, floor 50ms). Lock delay 500ms: piece resting on the stack locks 500ms after it first rests; a successful move/rotate while resting restarts the timer (capped at 15 restarts per piece to stop infinite stalling); if the piece is no longer resting the timer clears; once the restarts are used up, landing again locks at once unless the piece landed on a new lowest row, which earns one fresh 500ms that cannot be restarted. Game over when a newly spawned piece collides. Next-piece preview. Hold (key C or Shift): swap current with held (or take next if empty), once per piece until it locks. Ghost piece shows hard-drop landing spot. Prevent default browser scroll for game keys. R restarts after game over.

**Never:** Trademarked names/logos or the classic guideline color scheme. External libraries/CDNs. SRS kick tables (only the simple x-1/x+1 and up-1/up-2 kicks). Sound, menus, high-score persistence, touch controls.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bag | Draw 14 pieces | Pieces 1-7 and 8-14 are each a permutation of all 7 types | n/a |
| Wall kick | Vertical I against left wall, rotate | Placed at first non-colliding of x, x-1, x+1, up 1, up 2; if none, unrotated | Rotation refused silently |
| Floor | Piece reaches row 19 | Stops; does not leave the board | n/a |
| Lock delay | Piece resting, no input | Locks after >=500ms resting, not before | n/a |
| Clear 4 | Four full rows, level 2 | Score += 1600, rows removed, above rows shift down | n/a |
| Level up | lines goes 9 -> 10 | level 2, gravity interval decreases | n/a |
| Spawn collision | Stack blocks spawn area | gameOver = true, overlay shown, input ignored except R | n/a |
| Hold twice | Press C twice in one piece | Second press ignored | n/a |

</intent-contract>

## Code Map

- `stackfall.html` -- the deliverable (replaces the buggy attempt described above, backed up to scratchpad). Full rewrite; nothing to reuse except the canvas+side-panel layout idea.
- `SPEC.md` -- user's feature list (source of intent); read-only. No longer in the repo.
- `test.mjs` (new) -- Node self-check: asserts the I/O matrix rows through the exposed game functions.
- `harness.mjs` -- shared loader (since 2026-11-21): reads a game file, extracts the `<script>`, runs it in `node:vm` with stub `document`/canvas context/`requestAnimationFrame`.

## Tasks & Acceptance

**Execution:**
- `stackfall.html` -- rewrite: board/piece logic (collide incl. walls+floor, rotate copies matrix, kick, bag, lock delay, clear+score, level/gravity, hold, ghost), canvas render (board, ghost, piece, next, hold, HUD, game-over overlay), keyboard input -- the deliverable.
- `test.mjs` -- add vm-based assertions for each I/O matrix row -- lazy code needs its check.

**Acceptance Criteria:**
- Given the file opened in a browser, when the page loads, then the title and on-page heading show "Stackfall", a piece falls on a 10x20 board, and the next and hold boxes render.
- Given a falling piece, when the player presses Left/Right/Up/Down/Space/C, then the piece moves/rotates/soft-drops/hard-drops/holds as specified and the page does not scroll.
- Given a running game, when a piece is in play, then a translucent ghost outline shows where it would land.

## Spec Change Log

### 2026-11-21 — housekeeping
- Bag function `draw()` renamed `takeFromBag()` so it isn't mistaken for rendering (snake's `draw()` rendered).
- vm stub moved out of `test.mjs` into shared `harness.mjs`, also used by `test-snake.mjs`.
- Stale lines below marked superseded: kick list in the Auto Run Result summary and I/O matrix, and residual risks fixed by the earlier 2026-11-21 entry.

### 2026-11-21 — user-directed changes after follow-up review
- Deliverable renamed to `stackfall.html`; all paths in this spec, review logs included, updated to the new name.
- Kick order extended with up 1, up 2 (user approved breaking the x-1/x+1-only rule) so flat pieces resting on the floor can rotate; -2 is needed by the I piece.
- Lock delay: past the 15-restart cap, landing on a new lowest row earns one fresh, unrestartable 500ms (was: instant lock). Same-row re-landing still locks at once, so ledge stalling stays bounded.
- Key-repeat guard now tested; removed from `deferred`.

## Review Triage Log

### 2026-11-20 — Review pass
- verdicts: 34 findings — high 0, medium 2, low 22, false 10, maybe-false 0
- findings:
  - `[low]` `[reject]` Blind: vertical I flush on left wall cannot rotate (needs dx=+2) — intent explicitly limits kicks to x-1, x+1.
  - `[low]` `[reject]` Blind: no pause / pause on blur — feature not in intent; fix adds handlers; play continues as in any unpaused game.
  - `[false]` `[reject]` Blind: lock resets never refill on a new lower row — piece still gets its full 500ms after landing; nothing in intent requires refill.
  - `[low]` `[reject]` Blind: no restart mid-game — feature request, not a defect; reload restarts.
  - `[false]` `[reject]` Blind: no counter-clockwise rotate — intent defines controls as "up rotate" only.
  - `[low]` `[reject]` Blind: Ctrl+C / Shift chords trigger hold — rare while playing; fix adds a modifier guard.
  - `[low]` `[patch]` Blind: no accessibility on canvases/HUD — added role="img"+aria-label on board, aria-live HUD with #status game-over text, setText writes only on change.
  - `[false]` `[reject]` Blind: no touch support / too wide for phones — intent is keyboard-only.
  - `[low]` `[reject]` Blind: DOM writes every frame — negligible cost; incidentally removed by the setText patch.
  - `[low]` `[reject]` Blind: file not yet named stackfall.html — user's existing path; visible name is original; renaming moves the user's file.
  - `[low]` `[patch]` Blind: hard-drop test never checks landing row — test now asserts locked cells equal cur.m placed at ghostY(). (Other untested items in this finding: repeat filter deferred; dt cap/preview centering rejected as low.)
  - `[false]` `[reject]` Blind: no soft/hard drop scoring — intent specifies line-clear scoring only.
  - `[false]` `[reject]` Intent: lock delay restart rule (15 cap) is invented — "lock delay 500ms" is met (piece locks after 500ms resting); reset-on-move is the genre-standard meaning and stays bounded.
  - `[false]` `[reject]` Intent: filename/test header used the old name — same as filename row above; visible name is original.
  - `[low]` `[patch]` Intent: I #ff7a8a and S #f6a6c1 look alike — S changed to orange #ff9f43.
  - `[low]` `[patch]` Intent: soft drop has no test — grouped with verification-gap soft-drop row.
  - `[low]` `[reject]` Intent: scoring when a clear crosses a 10-line mark untested — code uses level before the clear, a defensible reading; test-only nicety.
  - `[false]` `[reject]` Intent: 7-bag checked via draw() not spawn order — spawnNext() takes from draw() directly; no other path.
  - `[false]` `[reject]` Intent: next preview / hold box / ghost drawing untested — covered by manual headless-Firefox screenshot per Verification section.
  - `[low]` `[patch]` Intent: hard-drop not shown to land at ghost row — grouped with Blind hard-drop row.
  - `[false]` `[reject]` Intent: test.mjs is a second file vs "single HTML file" — the game is one file; test is dev tooling.
  - `[low]` `[patch]` Intent: gravity speed-up only checked via interval() — grouped with verification-gap gravity row; step()-level test added.
  - `[medium]` `[patch]` Edge: re-landing after leaving a ledge starts an uncounted lock timer, bypassing MAX_LOCK_RESETS (infinite stall) — added per-piece `landed` flag; each re-landing consumes a restart, after cap it locks at once; new ledge test (fails on old logic).
  - `[medium]` `[patch]` Edge: resting branch zeroes dropAcc so on/off ledge never falls — same root cause as above; stall now bounded by the cap.
  - `[low]` `[patch]` Gap: gravity in step() never checked at level ≥2 — test at level 3: step(interval()-1) no move, step(1) moves one row.
  - `[low]` `[patch]` Gap: soft drop has no test — test asserts ArrowDown moves a fresh piece 1 row and leaves a resting piece.
  - `[low]` `[patch]` Gap: locked-cell colour value unpinned — test spawn(2); hardDrop(); all filled cells === 3.
  - `[low]` `[patch]` Gap: clockwise rotation unpinned — test T rotates to [[0,1,0],[0,1,1],[0,1,0]].
  - `[low]` `[patch]` Gap: restart doesn't assert score/lines/level reset — test sets non-zero values, presses R, asserts 0/0/1.
  - `[low]` `[defer]` Gap: key-repeat guard untested — filed disposition defer; recorded in frontmatter.
  - `[low]` `[reject]` Gap-other: 50ms gravity floor unpinned — negligible; only reachable at very high levels.
  - `[low]` `[reject]` Gap-other: 100ms frame-delta cap unpinned — needs real rAF to test; negligible.
  - `[false]` `[reject]` Gap-other: hold with empty slot / spawn x / ghost Y in render unpinned — behaviour correct on read; test-only gaps with no bad outcome shown.
  - `[low]` `[reject]` Gap-other: preventDefault during game over unpinned — code calls it before the game-over check (correct); test-only nicety.

### 2026-11-21 — Review pass
- verdicts: 37 findings — high 0, medium 0, low 26, false 11, maybe-false 0
- findings:
  - `[low]` `[reject]` Blind: flat T/J/L/S/Z resting on floor cannot rotate (no upward kick) — real, but intent fixes kicks to in place, x-1, x+1, else refused, and bans SRS tables; an upward kick is excluded by intent.
  - `[low]` `[reject]` Blind: vertical I flush on left wall cannot rotate (needs +2), right wall can — carried: intent explicitly limits kicks to x-1, x+1.
  - `[low]` `[reject]` Blind: rotating O (no visible change) returns true and consumes a lock reset — real but negligible: same bound as moving, cap still holds; fix adds a type branch.
  - `[false]` `[reject]` Blind: no soft/hard drop scoring — carried: intent specifies line-clear scoring only.
  - `[low]` `[reject]` Blind: no pause / pause on blur — carried: feature not in intent; fix adds handlers.
  - `[low]` `[reject]` Blind: Ctrl/Cmd+C and Shift chords trigger hold — carried: rare while playing; fix adds a modifier guard.
  - `[low]` `[reject]` Blind: file and test header not yet named stackfall — carried: user's existing path; visible name is original.
  - `[false]` `[reject]` Blind: no touch input, layout too wide for phones — carried: intent is keyboard-only and bans touch controls.
  - `[low]` `[reject]` Blind: canvases blurry on high-DPI screens (no devicePixelRatio scaling) — real cosmetic; fix adds scaling code to three canvases, not a direct correction.
  - `[low]` `[reject]` Blind: Hold/Next canvases have no text alternative — a static label would not say which piece; a useful one needs dynamic label code; HUD is the a11y surface already patched.
  - `[low]` `[defer]` Blind: key-repeat filtering untested — carried: already in frontmatter `deferred`; not deferred again.
  - `[low]` `[reject]` Blind: no test for rotating while resting flat on floor — behaviour (refusal) is intent-mandated, see first row.
  - `[false]` `[reject]` Blind: hold that spawns into a collision untested — hold() goes through spawn(), whose collide check sets gameOver; correct on read, no bad outcome shown.
  - `[low]` `[patch]` Blind: rotation resetting the lock timer untested — grouped with gap row "rotate lock restart"; test added.
  - `[false]` `[reject]` Blind: setText de-duplication untested — behaviour correct on read (compares textContent before writing); no bad outcome shown.
  - `[false]` `[reject]` Blind: bag function named draw() reads like render — no named harm; no caller confuses it.
  - `[false]` `[reject]` Blind: script-extraction regex breaks if the tag gets an attribute — no attribute exists; if added, test.mjs fails loudly on the null match, which is correct behaviour.
  - `[false]` `[reject]` Blind: nothing says how to run tests — spec Verification section documents `node test.mjs`; test.mjs header states its purpose.
  - `[low]` `[reject]` Edge: after all 15 resets, falling off a ledge and re-landing locks instantly with no slide time — real (step() sets lockTimer = LOCK_MS), but only after 15 resting moves in one piece, rare in everyday play; the suggested lowestY refill adds per-piece state and the intent's per-piece cap does not settle refill.
  - `[low]` `[reject]` Edge: O rotate succeeds and consumes a lock reset — grouped with Blind O row; same reason.
  - `[low]` `[reject]` Edge: Ctrl/Meta chords trigger hold/moves — carried: same as Blind modifier row.
  - `[low]` `[patch]` Gap: rotate-while-resting lock restart untested (deleting touched() in tryRotate passed) — added test: vertical T resting on floor, step(400), ArrowUp, assert flat T, step(400), assert not locked; mutation now caught.
  - `[low]` `[patch]` Gap: step() after game over untested (deleting the guard passed) — added in spawn-collision block: step(600) twice, assert same cur and same board; mutation caught 10/10 runs.
  - `[low]` `[patch]` Gap: preventDefault never checked negatively — added loop over KeyR, F5, Tab, KeyA asserting prevented stays 5; unconditional-preventDefault mutation now caught.
  - `[low]` `[patch]` Gap: bag shuffle order unchecked (disabling shuffle passed) — added: 20 bags drawn, assert more than one distinct order; no-shuffle mutation now caught.
  - `[false]` `[reject]` Gap: hold with empty slot not checked to take the previewed Next piece — carried: same claim as 2026-11-20 row "hold with empty slot ... unpinned"; code still calls spawnNext().
  - `[low]` `[defer]` Gap-other: key-repeat guard still untested — carried: already deferred; not deferred again.
  - `[low]` `[reject]` Intent: post-cap re-landing locks with 0ms, fitting neither "fresh 500ms" reading — grouped with Edge post-cap row; same reason.
  - `[low]` `[reject]` Intent: lock/gravity counted in game-step time with 100ms frame cap, slower than real time below 10fps — negligible; the cap exists so a backgrounded tab does not slam the piece down.
  - `[low]` `[reject]` Intent: vertical I lopsided between left and right wall — carried: same as Blind left-wall row.
  - `[low]` `[reject]` Intent: score uses level before the clear — carried: defensible reading.
  - `[low]` `[reject]` Intent: R restarts only during game over — carried: intent says "R restarts after game over".
  - `[low]` `[reject]` Intent: old filename vs no-trademark rule — carried: same as Blind filename row.
  - `[false]` `[reject]` Intent: ghost, previews, colours, real scroll, overlay only checked via stubs — carried: covered by manual headless-Firefox screenshot per Verification section.
  - `[false]` `[reject]` Intent: gravity test uses unreachable level=3 with lines=0; 50ms floor unchecked — interval() reads only level, so the state is equivalent to a reached level 3; 50ms floor carried as negligible.
  - `[false]` `[reject]` Intent: "hold twice" test presses C then ShiftLeft, not C twice — both codes route to the same hold() call in onKey; behaviour identical.
  - `[low]` `[reject]` Intent: frame()/requestAnimationFrame loop never runs in tests — carried: needs real rAF; negligible.

## Design Notes

Keep state in module-level `let`s and logic in small functions (`collide`, `tryRotate`, `step(dt)`, `lockPiece`, `clearLines`, `hold`) so `test.mjs` can call them directly in the vm context; rendering reads state only. `step(dt)` owns gravity and lock-delay timing so tests can advance time without real frames.

## Verification

**Commands:**
- `node test.mjs` -- expected: prints `all tests passed`, exit 0.

**Manual checks (if no CLI):**
- Open `stackfall.html` in Firefox: play a few pieces, clear a line, hold, observe ghost and game over.

## Auto Run Result

Status: done

**Summary:** Rewrote the game as `stackfall.html` ("Stackfall"), a single-file canvas block-stacking puzzle with original name and palette: 10x20 board, 7 pieces, 7-bag, move/rotate (kick in place, x-1, x+1; up 1, up 2 added 2026-11-21), soft/hard drop, level-based gravity (1000ms x 0.8^(level-1), floor 50ms), line scoring x level, 500ms lock delay with capped restarts, game over on spawn collision, next preview, hold (C/Shift), ghost, R restart. Added `test.mjs` node:vm self-check.

**Files changed:**
- `../../stackfall.html` -- full rewrite (old version was backed up to that session's scratchpad, since cleared).
- `../../test.mjs` -- new; asserts every I/O matrix row plus review-driven checks.

**Review findings:** 34 total. Patched: 2 medium (one root cause: lock-cap bypass by re-landing), 13 low (S colour, accessibility attributes, test gaps for gravity in step, soft drop, locked colour, clockwise rotate, restart reset, hard-drop landing row). Deferred: 1 low (key-repeat guard untested). Rejected: 8 low and 10 false, each with reason in the Review Triage Log above.

**Follow-up review recommended:** false — no high patched; the two medium findings share one root cause (one entry), fixed and pinned by a ledge test that fails on the old logic. Patched counts by entry verdict: high 0, medium 1, low 8.

**Verification:** `node test.mjs` -> `all tests passed`, exit 0 (after patches). Headless Firefox screenshot taken before patches showed title, board, ghost, hold/next boxes, HUD.

**Residual risks:** No real-keyboard play test; no new screenshot after colour/aria patches; key-repeat guard untested (deferred; since tested, see Spec Change Log).

### Follow-up review pass — 2026-11-21

Status: done

**Summary:** Follow-up review of the finished Stackfall build. No game code changed; four test gaps closed in `test.mjs`.

**Files changed:**
- `../../test.mjs` -- added: bag shuffle-order check, lock-restart-on-rotate check, frozen-state-after-game-over check, non-game keys not prevented check.

**Review findings:** 37 total (high 0, medium 0, low 26, false 11). Patched: 4 low entries (test gaps above; each verified to fail on its mutation of `stackfall.html`). Deferred: none new (key-repeat guard stays deferred from last pass). Rejected: floor rotation without upward kick (intent bans extra kicks), O rotate consuming a lock reset, high-DPI blur, Hold/Next text alternative, post-cap instant re-lock after a ledge fall, 100ms frame cap game-time drift, plus carried and false rows — reasons in the Review Triage Log entry of 2026-11-21.

**Follow-up review recommended:** false — follow-up pass patched no high. Patched counts by entry verdict: high 0, medium 0, low 4.

**Verification:** `node test.mjs` -> `all tests passed`, exit 0, 10 of 10 runs. Mutation check: removing touched() from tryRotate, the step() game-over guard, the GAME_KEYS filter, or the shuffle loop each makes `node test.mjs` fail (game-over mutation 10 of 10 runs).

**Residual risks:** ~~Flat pieces resting on the floor can't rotate. A piece that has used all 15 resets and then falls off a ledge locks the instant it lands.~~ Both superseded 2026-11-21 (up kicks; a new lowest row earns a fresh 500ms). Still no real-keyboard play test, and no new screenshot (stackfall.html unchanged this pass).
