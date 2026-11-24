---
title: 'Molebop: whack-the-mole arcade game'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_revision: 'aa17088d9fbcf0b181a4a3efb44711527dfd43eb'
review_loop_iteration: 0
followup_review_recommended: false
followup_pass: true
context: ['{project-root}/CLAUDE.md']
warnings: ['oversized']
deferred:
  - summary: >-
      docs/CODEBASE_MAP.md does not cover Molebop: it still says five games, has no molebop.html / test-molebop.mjs sections, and its test command and DOM-game notes leave Molebop out.
    evidence: |-
      Review pass 1 (blind-hunter, verification-gap). CODEBASE_MAP is an agent-context doc linked from CLAUDE.md, so the fix is deferred; a cartographer re-map refreshes it, as after Minefield.
    location: >-
      docs/CODEBASE_MAP.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The repo has no reflex/whack game. The user wants one in a single HTML file: a 3x3 field of holes, a mole up in a random hole for 700-1200 ms, +1 for a mole and -1 (floor 0) for an empty hole, a 30 s round with a visible countdown, faster spawns in the last 10 s, an end screen with score and a `localStorage` best, and a Start button. Stretch: a golden mole worth 5 and a bomb mole that ends the round.

**Approach:** Add `molebop.html` under the original name "Molebop" (the rules are the generic genre; no existing product's name or look), plus `test-molebop.mjs` driving it through `harness.mjs`. It is a DOM game with a clock, like `minefield.html`: nine `<button>` holes, `step(dt)` and a rAF loop run the timers, and `render()` runs from the loop only when what it shows changes.

## Boundaries & Constraints

**Always:** the repo's shared shape (one bare `<script>`, top-level `let` state, `reset()`, `step(dt)`, read-only `render()`, `onKey(e)` on `e.code`, `document.addEventListener` for input, rAF `frame` with dt capped at 100 ms). Phases `ready` → `playing` → `over`; Start (button, or Space/Enter while not playing) begins a fresh round from `ready` or `over`. Rules: up time `700 + rand*500` ms; a new pop every 800 ms (first one 500 ms after Start), every 450 ms once time left ≤ 10 s, into a random empty hole (skipped if none is empty), so several moles can be up at once. Kind per pop: golden 10%, bomb 10%, normal 80%. Hits: normal +1, golden +5, bomb ends the round at the current score; a hit empties the hole. Empty hole: -1, never below 0. Countdown shows `ceil(timeLeft/1000)`, 30 at start. Best = max(best, score), read and written in `localStorage` key `molebop-best` inside try/catch (blocked/junk storage → 0). Each hole has an `aria-label` (Hole N, empty / mole / golden mole / bomb); golden and bomb differ from a normal mole by a glyph, not only colour. Holes reuse one element each; `render()` writes only changed text/attributes.

**Never:** canvas, `setInterval`, audio, images, external assets, dependencies; input on holes outside `playing` (no penalty, no score); saving anything but the best score; difficulty levels, pause, combos or sound.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hit mole | playing, hole 4 has a normal mole | score +1, hole 4 empty | No error expected |
| Hit golden | hole has golden mole | score +5, hole empty | No error expected |
| Miss | playing, empty hole, score 0 | score stays 0 | floor at 0 |
| Hit bomb | hole has bomb, score 7 | phase `over`, reason bomb, score 7, best updated, holes cleared | No error expected |
| Time up | timeLeft reaches 0 | phase `over`, reason time, holes cleared, best saved | No error expected |
| Mole expires | up time elapses untouched | hole empties, no score change | No error expected |
| Full field | 9 holes up when a pop is due | pop skipped, timer restarts | No error expected |
| Input not playing | `ready`/`over`, tap a hole | nothing changes | ignored |
| Storage | `getItem` throws / returns junk | best 0, game still loads and plays | try/catch |

</intent-contract>

## Code Map

- `minefield.html` -- closest shape: DOM buttons + rAF clock; copy `setText`, `$`, change-only `render()`, `frame` with 100 ms cap and render-on-change, `pointerdown` + keyboard click (`e.detail === 0`) handling, page styling conventions (`.box` score boxes, header).
- `twofold.html:192-222` -- best-score pattern: `BEST_KEY`, try/catch load, save when beaten.
- `harness.mjs` -- `load(file, globals)`; pass `document`, `Math`, `localStorage`, `requestAnimationFrame` stubs through `globals`.
- `test-minefield.mjs:430-485` -- `makeDoc()` DOM stub (persistent ids, `createElement`, `appendChild`, attribute/text write counters) and `stubMath` for `Math.random`; reuse its approach.
- `test-twofold.mjs:455-480` -- `memStorage` / junk / throwing `localStorage` tests to mirror.
- `README.md`, `CLAUDE.md` -- game table, play links, test command, "Currently five" list: add Molebop.

## Tasks & Acceptance

**Execution:**
- `molebop.html` -- build the game per the contract: header (title, Score, Time, Best boxes), 3x3 `#field` of hole buttons with a mole child each (CSS slide-up transition), an overlay `#panel` with message text and `#start` button, `aria-live="polite"` `#status` for round-end text, hint line; keys: Space/Enter start, Digit1-9 whack holes in reading order, Numpad1-9 in numpad layout (Numpad7 = top-left); modified/repeat keys ignored -- the deliverable.
- `test-molebop.mjs` -- assert the I/O matrix, spawn timing (500 ms first pop, 800/450 ms intervals, switch at 10 s left), up-time bounds (rand 0 → 700 ms, rand→1 → <1200 ms), kind rolls, countdown text, render reuse/change-only writes, rAF cap, keys, storage cases, page constraints (one script, no canvas/setInterval/audio/src=) -- the repo's self-check.
- `README.md`, `CLAUDE.md` -- add Molebop to game lists, controls section, play link and test command -- keep docs in step.

**Acceptance Criteria:**
- Given the page opens, when nothing is pressed, then a `ready` panel with a Start button shows, Time reads 30, Score 0, Best the saved best, and no mole is up.
- Given a round is playing, when 30 s of `step` time pass, then the end panel shows the final score and best, and Start begins a new round with score 0 and Time 30.
- Given time left is 10 s or less, when moles pop, then pops come every 450 ms instead of 800 ms.
- Given a best of 12 in storage, when a round ends at 15, then storage holds 15 and Best shows 15; ending at 9 leaves 12.

## Spec Change Log

- 2026-11-24 — user decision after review: Start, Space, Enter and NumpadEnter are ignored for 500 ms after a round ends (`LOCK`), so a mashed key cannot skip the end screen. Start still begins a round from `over` once the lock has passed. Press scoring and several moles at once are kept (user confirmed). The intent contract above is unchanged; this entry is the amendment.

## Review Triage Log

### 2026-11-24 — Review pass
- verdicts: 23 findings — high 0, medium 1, low 15, false 3, maybe-false 4
- findings:
  - `[low]` `[defer]` CODEBASE_MAP.md not updated for Molebop (blind-hunter) — agent-context doc; deferred to a cartographer re-map.
  - `[low]` `[patch]` README has no browser-compat line, though holes rely on `aspect-ratio` (blind-hunter) — patched: README line naming `inert`, `aspect-ratio`, `inset`, `min()`/`clamp()`, `?.`, binding-less `catch`.
  - `[medium]` `[patch]` Holes focusable and announced outside a round; Tab walks 9 dead holes before Start (blind-hunter) — patched: `render()` sets `fieldEl.inert = phase !== 'playing'` (change-only); tested in ready/over/playing.
  - `[low]` `[patch]` `aria-label` on `#field` ignored without a role (blind-hunter) — patched: `role="group"`.
  - `[low]` `[reject]` Speed-up starts at the first pop after the 10 s mark (9.5 s left), not exactly at 10 s; test mirrors the formula (blind-hunter) — real but a ≤350 ms shift nobody feels; the fix adds a clamp branch.
  - `[low]` `[reject]` No hit/miss feedback; a tap on a mole sliding down costs −1 (blind-hunter) — feedback is a feature not asked for; the slide is 120 ms; a grace state adds complexity.
  - `[low]` `[reject]` Space mid-round not prevented, may scroll a short window (blind-hunter) — rare (content fits most windows); the fix needs a focus-aware branch so Space on a focused hole still whacks.
  - `[low]` `[reject]` Stored best of 'Infinity', negative or fractional shown as-is (blind-hunter) — only reachable by hand-editing storage; the fix adds guards; same as Twofold.
  - `[low]` `[patch]` Test gaps: NumpadEnter start, Start click from `over`, non-hole targets, reused `g` in kind-roll tests (blind-hunter) — patched the first two (grouped with the NumpadEnter gap below); non-hole targets and the reused `g` are harmless, since `pop()` is a pure helper.
  - `[false]` `[reject]` Key `molebop-best` breaks Twofold's `twofoldBest` naming (blind-hunter) — the key is set by the spec (fix would edit the spec), and Snake already uses its own name; no harm.
  - `[low]` `[patch]` Held Enter/Space on a focused hole fires repeated native keyboard clicks that whack it again and again (edge-case) — patched: onKey calls `preventDefault()` on repeat Space/Enter/NumpadEnter before returning; tested.
  - `[low]` `[patch]` Held Enter from `over` starts a round, then its repeats click the focused hole (edge-case) — same root cause as above; same patch, plus `inert` drops hole focus outside play.
  - `[low]` `[reject]` Stored best Infinity/negative/fractional (edge-case) — same as the blind-hunter row: hand-edited storage only.
  - `[low]` `[reject]` Two tabs: a stale lower best can overwrite a higher one (edge-case) — needs two tabs playing at once; the fix adds a re-read guard.
  - `[low]` `[patch]` Claim "modified/repeat keys ignored" vs native button clicks (edge-case) — the repeat part is fixed by the repeat patch; Shift+Enter on a focused Start starting a round is harmless.
  - `[low]` `[patch]` NumpadEnter start path untested (verification-gap) — patched: test that NumpadEnter starts a round and is prevented once.
  - `[false]` `[reject]` Mole taps rely on `.mole { pointer-events: none }`; tests pass the hole as target (verification-gap) — the CSS is there, so taps land on the hole button; a regression-only risk, not a defect.
  - `[low]` `[defer]` CODEBASE_MAP.md stale (verification-gap) — same as the first row; deferred.
  - `[false]` `[reject]` Named Molebop, not Whack-a-mole (intent-alignment) — deliberate: repo rule against recreating a product's name; the rules are the generic genre.
  - `[maybe-false]` `[reject]` Several moles up at once vs one at a time (intent-alignment) — "spawn rate speeds up" implies a spawn clock apart from mole lifetime; with one mole at a time a faster spawn rate would barely show. Settled only by asking the user; if wrong, low.
  - `[maybe-false]` `[reject]` A click on a mole still visibly sliding down scores −1 (intent-alignment) — same as the feedback row; would only be low.
  - `[maybe-false]` `[reject]` Scores on press, not on click (intent-alignment) — deliberate for a reflex game; a click still lands as one whack. Would only be low.
  - `[maybe-false]` `[reject]` Tests run on a stub DOM, not a real browser (intent-alignment) — partly settled: headless Chrome screenshots of the ready panel and a mid-round field (mole, ★ golden, ✸ bomb) render as intended; real taps and reload persistence not exercised. Would be low.

### 2026-11-24 — Review pass (follow-up)
- verdicts: 31 findings — high 0, medium 0, low 20, false 7, maybe-false 4
- findings:
  - `[low]` `[reject]` Visible mole time vs state time: a press while a mole slides down scores −1 (intent-alignment) — carried: same row as pass 1; a 120 ms window, no feedback state wanted.
  - `[low]` `[reject]` 10 s boundary: the gap is picked at the previous pop, and the test mirrors the formula (intent-alignment) — carried: same row as pass 1; a shift of at most 350 ms nobody feels.
  - `[false]` `[reject]` Taps rely on `.mole { pointer-events: none }`; tests pass the hole as target (intent-alignment) — carried: same row as pass 1; the CSS line is there.
  - `[false]` `[reject]` `inert` is asserted only as a stub boolean (intent-alignment) — what `inert` does is a platform guarantee; the code sets it and the test asserts it in all three phases.
  - `[false]` `[reject]` Overlay visibility depends on `#panel[hidden] { display: none }` beating `display: flex` (intent-alignment) — the rule is in molebop.html, and the pass-1 headless-Chrome screenshots show the panel hidden mid-round.
  - `[maybe-false]` `[reject]` Real `localStorage` and reload persistence are simulated with a plain-object store (intent-alignment) — settled only by a real browser reload; the standard API is used in try/catch like Twofold; would only be low.
  - `[low]` `[patch]` Hidden tab stalls rAF, so the round freezes though the docs say no pause (intent-alignment) — patched: README says there is no pause button but the round waits while the tab is hidden. Same root cause as the blind-hunter background-tab row.
  - `[maybe-false]` `[reject]` Scores on press, not click (intent-alignment) — carried: same row as pass 1; deliberate for a reflex game; would only be low.
  - `[false]` `[reject]` Digit/Numpad keys, README, CLAUDE.md and spec go beyond the intent's literal text (intent-alignment) — the contract's Tasks list the keys and the docs; none conflicts with the intent.
  - `[low]` `[defer]` docs/CODEBASE_MAP.md stale (intent-alignment) — carried: already in `deferred`.
  - `[maybe-false]` `[reject]` Player-surface evidence is only prose about headless screenshots (intent-alignment) — a browser tap run would settle it; the screenshots were taken and read; would only be low.
  - `[maybe-false]` `[reject]` Several moles up at once vs one at a time (intent-alignment) — carried: same row as pass 1; "spawn rate" implies a spawn clock apart from mole lifetime.
  - `[low]` `[patch]` Numpad2/4/6/8 have no assertion: swapping their table entries stays green (verification-gap) — patched: the key loop now presses all nine numpad keys; swapped entries now fail.
  - `[low]` `[patch]` Pop timer carry-over `popIn += …` is not pinned (verification-gap) — patched: test of `popIn = 10; step(16)` → 794 and the fast-phase 444; mutating `+=` to `=` now fails. The reviewer proposed defer; the fix is one test, so it was patched.
  - `[low]` `[defer]` CODEBASE_MAP.md lacks Molebop (verification-gap) — carried: already in `deferred`.
  - `[low]` `[reject]` No lockout after the round ends: Start or Space/Enter restarts at once, so a mashing player can skip the end screen (edge-case) — unlikely in everyday use: Start covers about 2% of the field and only whacks on holes or keys 1-9 are mashed; the contract says Start begins a round from `over` with no delay; a lockout adds state and a rule the contract does not have. A design option for the user.
  - `[low]` `[reject]` Round end drops focus to body, because the field becomes inert (edge-case) — one Tab reaches Start, Space/Enter restarts from anywhere, and `#status` announces the result; the fix adds a phase-change branch.
  - `[low]` `[patch]` Modified Enter/Space on a focused hole still whacks through the click listener (edge-case) — carried: same claim as the pass-1 "modified/repeat keys ignored" row; the repeat part was patched then; a Ctrl+Enter whack is harmless.
  - `[low]` `[reject]` AC "time left ≤ 10 s → pops every 450 ms" vs the gap chosen at the previous pop (edge-case) — carried: same row as pass 1.
  - `[low]` `[patch]` README says "about 2022", but `inert` reached Firefox only in 112 (blind-hunter) — patched: README says "about 2023 or later" and that an older browser only also tabs through the empty holes.
  - `[low]` `[defer]` CODEBASE_MAP.md contradicts CLAUDE.md's "six games" (blind-hunter) — carried: already in `deferred`.
  - `[false]` `[reject]` Time-up render path untested, and dropping `phase` from `shown()` would hide the end panel (blind-hunter) — `end()` sets `timeLeft` to 0 and clears holes, so `Math.ceil(timeLeft / 1000)` always changes on the ending frame and `frame` renders; the verification-gap layer mutated this and found no gap.
  - `[low]` `[reject]` No input lockout after round end (blind-hunter) — same root cause as the edge-case lockout row; same refusal.
  - `[low]` `[patch]` Hidden tab acts as a free pause (blind-hunter) — patched: same README fix as the intent-alignment row.
  - `[low]` `[reject]` Screen-reader users get no play-time announcements; Score/Time are not live regions (blind-hunter) — the contract asks only for per-hole labels and an `aria-live` round-end status; live updates for every pop would be noise.
  - `[low]` `[reject]` Focus is not moved to Start when the end panel appears (blind-hunter) — same root cause and refusal as the edge-case focus row.
  - `[low]` `[reject]` `#message` and `#status` both show the end text (blind-hunter) — harmless duplicate; `#status` must hold real text for `aria-live`, and hiding it adds a CSS rule.
  - `[false]` `[reject]` `pointer-events: none` on `.mole` is not pinned (blind-hunter) — carried: same row as pass 1.
  - `[false]` `[reject]` Spec status in-review vs `Status: done`, and the patches were never re-reviewed (blind-hunter) — this pass is that re-review; the status is set at Finalize; the fix would edit this build's spec.
  - `[low]` `[patch]` README states "every 450 ms once 10 seconds or less are left", but the gap is chosen at the previous pop (blind-hunter) — patched: README now says "800 ms after each pop, or 450 ms after a pop made with 10 seconds or less left"; code unchanged.
  - `[low]` `[reject]` Rules legend vanishes during play; the end button still says Start (blind-hunter) — polish the contract does not ask for; the ready panel states the rules and the contract names a Start button.

### 2026-11-24 — Review pass (follow-up 3)
- verdicts: 44 findings — high 0, medium 3, low 30, false 9, maybe-false 2
- findings:
  - `[low]` `[defer]` carried: CODEBASE_MAP.md still says five games and has no Molebop rows (blind-hunter) — same row as passes 1–2; already in `deferred`, no new item.
  - `[false]` `[reject]` carried: spec status `in-review` vs `Status: done` text and counters (blind-hunter) — pass-2 status row; the fix edits this build's spec.
  - `[low]` `[reject]` carried: AC says pops come every 450 ms, but the gap is set at the previous pop (blind-hunter) — 10 s rows; the fix edits spec wording. Group with the speed-up rows (26, 28, 40).
  - `[low]` `[patch]` carried: hidden tab freezes the round, not in the contract (blind-hunter) — applied in pass 2 (README). Not patched again; the proposed spec Boundaries edit is rejected as a spec edit.
  - `[low]` `[reject]` open decisions (several moles, lockout, press scoring) are not listed as open and no question was asked (blind-hunter) — the fix edits the spec, and step-04 allows no human interaction; the decisions go to the user in the final report.
  - `[low]` `[reject]` spec is oversized, repeats its decisions and cites line numbers (blind-hunter) — the fix edits this build's spec.
  - `[medium]` `[patch]` header is a no-wrap row: at 360 px wide the Best box runs off the edge and the page scrolls sideways (blind-hunter) — verified by headless screenshot at 360×640 before the fix. Patched: `flex-wrap: wrap` on `header`; screenshot after: Best on its own row, no sideways or vertical scroll. Group with 23.
  - `[low]` `[reject]` field sized by width only, so landscape or very short screens scroll; a drag that starts on a hole whacks at press (blind-hunter) — portrait 360×640 fits with no scroll, so this needs landscape or a short screen; the fix needs press-slop state, which adds a guard. Group with 22, 42.
  - `[low]` `[reject]` a double-tap in the 120 ms slide after a hit costs −1 (blind-hunter) — carried from the slide-window rows; group with 38.
  - `[false]` `[reject]` Shift+digit is dropped, so AZERTY cannot whack with the digit row (blind-hunter) — `onKey` reads the physical `e.code`, so the digit row works on AZERTY without Shift; the Shift guard is the spec's modified-key rule.
  - `[low]` `[reject]` carried: end line shown twice, in `#message` and `#status` (blind-hunter) — pass-2 row; harmless, and `#status` must keep its text for the live region.
  - `[low]` `[reject]` Best box stays stale during a round that beats it; the end line has no "New best" label (blind-hunter) — contract does not require a live Best, the end line shows the correct best, and the label adds a branch.
  - `[low]` `[reject]` carried: a miss on an empty hole gives no feedback on the field (blind-hunter) — pass-1 feedback row; a flash adds state.
  - `[low]` `[reject]` legend omits the plain mole's +1; hint says "click a mole" for a hole (blind-hunter) — cosmetic; the legend lists the special kinds and the first hit shows +1.
  - `[low]` `[patch]` the 100 ms frame cap runs the round slow below 10 fps, undocumented (blind-hunter) — patched: shortcut comment above the cap line, as the ponytail rule asks; no behaviour change.
  - `[low]` `[patch]` clause `!want.includes(20400)` can never fail, since 20400 is on neither schedule (blind-hunter) — patched: clause deleted, nothing else changed.
  - `[low]` `[patch]` hits comment says a click was already whacked on pointerdown; no check that press plus click whacks once (blind-hunter) — patched: comment corrected; added a check that a left press then a detail-1 click on a mole scores +1, once.
  - `[low]` `[reject]` the spec's headless-screenshot claim has no artifact in the repo (blind-hunter) — the fix edits this build's spec; the residual risk is disclosed. Group with 44.
  - `[low]` `[reject]` carried: stored best of Infinity, a negative or a fraction is shown as-is (edge-case) — pass-1 and pass-2 rows; hand-edited storage only.
  - `[low]` `[reject]` Space during a round may scroll a short window (edge-case) — carried from the pass-1 row; needs a focus branch.
  - `[low]` `[reject]` Ctrl/Alt/Meta/Shift with Enter or Space on a focused hole or Start still reaches the native click (edge-case) — unlikely in everyday play; the fix is a modifier guard in the click listener. Pass 2 logged this row as patch without sending a fix; re-judged here. Group with 30.
  - `[low]` `[reject]` a touch that starts on a hole and pans still whacks at press (edge-case) — group with 8.
  - `[medium]` `[patch]` header overflow at narrow width (edge-case) — group with 7; patched with it.
  - `[low]` `[reject]` carried: focus drops to body when the round ends, because the field goes inert (edge-case) — pass-2 focus row; one Tab reaches Start.
  - `[low]` `[reject]` carried: two tabs, a stale in-memory best overwrites a higher stored best (edge-case) — pass-2 row; needs two tabs.
  - `[low]` `[reject]` carried: first fast-phase pop can come up to 350 ms late (edge-case) — 10 s rows; group with 3.
  - `[low]` `[reject]` carried: release on Start after a round ends under the finger restarts at once (edge-case) — pass-2 no-lockout row. Click goes to the nearest common ancestor when down and up targets differ, so the stated path is unlikely; the mashing case is the lockout row.
  - `[low]` `[reject]` carried: AC's "every 450 ms" does not hold for the first fast gap (edge-case) — 10 s rows; group with 3.
  - `[low]` `[reject]` carried: test pins the 9.5 s switch by copying the code's formula (edge-case) — pass-1 row; group with 26.
  - `[low]` `[reject]` "modified keys ignored" is not true of native clicks (edge-case) — same as 21; group.
  - `[medium]` `[patch]` removing the `Math.max(0, …)` clamp leaves the suite green; a round that overshoots 0 never ends (verification-gap, pre-verified) — patched: two checks after the time-up block (a step past 0; a 60 fps loop). Scratch mutant: the clamp check fails.
  - `[false]` `[reject]` `#panel[hidden]` rule untested; removing it covers the field mid-round (verification-gap) — carried from the pass-2 overlay row; the rule is in the code. Browser probe: removal covers the field; no browser runner in repo. Group with 35.
  - `[false]` `[reject]` `.up .mole` and `.mole` pointer-events untested; removing either breaks play (verification-gap) — both rules are in the code; pointer-events carried from the pass-1 row. Group with 33.
  - `[low]` `[patch]` ready-phase `idle` check cannot fail, because the 0 score floor hides a whack (verification-gap) — patched: assertion right after the first press that the mole is still up. Scratch mutant: the whack-guard removal fails at the new check.
  - `[false]` `[reject]` the panel overlay rule is untested, stub boolean only (intent-alignment) — same as 32.
  - `[false]` `[reject]` `.up .mole` removal would hide moles and no test sees it (intent-alignment) — same as 33.
  - `[false]` `[reject]` `pointer-events` removal would swallow taps on the mole, and no test sees it (intent-alignment) — carried from the pass-1 row; same as 33.
  - `[low]` `[reject]` a press during the slide-down scores −1 (intent-alignment) — carried from the pass-2 slide row; group with 9.
  - `[false]` `[reject]` `inert` checked only as a stub boolean; Tab order untested (intent-alignment) — carried from the pass-2 inert row; the code sets it and the platform applies it.
  - `[low]` `[reject]` the 800 ms gap that straddles the 10 s mark is not 450 ms (intent-alignment) — carried; group with 26.
  - `[maybe-false]` `[reject]` the ★ and ✸ glyphs may not render on some devices (intent-alignment) — if true, golden and bomb still differ by colour and label, so this would only be low. The headless screenshot renders both.
  - `[low]` `[reject]` touch whack at press on a pan start (intent-alignment) — group with 8.
  - `[false]` `[reject]` keyboard whacks rely on the native click, never observed in a browser (intent-alignment) — Enter and Space on a focused button both fire click with detail 0; the click listener handles detail 0.
  - `[maybe-false]` `[reject]` carried: player-facing evidence is prose; real taps, animation and reload not checked (intent-alignment) — pass-2 row; the fix edits this build's spec, and the residual is disclosed in Auto Run Result. Group with 18.

## Verification

**Commands:**
- `node test-molebop.mjs` -- expected: prints `all molebop tests passed`, exit 0.
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs` -- expected: all pass.

**Manual checks (if no CLI):**
- Open `molebop.html`: moles slide up/down, golden ★ and bomb ✸ are distinct, countdown ticks, end panel shows score and best.

## Auto Run Result

Status: done

**Summary:** Added Molebop, an original 30 s whack-the-mole game: a 3x3 field of `<button>` holes with CSS-sliding moles, a rAF clock, pops every 800 ms (450 ms in the last 10 s) that stay up for 700-1200 ms, +1 / +5 golden / bomb ends the round, −1 for an empty hole (floor 0), Start/end panel and a `localStorage` best. Keys 1-9 and numpad whack holes; Space/Enter start.

**Files changed:**
- `molebop.html` -- the game.
- `test-molebop.mjs` -- node:vm self-check for every rule and edge case in the spec.
- `README.md` -- Molebop row, play link, controls section, browser-compat line, test command.
- `CLAUDE.md` -- six games, Molebop in the stack and DOM-with-clock notes, test command.
- `_bmad-output/implementation-artifacts/spec-molebop-whack-game.md` -- this spec.

**Review findings:** 23 total. Patched 8 rows in 5 fixes (1 medium: holes `inert` outside play; low: `role="group"`, repeat Space/Enter prevented, NumpadEnter and Start-from-over tests, README compat line). Deferred 2 rows (CODEBASE_MAP refresh). Rejected 13: speed-up 350 ms late (unfelt, adds a branch); no hit feedback / sliding-mole −1 (not asked, 120 ms window); Space scroll mid-round (rare, needs focus branch); unchecked stored best ×2 (hand-edited storage only); two-tab stale best (rare, adds guard); key naming (set by spec); pointer-events reliance (works, regression-only); name Molebop (repo rule); several moles at once (fits "spawn rate"); press vs click (deliberate); stub-DOM tests (headless screenshots render correctly).

**Follow-up review recommendation:** false — patched by verdict: high 0, medium 1, low 7 (rows; 4 low fixes).

**Verification:** `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs` -- all pass. Headless Chrome screenshots: ready panel with Start, and a mid-round field showing a mole, a ★ golden mole and a ✸ bomb, render as intended.

**Residual risks:** Real taps, the slide animation and reload persistence were not exercised in a browser. docs/CODEBASE_MAP.md does not cover Molebop yet (deferred).

### Follow-up pass (2026-11-24)

Status: done

**Summary:** A second review pass over the whole branch diff since the baseline found no high or medium problems. 6 rows were patched in 5 small fixes (a seventh patch row is carried from pass 1, so not applied again): the Molebop README text (browser line "about 2023", pause wording, pop schedule) and two tests (all nine numpad keys; the pop-timer overshoot). `molebop.html` was not changed.

**Review findings:** 31 total. Patched 6 rows (all low) plus 1 carried patch row. Deferred 3 rows (all CODEBASE_MAP, already in `deferred`). Rejected 21: carried pass-1 rejects (slide-down −1, 10 s boundary, pointer-events, press vs click, several moles, the modified-key claim, the AC wording); no restart lockout and no focus move after the round (unlikely, adds state, and the contract says Start works at once from the end screen); no live regions during play; the duplicate end text; the legend and button wording; stored-best and stub-DOM caveats; spec status (resolved at Finalize).

**Follow-up review recommendation:** false — this pass patched no high and no medium.

**Verification:** all six test suites pass. The new popIn test fails against a build with `popIn += …` changed to `popIn = …`; the new numpad assertions fail with swapped table entries.

**Residual risks:** Real browser taps, the slide animation and `localStorage` reload persistence are still unchecked. A round-end lockout is a design choice left to the user. docs/CODEBASE_MAP.md still lacks Molebop.

### Follow-up pass 3 (2026-11-24)

Status: done

**Summary:** Third review pass over the branch diff since the baseline. 44 findings, no high. Patched 7 rows (3 medium: header overflow at 360 px, round-end clamp not pinned; 4 low: frame-cap comment, vacuous test clause, a wrong comment with a missing press-then-click check, ready-phase whack check). `molebop.html` changed only by `flex-wrap: wrap` on `header` and one comment line.

**Files changed (this pass):**
- `molebop.html` -- `flex-wrap: wrap` on `header`; shortcut comment above the frame cap.
- `test-molebop.mjs` -- deleted the vacuous `20400` clause; corrected the hits comment and added a press-then-click check; added the round-end clamp checks; added a mole-still-up check in `idle`.
- `_bmad-output/implementation-artifacts/spec-molebop-whack-game.md` -- this spec.

**Review findings:** 44 total (blind-hunter 18, edge-case 12, verification-gap 4, intent-alignment 10). Patched 7 rows (medium 3, low 4); row 4 carried from pass 2 (no new action). Deferred: none new (row 1 carried). Rejected 35: spec edits (rows 2, 3, 5, 6, 18, 44); carried from earlier passes (3, 9, 11, 13, 19, 20, 24–30, 32, 33, 35–40, 42, 43); polish or no reachable defect (8, 12, 14, 21, 22, 41); AZERTY claim false (10). Full reasons are in the triage log above.

**Follow-up review recommendation:** false. No high patched; medium patched 3 (header, clamp), low patched 4.

**Verification performed:**
- `node test-gapwing.mjs && node test-snake.mjs && node test-stackfall.mjs && node test-twofold.mjs && node test-minefield.mjs && node test-molebop.mjs` -- all pass.
- Scratch mutant, clamp removed: the new round-end check fails.
- Scratch mutant, whack phase guard removed: the new ready-phase `idle` check fails.
- Headless Chrome, 360×640: header before the fix has Best clipped and a sideways scrollbar; after the fix Best wraps to its own row with no scroll.

**Residual risks:**
- No browser runner in the repo. CSS rules (panel hide, mole rise, pointer-events) are checked only by reading and one-off headless probes, so a CSS regression would not fail the suite.
- Real taps, the slide animation and reload persistence are not exercised in a browser.
- Open design choices for the user, not patched: no input lockout at round end; scoring on press; several moles at once.
- `docs/CODEBASE_MAP.md` still lacks Molebop (deferred).

**Post-review change (2026-11-24):** 500 ms end-of-round input lock, a user decision; see Spec Change Log.
