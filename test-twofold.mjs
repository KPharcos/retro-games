// Self-check for twofold.html: runs its <script> in node:vm with a stub DOM and asserts the rules in spec-twofold-merge-puzzle.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./twofold.html', import.meta.url), 'utf8');

// Page: one bare <script>, DOM grid (no canvas, rAF or setInterval), grid role + label, aria-live status, own name
assert.equal(html.match(/<script/g).length, 1);
for (const banned of ['setInterval', '<canvas', 'requestAnimationFrame', '<audio', 'src=', 'href=']) assert.ok(!html.includes(banned), banned);
assert.match(html, /<title>Twofold<\/title>/);
assert.match(html, /id="board" role="grid" aria-label="[^"]+"/);
assert.match(html, /id="status" aria-live="polite"/);
assert.match(html, /\.tile \{[^}]*transition: transform/);

// DOM stub: one persistent element per id (every id must exist in the markup), created tiles tracked as children
function makeDoc() {
  const els = {}, listeners = {}, writes = {}, focused = { el: null };
  const node = (id) => {
    let text = '', hidden = false;
    if (id) writes[id] = 0;
    return {
      id, style: {}, className: '', disabled: false, children: [], parent: null,
      get hidden() { return hidden; },
      set hidden(v) { hidden = v; if (v && focused.el === this) focused.el = null; }, // as in Chrome 157: hiding the focused control drops focus to <body>
      get textContent() { return text; },
      set textContent(v) { text = String(v); if (id) writes[id]++; },
      appendChild(c) { this.children.push(c); c.parent = this; return c; },
      focus() { assert.equal(this.hidden, false, 'focus() on a hidden element'); focused.el = this; },
      remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; },
    };
  };
  const document = {
    getElementById: (id) => {
      assert.ok(html.includes(`id="${id}"`), `no element with id="${id}"`);
      return (els[id] ??= node(id));
    },
    createElement: () => node(),
    get activeElement() { return focused.el; },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  return { document, els, listeners, writes, focused };
}

// pointer targets: closest() answers like the real DOM for '.wrap' (board area) and 'button'
const target = (wrap, button) => ({ closest: (s) => ((s === '.wrap' ? wrap : s === 'button' ? button : false) ? {} : null) });
const onBoard = target(true, false), onUndoButton = target(false, true), onContinue = target(true, true), outside = target(false, false);

let rnd = 0;
const stubMath = Object.assign(Object.create(Math), { random: () => rnd }); // spread would be empty: Math's props are non-enumerable
const memStorage = (s) => ({ getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = String(v); } });

function game(globals = {}) {
  const d = makeDoc();
  const g = load('./twofold.html', { document: d.document, Math: stubMath, ...globals });
  const json = (expr) => JSON.parse(g.run(`JSON.stringify(${expr})`)); // arrays cross the vm boundary badly
  // put a board in place with fresh tile ids, as if it came from play
  const setBoard = (b) => g.run(`board = ${JSON.stringify(b)}; ids = board.map(r => r.map(v => v ? ++nextId : 0));
    ghosts = []; score = 0; over = won = keepPlaying = undone = false; prev = null; render()`);
  let prevented = 0;
  const key = (code, repeat = false) => d.listeners.keydown({ code, repeat, preventDefault: () => prevented++ });
  const down = (opts = {}) => d.listeners.pointerdown({ button: 0, isPrimary: true, pointerId: 1, target: onBoard, clientX: 100, clientY: 100, ...opts });
  const up = (dx, dy, pointerId = 1) => d.listeners.pointerup({ pointerId, clientX: 100 + dx, clientY: 100 + dy });
  const swipe = (dx, dy, opts = {}) => { down(opts); up(dx, dy, opts.pointerId); };
  const click = (id) => { assert.ok(html.includes(`<button id="${id}"`), id); d.listeners.click({ target: { id } }); };
  const tiles = () => d.els.board.children;
  return { ...g, ...d, json, setBoard, key, down, up, swipe, click, tiles, prevented: () => prevented };
}

const g = game();
const { run, json } = g;

