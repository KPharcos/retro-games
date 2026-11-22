// Self-check for stackfall.html: runs its <script> in node:vm with a stub DOM and asserts the rules in spec-stackfall-puzzle.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./stackfall.html', import.meta.url), 'utf8');
const { run, key, listeners, texts } = load('./stackfall.html');
const json = (expr) => JSON.parse(run(`JSON.stringify(${expr})`)); // arrays cross the vm boundary badly
const rendered = () => { texts.length = 0; run('render()'); return texts; };
const pos = () => json('[piece.x, piece.y]');
const empty = () => run('board.every(r => r.every(c => !c))');
// place a piece by hand: key, matrix (default spawn matrix), x, y
const put = (k, x, y, m = `SHAPES.${k}`) => run(`piece = { k: '${k}', m: ${m}, x: ${x}, y: ${y} }; dropAcc = lockTimer = 0`);
const T_RIGHT = '[[0,1,0],[0,1,1],[0,1,0]]';
const I_VERT = '[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]';

// Page: 450x600 canvas with role="img" and a label, aria-live status, one bare <script>, no setInterval or storage
assert.match(html, /<canvas[^>]*\bwidth="450"[^>]*\bheight="600"[^>]*role="img"[^>]*aria-label="[^"]+"/);
assert.match(html, /id="status" aria-live="polite"/);
assert.equal(html.match(/<script/g).length, 1);
assert.ok(!html.includes('setInterval') && !html.includes('localStorage'));

// Start: empty 10x20 board, score/lines 0, level 1, nothing held; HUD drawn
run('reset()');
assert.deepEqual([run('board.length'), run('board[0].length'), empty()], [20, 10, true]);
assert.deepEqual([run('score'), run('lines'), run('level()'), run('holdK'), run('over'), run('interval()')], [0, 0, 1, null, false, 1000]);
for (const t of ['Score: 0', 'Lines: 0', 'Level: 1', 'Next', 'Hold']) assert.ok(rendered().includes(t), t);

// Spawn: centred (column 3 for 3- and 4-wide boxes, 4 for O) in the top rows
for (const [k, x] of [['I', 3], ['O', 4], ['T', 3], ['S', 3], ['Z', 3], ['J', 3], ['L', 3]]) {
  run(`reset(); spawn('${k}')`);
  assert.deepEqual([run('piece.k'), ...pos()], [k, x, 0], k);
}

// Bag: each group of 7 spawns holds every shape once
run('reset()');
const seq = [run('piece.k')];
for (let i = 1; i < 14; i++) { run('spawnNext()'); seq.push(run('piece.k')); }
const all = 'IJLOSTZ';
assert.equal(seq.slice(0, 7).sort().join(''), all);
assert.equal(seq.slice(7).sort().join(''), all);
// order comes from Math.random
let rnd = 0;
const m = load('./stackfall.html', { Math: Object.assign(Object.create(Math), { random: () => rnd }) }); // spread would be empty
const order = () => { m.run('reset()'); const s = [m.run('piece.k')]; for (let i = 1; i < 14; i++) { m.run('spawnNext()'); s.push(m.run('piece.k')); } return s.join(''); };
const o0 = order();
assert.equal(o0.slice(0, 7), 'ILJZSTO', 'Fisher-Yates with random 0');
assert.equal([...o0.slice(7)].sort().join(''), all, 'refilled bag');
rnd = 0.999999;
assert.equal(order().slice(0, 7), 'LJZSTOI', 'Fisher-Yates with random near 1: no swaps'); // bag pops from the end

// Move: one column; repeat accepted; walls and stack block
run('reset()'); put('T', 4, 5);
key('ArrowLeft');
assert.deepEqual(pos(), [3, 5]);
key('ArrowRight'); key('ArrowRight', true);
assert.deepEqual(pos(), [5, 5]);
put('T', 0, 5); key('ArrowLeft');
assert.deepEqual(pos(), [0, 5], 'moved through left wall');
put('T', 7, 5); key('ArrowRight');
assert.deepEqual(pos(), [7, 5], 'moved through right wall');
run('board[6][3] = "Z"'); put('T', 4, 5); key('ArrowLeft');
assert.deepEqual(pos(), [4, 5], 'moved into stack');