// ---- pure functions ----
assert.deepEqual(json('emptyBoard()'), [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
// one row/column through every direction; rows other than the one under test stay empty
const rowCase = (line, dir) => {
  const b = json('emptyBoard()');
  if (dir === 'left' || dir === 'right') b[0] = line; else line.forEach((v, i) => { b[i][0] = v; });
  const r = json(`slide(${JSON.stringify(b)}, '${dir}')`);
  const out = dir === 'left' || dir === 'right' ? r.board[0] : r.board.map(row => row[0]);
  return { out, gained: r.gained, moved: r.moved };
};
for (const [line, dir, out, gained] of [
  [[2, 0, 0, 2], 'left', [4, 0, 0, 0], 4],
  [[2, 2, 4, 0], 'left', [4, 4, 0, 0], 4], // no double merge
  [[2, 2, 2, 0], 'left', [4, 2, 0, 0], 4], // three equal: pair nearest the move direction
  [[2, 2, 2, 0], 'right', [0, 0, 2, 4], 4],
  [[2, 2, 2, 2], 'left', [4, 4, 0, 0], 8],
  [[2, 2, 2, 2], 'right', [0, 0, 4, 4], 8],
  [[0, 4, 0, 8], 'left', [4, 8, 0, 0], 0],
  [[4, 4, 8, 8], 'right', [0, 0, 8, 16], 24],
  [[2, 0, 0, 2], 'up', [4, 0, 0, 0], 4],
  [[2, 2, 2, 0], 'down', [0, 0, 2, 4], 4],
  [[0, 0, 4, 4], 'up', [8, 0, 0, 0], 8],
]) assert.deepEqual(rowCase(line, dir), { out, gained, moved: true }, `${line} ${dir}`);
// no change: moved false, nothing gained
assert.deepEqual(rowCase([2, 4, 0, 0], 'left'), { out: [2, 4, 0, 0], gained: 0, moved: false });
assert.deepEqual(rowCase([0, 0, 2, 4], 'down'), { out: [0, 0, 2, 4], gained: 0, moved: false });
// result shape is exactly { board, gained, moved }
assert.deepEqual(Object.keys(json("slide(emptyBoard(), 'left')")).sort(), ['board', 'gained', 'moved']);

// purity: inputs untouched, a new board returned
const sample = [[2, 2, 0, 4], [0, 4, 4, 0], [8, 0, 8, 2], [2, 0, 0, 0]];
for (const dir of ['left', 'right', 'up', 'down']) {
  assert.deepEqual(json(`(() => { const b = ${JSON.stringify(sample)}; const r = slide(b, '${dir}'); return [b, r.board !== b]; })()`), [sample, true], dir);
}
assert.deepEqual(json(`(() => { const b = ${JSON.stringify(sample)}; const n = addTile(b, () => 0); return [b, n !== b]; })()`), [sample, true]);

// addTile: first draw picks a uniform empty cell, second draw the value (< 0.9 -> 2, >= 0.9 -> 4)
const seq = (...xs) => `(() => { const xs = [${xs}]; return () => xs.shift(); })()`;
assert.deepEqual(json(`addTile(${JSON.stringify(sample)}, ${seq(0, 0.89)})`)[0], [2, 2, 2, 4]); // first empty cell
assert.deepEqual(json(`addTile(${JSON.stringify(sample)}, ${seq(0.999, 0.9)})`)[3], [2, 0, 0, 4]); // last empty cell
assert.deepEqual(json(`addTile(emptyBoard(), ${seq(0, 0.9)})`)[0][0], 4);
const full = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
assert.deepEqual(json(`addTile(${JSON.stringify(full)}, () => 0)`), full); // full board: unchanged

// canMove / hasTile
assert.equal(run(`canMove(${JSON.stringify(full)})`), false);
assert.equal(run(`canMove(${JSON.stringify([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 4]])})`), true); // equal neighbours
assert.equal(run(`canMove(${JSON.stringify(sample)})`), true);
// each board has exactly one legal slide, and canMove sees it
const DIR4 = ['left', 'right', 'up', 'down'];
for (const [dir, b] of [
  ['left', [[0, 0, 2, 4], [0, 0, 4, 2], [0, 0, 8, 16], [0, 0, 32, 64]]],
  ['right', [[4, 2, 0, 0], [2, 4, 0, 0], [16, 8, 0, 0], [64, 32, 0, 0]]],
  ['up', [[0, 0, 0, 0], [0, 0, 0, 0], [2, 4, 8, 32], [4, 2, 16, 64]]],
  ['down', [[2, 4, 8, 32], [4, 2, 16, 64], [0, 0, 0, 0], [0, 0, 0, 0]]],
]) {
  assert.deepEqual(DIR4.map(d => run(`slide(${JSON.stringify(b)}, '${d}').moved`)), DIR4.map(d => d === dir), dir);
  assert.equal(run(`canMove(${JSON.stringify(b)})`), true, `canMove missed ${dir}`);
}
assert.equal(run(`canMove(${JSON.stringify(full)})`), false);
assert.equal(run(`hasTile(${JSON.stringify(sample)}, 8)`), true);
assert.equal(run(`hasTile(${JSON.stringify(sample)}, 16)`), false);

// Seeded property check: every slide keeps the tile sum, `moved` means the board changed,
// and canMove is true exactly when some direction changes the board
let seed = 20261122;
const prng = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // Park-Miller: fits in a double exactly
const pick = (xs) => xs[Math.floor(prng() * xs.length)];
const SPARSE = [0, 0, 0, 2, 2, 4, 8], DENSE = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]; // dense: full boards, often stuck
const boards = Array.from({ length: 400 }, (_, i) => Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => pick(i % 2 ? DENSE : SPARSE))));
const results = json(`${JSON.stringify(boards)}.map(b => [canMove(b), ...${JSON.stringify(DIR4)}.map(d => slide(b, d))])`);
const total = (b) => b.flat().reduce((a, v) => a + v, 0);
let stuck = 0;
results.forEach(([can, ...slides], i) => {
  const b = boards[i], changed = slides.map(s => JSON.stringify(s.board) !== JSON.stringify(b));
  slides.forEach((s, k) => {
    assert.equal(total(s.board), total(b), `tile sum changed: ${JSON.stringify(b)} ${DIR4[k]}`);
    assert.equal(s.moved, changed[k], `moved wrong: ${JSON.stringify(b)} ${DIR4[k]}`);
  });
  assert.equal(can, changed.some(Boolean), `canMove wrong: ${JSON.stringify(b)}`);
  if (!can) stuck++;
});
assert.ok(stuck > 0 && stuck < boards.length, `property boards not varied enough (stuck: ${stuck})`);

// ---- shell ----
const count = (b) => b.flat().filter(Boolean).length;

// Start: two tiles, each 2 or 4, score 0, no undo; DOM shows two tiles, score and best
for (const r of [0, 0.5, 0.95]) {
  rnd = r;
  run('reset(); render()');
  const b = json('board');
  assert.equal(count(b), 2, `start r=${r}`);
  assert.ok(b.flat().filter(Boolean).every(v => v === (r < 0.9 ? 2 : 4)));
  assert.deepEqual([run('score'), run('prev'), run('over'), run('won')], [0, null, false, false]);
}
assert.equal(g.tiles().length, 2);
assert.deepEqual([g.els.score.textContent, g.els.best.textContent, g.els.undo.disabled, g.els.message.hidden], ['0', '0', true, true]);

// No change: nothing spawns, score and undo untouched
rnd = 0;
g.setBoard([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
run('move("left")');
assert.deepEqual(json('board')[0], [2, 4, 0, 0]);
assert.deepEqual([count(json('board')), run('score'), run('prev')], [2, 0, null]);

// Spawn on change: exactly one new tile, score gains the merge
g.setBoard([[2, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
run('move("left")');
assert.deepEqual(json('board'), [[4, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]); // rnd 0: first empty cell, a 2
assert.equal(run('score'), 4);
assert.equal(g.els.score.textContent, '4');

// Tile position: translate x by column, y by row
g.setBoard([[0, 0, 0, 0], [0, 0, 0, 2], [0, 0, 4, 0], [0, 0, 0, 0]]);
assert.equal(run('els.get(ids[1][3])').style.transform, 'translate(calc(3 * (100% + var(--gap))), calc(1 * (100% + var(--gap))))');
assert.equal(run('els.get(ids[2][2])').style.transform, 'translate(calc(2 * (100% + var(--gap))), calc(2 * (100% + var(--gap))))');

// Tile identity: a sliding tile keeps its element and its transform changes; a merged-away tile slides under its partner
g.setBoard([[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [4, 0, 0, 4]]);
const elAt = (r, c) => run(`els.get(ids[${r}][${c}])`);
const slider = elAt(0, 3), keeper = elAt(3, 0), merger = elAt(3, 3);
const before = slider.style.transform;
rnd = 0.999; // spawn in the last empty cell
run('move("left")');
assert.equal(elAt(0, 0), slider, 'sliding tile got a new element');
assert.notEqual(slider.style.transform, before);
assert.equal(slider.style.transform, 'translate(calc(0 * (100% + var(--gap))), calc(0 * (100% + var(--gap))))');
assert.equal(elAt(3, 0), keeper);
assert.equal(keeper.textContent, '8');
assert.match(keeper.className, /\bv8\b/);
assert.ok(g.tiles().includes(merger) && /\bgone\b/.test(merger.className), 'merged-away tile not kept as a ghost');
assert.equal(merger.style.transform, keeper.style.transform);
assert.equal(merger.textContent, '4', 'merged-away tile shows the merged value');
assert.equal(g.tiles().length, 4); // slider, keeper, ghost, spawn
rnd = 0;
run('move("right")'); // next move drops the ghost
assert.ok(!g.tiles().includes(merger));
assert.equal(g.tiles().length, 4); // three tiles plus the new spawn

// render() leaves state alone
const snap = () => run('JSON.stringify([board, score, best, won, keepPlaying, over, prev, ids, ghosts, undone, nextId])');
const s0 = snap();
run('render(); render()');
assert.equal(snap(), s0, 'render() changed state');

// Keys: arrows move and preventDefault (repeat moves again); other keys untouched
g.setBoard([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
rnd = 0.999;
g.key('ArrowRight');
assert.equal(json('board')[0][3], 2);
let kb = snap();
g.key('ArrowDown', true);
assert.notEqual(snap(), kb, 'repeat did not move');
g.key('ArrowLeft'); g.key('ArrowUp');
assert.equal(g.prevented(), 4);
g.setBoard([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0]]);
g.key('ArrowUp');
assert.equal(json('board')[0][0], 2, 'ArrowUp');
kb = snap();
for (const code of ['KeyW', 'Space', 'Tab', 'F5', 'Enter', 'NumpadEnter', 'KeyC', 'constructor', undefined]) g.key(code);
assert.equal(g.prevented(), 5, 'non-game key prevented');
assert.equal(snap(), kb, 'non-game key changed state');

// Swipe: a drag of length >= 30 px moves along the larger component (tie: vertical); shorter drags and non-primary buttons do nothing
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
const at = () => { const b = json('board'); const r = b.findIndex(row => row.includes(2)); return [r, b[r].indexOf(2)]; };
rnd = 0.95; // spawns are 4s, so the 2 stays traceable
g.swipe(29, 0); g.swipe(21, 21); g.swipe(0, -29.9); g.swipe(40, 0, { button: 2 }); g.swipe(40, 0, { isPrimary: false, pointerId: 2 });
// drags starting on a button (outside or inside the board area) or outside the board area do nothing
g.swipe(40, 0, { target: onUndoButton }); g.swipe(40, 0, { target: onContinue }); g.swipe(40, 0, { target: outside });
// pointercancel clears the start; a pointerup from another pointer is ignored
g.down(); g.listeners.pointercancel({ pointerId: 1 }); g.up(40, 0);
g.down(); g.up(40, 0, 7);
assert.deepEqual([at(), count(json('board'))], [[1, 1], 1]);
g.up(40, 0); // ...and the recorded pointer still swipes after it
assert.deepEqual(at(), [1, 3]);
// a pointercancel from another pointer leaves the recorded start alone
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.down(); g.listeners.pointercancel({ pointerId: 7 }); g.up(40, 0);
assert.deepEqual(at(), [1, 3]);
// a handled key drops a drag still under way: the board moves by the key only
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.down(); g.key('ArrowLeft');
assert.equal(run('swipeFrom'), null);
g.up(40, 0);
assert.deepEqual([at(), count(json('board'))], [[1, 0], 2]);
// a second finger's pointerdown doesn't overwrite the first
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.down();
g.down({ pointerId: 2, isPrimary: false, clientX: 500, clientY: 500 });
assert.deepEqual(json('swipeFrom'), { id: 1, x: 100, y: 100 });
g.up(0, -40);
assert.deepEqual(at(), [0, 1]);
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.swipe(30, 0);
assert.deepEqual(at(), [1, 3]);
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.swipe(-29, 29); // ~41 px long, equal components: vertical
assert.deepEqual(at(), [3, 1]);
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.swipe(25, -25); // ~35 px long, though each component is under 30
assert.deepEqual(at(), [0, 1]);
// 2: a start whose pointerup was lost is dropped by the next primary press that can't start a swipe
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.down(); // no pointerup
g.down({ target: onUndoButton });
assert.equal(run('swipeFrom'), null);
g.up(40, 0);
g.down(); g.down({ target: outside }); g.up(40, 0);
g.down(); g.down({ button: 2 }); g.up(40, 0);
assert.deepEqual([at(), count(json('board'))], [[1, 1], 1]);
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.swipe(40, -50);
assert.deepEqual(at(), [0, 1]);
g.setBoard([[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.swipe(-60, 20);
assert.deepEqual(at(), [1, 0]);
g.setBoard([[0, 0, 0, 0], [0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0]]);
g.swipe(5, 31);
assert.deepEqual(at(), [3, 1]);
g.up(100, -200); // a stray pointerup after the swipe finished: would slide up if the old start were kept
assert.deepEqual(at(), [3, 1]);

// Win: first 2048 shows the message with Continue; moves wait; Continue resumes and the message never returns
rnd = 0;
g.setBoard([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.key('ArrowLeft');
assert.deepEqual([run('won'), run('keepPlaying'), json('board')[0][0]], [true, false, 2048]);
assert.deepEqual([g.els.message.hidden, g.els.continue.hidden, g.els['message-text'].textContent], [false, false, 'You reached 2048!']);
assert.equal(g.els.status.textContent, 'You reached 2048! Continue or start a new game.');
assert.match(run('els.get(ids[0][0])').className, /\bv2048\b/);
assert.equal(g.focused.el, g.els.continue, 'Continue not focused');
const atWin = json('board');
g.key('ArrowDown'); g.swipe(0, 80);
assert.deepEqual(json('board'), atWin, 'moved under the win message');
g.click('continue');
assert.deepEqual([run('keepPlaying'), g.els.message.hidden, g.els.status.textContent], [true, true, '']);
g.key('ArrowDown');
assert.notDeepEqual(json('board'), atWin);
run('board[0][0] = 1024; board[0][1] = 1024; ids[0][1] = ++nextId; render()');
g.key('ArrowLeft');
assert.ok(run('hasTile(board, 2048)'));
assert.deepEqual([g.els.message.hidden, g.els.status.textContent], [true, ''], 'win message shown again');
// Undo past a Continue: keepPlaying comes back too, so re-reaching 2048 shows the message and focuses Continue again
rnd = 0;
g.setBoard([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.key('ArrowLeft'); g.key('KeyC');
assert.equal(run('keepPlaying'), true);
g.key('KeyU');
assert.deepEqual([run('won'), run('keepPlaying')], [false, false]);
g.focused.el = null;
g.key('ArrowLeft');
assert.deepEqual([g.els.message.hidden, g.els.continue.hidden, g.els['message-text'].textContent], [false, false, 'You reached 2048!']);
assert.equal(g.focused.el, g.els.continue, 'Continue not focused after re-reaching 2048');

// Enter, numpad Enter and C also continue, only while the message is up; focus then goes to New game, not the hidden Continue
for (const code of ['Enter', 'NumpadEnter', 'KeyC']) {
  rnd = 0;
  g.setBoard([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  g.key('KeyC'); g.key('Enter'); g.key('NumpadEnter');
  assert.equal(run('keepPlaying'), false, 'continued before the message');
  g.key('ArrowLeft');
  assert.deepEqual([g.els.message.hidden, g.focused.el], [false, g.els.continue]);
  const p = g.prevented();
  g.key(code);
  assert.deepEqual([run('keepPlaying'), g.els.message.hidden, g.els.status.textContent], [true, true, ''], code);
  assert.equal(g.prevented(), p + 1, `${code}: not prevented, so its keypress could click the newly focused button`);
  assert.equal(g.focused.el, g.els.new, `${code}: focus left on the hidden Continue`);
}
// a Continue click with no message up does nothing, so the message still shows at 2048
rnd = 0;
g.setBoard([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.click('continue');
assert.equal(run('keepPlaying'), false, 'Continue click without the message');
g.key('ArrowLeft');
assert.deepEqual([g.els.message.hidden, g.els.continue.hidden, g.focused.el], [false, false, g.els.continue]);
g.click('continue');
assert.deepEqual([run('keepPlaying'), g.focused.el], [true, g.els.new]);
// tiles past 2048 keep a style
run('board[0][0] = 4096; render()');
assert.match(run('els.get(ids[0][0])').className, /\bvbig\b.*\bd4\b/);

// Lose: a move that fills the board with no equal neighbours ends the game; moves are ignored until a new game
rnd = 0.95; // the one empty cell gets a 4
g.setBoard([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [2, 4, 2, 0]]);
g.key('ArrowRight');
assert.deepEqual(json('board'), full);
assert.equal(run('over'), true);
assert.deepEqual([g.els.message.hidden, g.els.continue.hidden, g.els['message-text'].textContent],
  [false, true, 'Game over. Score: 0. Use Undo or New game.']);
assert.equal(g.els.status.textContent, 'Game over. Score: 0. Use Undo or New game (U or N).');
for (const code of ['ArrowLeft', 'ArrowUp', 'ArrowDown']) g.key(code);
g.swipe(-80, 0);
assert.deepEqual([json('board'), run('over')], [full, true]);
g.key('KeyN');
assert.deepEqual([run('over'), count(json('board')), run('score'), g.els.message.hidden], [false, 2, 0, true]);
// New game also from the button, at any time
rnd = 0;
g.setBoard([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.key('ArrowLeft');
g.click('new');
assert.deepEqual([count(json('board')), run('score'), run('prev'), g.els.undo.disabled], [2, 0, null, true]);

// Undo: U or the button restores board and score; one step only; nothing before a move or after a new game
g.setBoard([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
const b0 = json('board'), ids0 = json('ids');
g.key('KeyU');
assert.deepEqual([json('board'), g.els.status.textContent], [b0, ''], 'undo before any move');
g.key('ArrowLeft');
assert.deepEqual([run('score'), g.els.undo.disabled], [4, false]);
g.key('KeyU');
assert.deepEqual([json('board'), json('ids'), run('score'), g.els.undo.disabled], [b0, ids0, 0, true]);
assert.equal(g.els.status.textContent, 'Move undone.');
assert.equal(g.tiles().length, 2, 'spawned tile left behind after undo');
const afterUndo = snap();
g.key('KeyU');
assert.equal(snap(), afterUndo, 'second undo changed state');
g.key('ArrowRight');
assert.equal(g.els.status.textContent, '', 'status kept "Move undone." after a move');
g.key('KeyU');
g.key('ArrowLeft'); g.els.undo.focus(); g.click('undo');
assert.deepEqual([json('board'), run('score')], [b0, 0]);
assert.deepEqual([g.els.undo.disabled, g.focused.el], [true, g.els.new], 'focus left on the disabled Undo');
g.key('ArrowLeft'); g.key('KeyN');
const fresh = snap();
g.key('KeyU');
assert.equal(snap(), fresh, 'undo after a new game');
// undo out of game over and out of the win message
rnd = 0.95;
g.setBoard([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [2, 4, 2, 0]]);
g.key('ArrowRight');
assert.equal(run('over'), true);
g.key('KeyU');
assert.deepEqual([run('over'), g.els.message.hidden, json('board')[3]], [false, true, [2, 4, 2, 0]]);
rnd = 0;
g.setBoard([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.key('ArrowLeft'); g.key('KeyU');
assert.deepEqual([run('won'), g.els.message.hidden], [false, true]);

// One move reaches 2048 and leaves no moves: win message first, game over after Continue; undo restores the board before
rnd = 0.95; // the one empty cell gets a 4
const winStuck = [[1024, 1024, 4, 2], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
g.setBoard(winStuck);
run('score = 100');
g.key('ArrowLeft');
assert.deepEqual(json('board'), [[2048, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
assert.deepEqual([run('won'), run('over'), g.els['message-text'].textContent, g.els.continue.hidden], [true, true, 'You reached 2048!', false]);
g.click('continue');
assert.deepEqual([g.els.message.hidden, g.els.continue.hidden, g.els['message-text'].textContent], [false, true, 'Game over. Score: 2148. Use Undo or New game.']);
assert.equal(g.els.status.textContent, 'Game over. Score: 2148. Use Undo or New game (U or N).');
g.key('KeyU');
assert.deepEqual([json('board'), run('score'), run('over'), run('won'), g.els.message.hidden], [winStuck, 100, false, false, true]);

// New game clears everything, without setBoard in between: after 2048 + Continue, and after an undo
const cleanStart = (label) => {
  assert.equal(run('keepPlaying'), false, label);
  assert.equal(g.els.status.textContent, '', label);
  assert.equal(g.tiles().length, 2, label);
  assert.ok(!g.tiles().some(t => /\bgone\b/.test(t.className)), label + ': ghost left');
};
rnd = 0;
g.setBoard([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
g.key('ArrowLeft'); g.key('KeyC');
assert.ok(g.tiles().some(t => /\bgone\b/.test(t.className)) && run('keepPlaying'));
g.key('KeyN');
cleanStart('2048, Continue, N');
g.key('ArrowLeft'); g.key('ArrowUp'); g.key('ArrowRight'); // some play from the fresh board
g.key('KeyU');
assert.equal(g.els.status.textContent, 'Move undone.');
g.key('KeyN');
cleanStart('U, N');
// tile ids keep counting across games, so a new game never reuses an old tile's element
const oldTiles = new Set(g.tiles());
g.key('KeyN');
assert.equal(g.tiles().length, 2);
assert.ok(g.tiles().every(t => !oldTiles.has(t)), 'new game reused a tile element');

// #status (aria-live) is written only when its text changes
const w = g.writes.status;
run('render(); render()');
g.key('KeyU');
assert.equal(g.writes.status, w, 'status rewritten without a change');

// Best: read at load, raised and saved whenever the score beats it
const store = { twofoldBest: '6' };
const h = game({ localStorage: memStorage(store) });
assert.deepEqual([h.run('best'), h.els.best.textContent], [6, '6']);
rnd = 0;
h.setBoard([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
h.key('ArrowLeft');
assert.deepEqual([h.run('best'), store.twofoldBest], [6, '6']); // score 4: not beaten
h.run('board[1] = [4, 4, 0, 0]; ids[1] = [++nextId, ++nextId, 0, 0]');
h.key('ArrowRight');
assert.deepEqual([h.run('score'), h.run('best'), store.twofoldBest, h.els.best.textContent], [12, 12, '12', '12']);
h.key('KeyU'); // undo keeps the best
assert.deepEqual([h.run('score'), h.run('best'), h.els.best.textContent], [4, 12, '12']);
h.key('KeyN');
assert.deepEqual([h.run('score'), h.els.best.textContent], [0, '12']);
// reload sees it
assert.equal(game({ localStorage: memStorage(store) }).run('best'), 12);
// junk reads as 0; throwing or missing storage is swallowed and play goes on
assert.equal(game({ localStorage: { getItem: () => 'junk', setItem() {} } }).run('best'), 0);
const boom = () => { throw new Error('SecurityError'); };
for (const globals of [{ localStorage: { getItem: boom, setItem: boom } }, {}]) {
  const b = game(globals);
  assert.equal(b.run('best'), 0);
  b.setBoard([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  b.key('ArrowLeft');
  assert.deepEqual([b.run('score'), b.run('best')], [4, 4]);
}

console.log('all twofold tests passed');