// Rotate: clockwise in place; repeat ignored
run('reset()'); put('T', 4, 5);
key('ArrowUp');
assert.deepEqual([json('piece.m'), ...pos()], [JSON.parse(T_RIGHT), 4, 5]);
key('ArrowUp', true);
assert.deepEqual(json('piece.m'), JSON.parse(T_RIGHT), 'repeat rotated');
key('ArrowUp'); key('ArrowUp'); key('ArrowUp');
assert.deepEqual(json('piece.m'), [[0, 1, 0], [1, 1, 1], [0, 0, 0]], 'four turns is not identity');
run('spawn("O")'); key('ArrowUp');
assert.deepEqual([json('piece.m'), ...pos()], [[[1, 1], [1, 1]], 4, 0]);

// Wall kick: x, then x-1, then x+1; all blocked keeps the piece
run('reset()'); put('T', -1, 5, T_RIGHT); key('ArrowUp'); // left wall: x-1 out too, x+1 fits
assert.deepEqual([json('piece.m'), ...pos()], [[[0, 0, 0], [1, 1, 1], [0, 1, 0]], 0, 5]);
put('T', 8, 5, '[[0,1,0],[1,1,0],[0,1,0]]'); key('ArrowUp'); // right wall: x-1 fits
assert.deepEqual([json('piece.m'), ...pos()], [[[0, 1, 0], [1, 1, 1], [0, 0, 0]], 7, 5]);
// stack: horizontal I at x=3 rotates into column 5; block only that column so both kicks fit
run('reset(); board[8][5] = "Z"'); put('I', 3, 5); key('ArrowUp');
assert.deepEqual([json('piece.m'), ...pos()], [JSON.parse(I_VERT), 2, 5], 'x-1 not tried first');
run('reset(); board[8][5] = board[8][4] = "Z"'); put('I', 3, 5); key('ArrowUp');
assert.deepEqual([json('piece.m'), ...pos()], [JSON.parse(I_VERT), 4, 5]);
run('reset(); board[8][5] = board[8][4] = board[8][6] = "Z"'); put('I', 3, 5); key('ArrowUp');
assert.deepEqual([json('piece.m'), ...pos()], [json('SHAPES.I'), 3, 5], 'rotated with all three blocked');

// Soft drop: one row per keydown, repeat accepted, resets the lock timer
run('reset()'); put('T', 3, 5); run('lockTimer = 300');
key('ArrowDown'); key('ArrowDown', true);
assert.deepEqual([...pos(), run('lockTimer')], [3, 7, 0]);
// resting: no move, lock timer keeps running
put('T', 3, 18); run('step(300)'); key('ArrowDown');
assert.deepEqual([...pos(), run('lockTimer')], [3, 18, 300]);
run('step(200)');
assert.ok(!empty(), 'soft drop on the floor stalled the lock');

// Hard drop: to the ghost row, locks at once; repeat ignored
run('reset()'); put('T', 3, 0);
assert.equal(run('ghostY()'), 18);
const nextBefore = run('nextK');
key('Space', true);
assert.deepEqual([...pos(), empty()], [3, 0, true], 'repeat hard-dropped');
key('Space');
assert.deepEqual(json('[board[18], board[19]]'), [['', '', '', '', 'T', '', '', '', '', ''], ['', '', '', 'T', 'T', 'T', '', '', '', '']]);
assert.deepEqual([run('piece.k'), run('piece.y')], [nextBefore, 0]);
// lands on the stack
run('reset(); board[10][4] = "Z"'); put('T', 3, 0); key('Space');
assert.deepEqual(json('[board[8][4], board[9].join("")]'), ['T', 'TTT']);

// Gravity: 1000 ms at level 1
run('reset()'); put('T', 3, 0);
run('step(999)');
assert.deepEqual(pos(), [3, 0]);
run('step(1)');
assert.deepEqual(pos(), [3, 1]);

// Level speed: level = 1 + floor(lines/10), interval = max(50, round(1000 * 0.8^(level-1)))
for (const [l, lv, iv] of [[0, 1, 1000], [9, 1, 1000], [10, 2, 800], [20, 3, 640], [30, 4, 512], [130, 14, 55], [140, 15, 50], [500, 51, 50]]) {
  run(`lines = ${l}`);
  assert.deepEqual([run('level()'), run('interval()')], [lv, iv], `lines ${l}`);
}
run('reset(); lines = 10'); put('T', 3, 0);
run('step(799)');
assert.deepEqual(pos(), [3, 0]);
run('step(1)');
assert.deepEqual(pos(), [3, 1]);
// fast levels fall several rows in one step
run('reset(); lines = 200'); put('T', 3, 0); run('step(100)');
assert.deepEqual(pos(), [3, 2]);

// Lock delay: 500 ms after resting
run('reset()'); put('T', 3, 18);
run('step(499)');
assert.deepEqual([...pos(), empty()], [3, 18, true]);
run('step(1)');
assert.deepEqual([empty(), run('piece.y')], [false, 0]);
// moving down a row resets the timer
run('reset()'); put('T', 3, 5); run('lockTimer = 400; step(1000)');
assert.deepEqual([...pos(), run('lockTimer')], [3, 6, 0]);
// a piece that lands mid-step starts its timer from 0
run('reset()'); put('T', 3, 17); run('step(1000)');
assert.deepEqual([run('piece.y'), run('lockTimer')], [18, 0]);
run('step(499)');
assert.ok(empty());

// Floor stall: sliding and rotating on the floor do not extend the delay
run('reset()'); put('T', 3, 18);
run('step(150)'); key('ArrowLeft'); run('step(150)'); key('ArrowUp'); key('ArrowRight'); run('step(150)'); key('ArrowLeft'); key('ArrowRight');
run('step(49)');
assert.ok(empty(), 'locked early');
run('step(1)');
assert.ok(!empty(), 'floor sliding stalled the lock');
// a rotation that succeeds on the floor does not reset the timer either
run('reset()'); put('T', 3, 17, T_RIGHT);
assert.equal(run('ghostY()'), 17);
run('step(300)'); key('ArrowUp');
assert.deepEqual([json('piece.m'), ...pos()], [[[0, 0, 0], [1, 1, 1], [0, 1, 0]], 3, 17], 'floor rotation failed');
run('step(199)');
assert.ok(empty(), 'locked early');
run('step(1)');
assert.ok(!empty(), 'floor rotation stalled the lock');

// Gravity wait after a soft drop: no extra row from the old accumulator
run('reset()'); put('T', 3, 5); run('dropAcc = 990');
key('ArrowDown'); run('step(10)');
assert.deepEqual(pos(), [3, 6], 'gravity fell right after a soft drop');
run('step(989)');
assert.deepEqual(pos(), [3, 6]);
run('step(1)');
assert.deepEqual(pos(), [3, 7]);
// sliding off a ledge at a fast level waits a full interval
run('reset(); lines = 200; board[10][0] = "Z"'); put('O', 0, 7);
run('step(70)'); // one 50 ms fall onto the ledge, 20 ms left over
assert.deepEqual([...pos(), run('dropAcc')], [0, 8, 0]);
key('ArrowRight');
run('step(49)');
assert.deepEqual(pos(), [1, 8], 'fell before a full interval');
run('step(1)');
assert.deepEqual(pos(), [1, 9]);
// sliding onto a ledge with time banked: one resting step clears it, so sliding off waits a full interval
run('reset(); board[10][0] = "Z"'); put('O', 1, 8);
run('step(400)'); key('ArrowLeft'); run('step(10)');
assert.deepEqual([...pos(), run('dropAcc')], [0, 8, 0]);
key('ArrowRight'); run('step(600)');
assert.deepEqual(pos(), [1, 8], 'banked gravity survived resting');
run('step(400)');
assert.deepEqual(pos(), [1, 9]);

// Spawn starts fresh timers: banked gravity and lock time don't carry to the next piece
run('reset()'); put('T', 3, 0); run('dropAcc = 900'); key('Space'); run('step(100)');
assert.equal(run('piece.y'), 0, 'gravity carried over a hard drop');
run('reset(); holdK = "O"'); put('T', 3, 5); run('dropAcc = 900'); key('KeyC'); run('step(100)');
assert.deepEqual([run('piece.k'), run('piece.y')], ['O', 0], 'gravity carried over a hold');
// new O rests on board[2][4] right at spawn
run('reset(); nextK = "O"; board[2][4] = "Z"'); put('T', 0, 18); run('lockTimer = 400'); key('Space');
assert.deepEqual([run('piece.k'), run('lockTimer')], ['O', 0]);
run('step(100)');
assert.deepEqual([run('piece.k'), run('board[0][4]')], ['O', ''], 'lock time carried over a hard drop');
run('reset(); holdK = "O"; board[2][4] = "Z"'); put('T', 0, 18); run('lockTimer = 400'); key('KeyC');
assert.deepEqual([run('piece.k'), run('lockTimer')], ['O', 0]);
run('step(100)');
assert.deepEqual([run('piece.k'), run('board[0][4]')], ['O', ''], 'lock time carried over a hold');

// Line clear: 1-4 rows, rows above drop, 100/300/500/800 x level (level before the clear)
for (const [n, pts] of [[1, 100], [2, 300], [3, 500], [4, 800]]) {
  run(`reset(); for (let y = ${20 - n}; y < 20; y++) for (let x = 0; x < 9; x++) board[y][x] = 'Z'; board[15][0] = 'S'`);
  put('I', 7, 0, I_VERT); key('Space');
  assert.deepEqual([run('lines'), run('score'), run(`board[${15 + n}][0]`), run('board[15][0]')], [n, pts, 'S', ''], `${n} rows`);
  assert.equal(run(`board.filter(r => r[9] === 'I').length`), 4 - n, `${n} rows: I cells above the clear`);
  if (n < 2) continue;
  // refilled rows are separate arrays: a T locked into rows 0-1 (over a near-full row 2) fills only its own cells
  run(`for (let x = 0; x < 9; x++) board[2][x] = 'Z'`); put('T', 3, 0); key('Space');
  assert.deepEqual(json('[board[0], board[1]]'), [['', '', '', '', 'T', '', '', '', '', ''], ['', '', '', 'T', 'T', 'T', '', '', '', '']], `${n} rows: refilled rows share an array`);
}
run(`reset(); lines = 9; for (let y = 16; y < 20; y++) for (let x = 0; x < 9; x++) board[y][x] = 'Z'`);
put('I', 7, 0, I_VERT); key('Space');
assert.deepEqual([run('lines'), run('score'), run('level()'), empty()], [13, 800, 2, true]);
run(`reset(); lines = 10; score = 5; for (let x = 0; x < 9; x++) board[19][x] = 'Z'`);
put('I', 7, 0, I_VERT); key('Space');
assert.deepEqual([run('lines'), run('score')], [11, 205]);
// a lock with no full row scores nothing and keeps the board
run('reset()'); put('T', 3, 0); key('Space');
assert.deepEqual([run('lines'), run('score')], [0, 0]);

// Next: the preview is what spawns next
run('reset()');
for (let i = 0; i < 8; i++) { // crosses a bag boundary without topping out
  const nk = run('nextK');
  key('Space');
  assert.equal(run('piece.k'), nk);
}

// Hold: first takes the next piece; once per piece; swap after lock; respawns at the top
run('reset()');
const [k1, n1] = [run('piece.k'), run('nextK')];
key('ArrowRight'); key('ArrowDown');
key('KeyC');
assert.deepEqual([run('holdK'), run('piece.k'), run('canHold')], [k1, n1, false]);
const [k2, n2] = [run('piece.k'), run('nextK')];
assert.notEqual(n2, n1, 'nextK not advanced by the first hold');
key('ShiftLeft');
assert.deepEqual([run('holdK'), run('piece.k'), run('nextK')], [k1, k2, n2], 'second hold before lock');
key('Space'); // lock
const k3 = run('piece.k');
assert.equal(k3, n2, 'spawn after hold skipped the bag');
key('ShiftRight', true);
assert.deepEqual([run('holdK'), run('piece.k')], [k1, k3], 'repeat held');
key('ArrowLeft'); key('ArrowDown');
key('ShiftRight');
assert.deepEqual([run('holdK'), run('piece.k'), run('piece.y'), run('piece.x'), run('canHold')], [k3, k1, 0, k1 === 'O' ? 4 : 3, false]);
assert.deepEqual(json('piece.m'), json(`SHAPES.${k1}`));
// a swapped-in held piece with no room at spawn ends the game
run('reset(); holdK = "O"'); put('T', 3, 10); run('board[1][4] = "Z"');
key('KeyC');
assert.deepEqual([run('over'), run('piece.k'), run('holdK')], [true, 'O', 'T']);

// Drawing: a context that records fillRect (with the current fillStyle) and strokeRect
let draws = [];
const style = {};
const rec = new Proxy({}, {
  get: (_, p) => (p === 'fillRect' || p === 'strokeRect' ? (...a) => draws.push([p, p === 'fillRect' ? style.fillStyle : style.strokeStyle, ...a]) : () => {}),
  set: (_, p, v) => { style[p] = v; return true; },
});
const gh = load('./stackfall.html', { document: { getElementById: () => ({ getContext: () => rec, textContent: '' }), addEventListener() {} } });
const drawn = (code) => { draws = []; gh.run(code); return draws; };
const sortRows = (rows) => rows.map(r => JSON.stringify(r)).sort();

// Ghost: outline drawn at the hard-drop row
const strokes = drawn(`reset(); board[12][4] = 'Z'; piece = { k: 'T', m: SHAPES.T, x: 3, y: 0 }; render()`).filter(d => d[0] === 'strokeRect');
assert.equal(gh.run('ghostY()'), 10);
assert.deepEqual(strokes.map(a => [a[2], a[3]]).sort(), [[121.5, 301.5], [91.5, 331.5], [121.5, 331.5], [151.5, 331.5]].sort());

// Side panel: Next shows SHAPES[nextK], Hold shows SHAPES[holdK], grey while hold is used
const box = (k, oy, color) => JSON.parse(gh.run(`JSON.stringify(SHAPES.${k})`)).flatMap((row, r) => row.flatMap((v, c) => (v ? [['fillRect', color, 320 + c * 24 + 1, oy + r * 24 + 1, 22, 22]] : [])));
const inBox = (rows, oy) => rows.filter(d => d[0] === 'fillRect' && d[2] >= 320 && d[3] >= oy && d[3] < oy + 96);
const colorOf = (k) => gh.run(`COLORS.${k}`);
let panel = drawn(`reset(); piece = { k: 'T', m: SHAPES.T, x: 3, y: 0 }; nextK = 'L'; holdK = 'S'; canHold = true; render()`);
assert.deepEqual(sortRows(inBox(panel, 44)), sortRows(box('L', 44, colorOf('L'))), 'Next box');
assert.deepEqual(sortRows(inBox(panel, 184)), sortRows(box('S', 184, colorOf('S'))), 'Hold box');
panel = drawn('canHold = false; render()');
assert.deepEqual(sortRows(inBox(panel, 184)), sortRows(box('S', 184, '#555')), 'used hold not greyed');
assert.deepEqual(inBox(drawn('holdK = null; render()'), 184), [], 'empty hold drew cells');

// Game over: the blocked spawn piece is not drawn over the stack (on the board, only Z cells)
const onBoard = (rows) => rows.filter(d => d[0] === 'fillRect' && d[2] < 300 && d[4] === 28);
// live piece drawn at its own x,y, not at the ghost row (10)
const livePiece = onBoard(drawn(`reset(); board[12][4] = 'Z'; piece = { k: 'T', m: SHAPES.T, x: 3, y: 2 }; render()`)).filter(d => d[1] === colorOf('T'));
assert.deepEqual(livePiece.map(d => [d[2], d[3]]).sort(), [[121, 61], [91, 91], [121, 91], [151, 91]].sort(), 'live piece position');
assert.ok(onBoard(drawn(`reset(); spawn('T'); render()`)).some(d => d[1] === colorOf('T')), 'live piece not drawn');
const overDraws = drawn(`reset(); board[1][4] = 'Z'; spawn('T'); render()`);
assert.equal(gh.run('over'), true);
assert.deepEqual(onBoard(overDraws).map(d => d[1]), [colorOf('Z')], 'piece drawn while over');

// Game over: spawn collides; overlay drawn; only R acts
run('reset(); board[1][4] = "Z"; spawn("T")');
assert.equal(run('over'), true);
for (const t of ['Game over', 'Press R to restart']) assert.ok(rendered().includes(t), t);
run('score = 1234'); run('render()');
const snap = () => run('JSON.stringify([board, piece, nextK, holdK, canHold, score, lines, dropAcc, lockTimer, over])');
const overSnap = snap();
for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyC', 'ShiftLeft', 'Enter']) key(code);
run('step(5000)');
assert.equal(snap(), overSnap);
// Restart
run('lines = 25; holdK = "S"');
key('KeyR');
assert.deepEqual([empty(), run('score'), run('lines'), run('level()'), run('holdK'), run('canHold'), run('over')], [true, 0, 0, 1, null, true, false]);
// R mid-game does nothing
run('score = 40'); key('KeyR');
assert.equal(run('score'), 40);
// topping out through a real lock
run('reset(); for (let y = 1; y < 20; y++) board[y][4] = "Z"'); put('O', 0, 0); key('Space');
assert.equal(run('over'), true);

// keydown without a code neither throws nor changes state
run('reset()');
const live = snap();
listeners.keydown({ preventDefault() {} });
assert.equal(snap(), live);

// Scroll: arrows and Space prevented (also while over and on repeat); other keys untouched
let prevented = 0;
const press = (code, repeat = false) => listeners.keydown({ code, repeat, preventDefault: () => prevented++ });
run('reset()');
for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) press(code);
press('ArrowUp', true); press('Space', true);
run('over = true'); press('ArrowDown'); press('Space');
assert.equal(prevented, 8);
for (const code of ['KeyC', 'ShiftLeft', 'KeyR', 'KeyW', 'F5', 'Tab']) press(code);
assert.equal(prevented, 8, 'non-game key prevented');

// frame() caps dt at 100 ms: at 50 ms per row a 5 s gap falls 2 rows, not 100
run('reset(); lines = 200'); put('T', 3, 0); run('last = null; frame(0); frame(5000)');
assert.deepEqual(pos(), [3, 2]);

// rAF wiring: bootstraps once, each frame() re-queues
const calls = [];
const r = load('./stackfall.html', { requestAnimationFrame: (cb) => calls.push(cb) });
assert.equal(calls.length, 1);
r.run('frame(1000)'); // very first frame only renders: no dt from load time
assert.equal(calls.length, 2);
assert.deepEqual([r.run('dropAcc'), r.run('piece.y')], [0, 0], 'first frame stepped');

// render() leaves state alone (playing and over)
run('reset(); holdK = "J"; canHold = false');
let before = snap(); rendered();
assert.equal(snap(), before, 'render() changed state');
run('over = true'); before = snap(); rendered();
assert.equal(snap(), before, 'render() changed state while over');

// #status (aria-live): level, then game over; written only when the text changes
const els = {}, docListeners = {}, writes = {};
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const g = load('./stackfall.html', { document: {
  getElementById: (id) => (els[id] ??= (() => {
    let text = '';
    writes[id] = 0;
    return { getContext: () => ctxStub, get textContent() { return text; }, set textContent(v) { text = v; writes[id]++; } };
  })()),
  addEventListener: (type, fn) => { docListeners[type] = fn; },
} });
g.run('render(); step(1000); render()');
assert.deepEqual([els.status.textContent, writes.status], ['Level 1.', 1]);
g.run('lines = 10; render(); render()');
assert.deepEqual([els.status.textContent, writes.status], ['Level 2.', 2]);
g.run('score = 70; board[1][4] = "Z"; spawn("T"); render(); render()');
assert.deepEqual([els.status.textContent, writes.status], ['Game over. Score: 70. Press R to restart.', 3]);
docListeners.keydown({ code: 'KeyR', repeat: false, preventDefault() {} }); g.run('render()');
assert.deepEqual([els.status.textContent, writes.status], ['Level 1.', 4]);

// every id the script looks up exists in the markup
const looked = new Set();
const idCheck = load('./stackfall.html', { document: {
  getElementById: (id) => {
    assert.ok(html.includes(`id="${id}"`), `no element with id="${id}"`);
    looked.add(id);
    return { getContext: () => ctxStub, textContent: '' };
  },
  addEventListener() {},
} });
idCheck.run('frame(0)');
assert.deepEqual([...looked].sort(), ['gameCanvas', 'status']);

console.log('all stackfall tests passed');
