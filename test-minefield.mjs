// Self-check for minefield.html: runs its <script> in node:vm with a stub DOM and asserts the rules in spec-minefield-mine-puzzle.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./minefield.html', import.meta.url), 'utf8');

// Page: one bare <script>, DOM grid of buttons (no canvas, setInterval, sound or assets), grid role + label, aria-live status
assert.equal(html.match(/<script/g).length, 1);
for (const banned of ['setInterval', '<canvas', '<audio', 'src=', 'href=', '☺', '🙂', '😀', '😵']) assert.ok(!html.includes(banned), banned);
assert.match(html, /<title>Minefield<\/title>/);
assert.match(html, /id="board" class="easy" role="grid" aria-label="[^"]+"/);
assert.match(html, /id="status" aria-live="polite"/);
assert.match(html, /<button id="new">New game<\/button>/);
assert.match(html, /requestAnimationFrame\(frame\)/);

// DOM stub: one persistent element per id (every id must exist in the markup), created elements tracked as children
function makeDoc() {
  const els = {}, listeners = {}, writes = {}, focused = { el: null }, touches = { n: 0, sets: 0 }; // n: attribute reads/writes and text writes; sets: attribute writes
  const node = (id, tag) => {
    let text = '';
    const attrs = {};
    if (id) writes[id] = 0;
    return {
      id, tag, className: '', children: [], parent: null,
      get textContent() { return text; },
      set textContent(v) { text = String(v); touches.n++; if (id) writes[id]++; },
      setAttribute(k, v) { attrs[k] = String(v); touches.n++; touches.sets++; },
      getAttribute(k) { touches.n++; return attrs[k] ?? null; },
      closest(sel) { return sel === '#board' && this.parent?.id === 'board' ? this.parent : null; },
      appendChild(c) { this.children.push(c); c.parent = this; return c; },
      remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; },
      focus() { focused.el = this; },
    };
  };
  const document = {
    getElementById: (id) => {
      assert.ok(html.includes(`id="${id}"`), `no element with id="${id}"`);
      return (els[id] ??= node(id));
    },
    createElement: (tag) => node(undefined, tag),
    get activeElement() { return focused.el; },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  return { document, els, listeners, writes, focused, touches };
}

let rnd = 0;
const stubMath = Object.assign(Object.create(Math), { random: () => rnd }); // spread would be empty: Math's props are non-enumerable

function game() {
  const d = makeDoc(), rafs = [];
  const g = load('./minefield.html', { document: d.document, Math: stubMath, requestAnimationFrame: (fn) => rafs.push(fn) });
  const json = (expr) => JSON.parse(g.run(`JSON.stringify(${expr})`)); // arrays cross the vm boundary badly
  const cell = (i) => g.run(`cellEls[${i}]`);
  const cells = () => d.els.board.children;
  let prevented = 0;
  const ev = (o) => ({ preventDefault: () => prevented++, ...o });
  const click = (target) => d.listeners.click(ev({ target }));
  const tap = (i) => click(cell(i));
  const button = (id) => { assert.ok(html.includes(`<button id="${id}"`), id); click(d.document.getElementById(id)); };
  const right = (i) => d.listeners.contextmenu(ev({ target: cell(i) })); // right click, Ctrl+click, ContextMenu key
  const touch = (i, id = 5) => d.listeners.pointerdown(ev({ target: cell(i), button: 0, isPrimary: true, pointerType: 'touch', pointerId: id, clientX: 50, clientY: 50 }));
  const key = (code, o = {}) => d.listeners.keydown(ev({ code, repeat: false, ...o }));
  // a placed board with mines at the given indexes, put in play as the shell's board
  const setBoard = (w, h, mines) => g.run(`board = newBoard(${w}, ${h}, ${mines.length});
    for (const i of ${JSON.stringify(mines)}) board.cells[i].mine = true;
    board.cells.forEach((c, i) => { c.count = neighbours(board, i).filter(n => board.cells[n].mine).length; });
    board.placed = true; elapsed = 0; render()`);
  const opened = () => json('board.cells.flatMap((c, i) => c.open ? [i] : [])');
  return { ...g, ...d, rafs, json, cell, cells, click, tap, button, right, touch, key, setBoard, opened, prevented: () => prevented };
}

const g = game();
const { run, json } = g;

// ---- Acceptance: page opens on an Easy 9x9 board, counter 10, timer 0, New game ----
assert.equal(g.cells().length, 81);
assert.ok(g.cells().every(c => c.tag === 'button' && c.className === 'cell' && c.textContent === ''));
assert.deepEqual([g.els.mines.textContent, g.els.time.textContent, g.els.status.textContent], ['10', '0', '']);
assert.equal(g.els.board.className, 'easy');
assert.equal(g.els.board.getAttribute('aria-label'), 'Minefield board, 9 by 9, 10 mines');
assert.equal(g.cell(10).getAttribute('aria-label'), 'Row 2, column 2, hidden');
assert.deepEqual(['easy', 'medium', 'hard'].map(id => g.els[id].getAttribute('aria-pressed')), ['true', 'false', 'false']);
assert.equal(run('status(board)'), 'ready');

// ---- model ----
// New board: 81 hidden cells, no mines, ready
const nb = json('newBoard(9, 9, 10)');
assert.equal(nb.cells.length, 81);
assert.ok(nb.cells.every(c => !c.mine && !c.open && c.mark === '' && c.count === 0));
assert.deepEqual([nb.w, nb.h, nb.mines, run('status(newBoard(9, 9, 10))')], [9, 9, 10, 'ready']);

// neighbours: flat index y * w + x, clipped at edges
assert.deepEqual(json('neighbours(newBoard(3, 3, 0), 0)'), [1, 3, 4]);
assert.deepEqual(json('neighbours(newBoard(3, 3, 0), 4)'), [0, 1, 2, 3, 5, 6, 7, 8]);
assert.deepEqual(json('neighbours(newBoard(30, 16, 0), 29)'), [28, 58, 59]); // right edge doesn't wrap to the next row

// Mine placement: exactly N, none on the safe cell or its neighbours, counts correct; seeded over sizes and safe cells
// Park-Miller prng inside the vm: rand is called many times per placement
run('var seed = 20261123, prng = () => (seed = (seed * 16807) % 2147483647) / 2147483647');
for (const [w, h, n] of [[9, 9, 10], [16, 16, 40], [30, 16, 99]]) {
  for (const safe of [0, w - 1, w * h - 1, Math.floor(h / 2) * w + Math.floor(w / 2), w * 3]) {
    for (let rep = 0; rep < 20; rep++) {
      const b = json(`(() => { const b = newBoard(${w}, ${h}, ${n}); placeMines(b, ${safe}, prng); return b; })()`);
      const mines = b.cells.flatMap((c, i) => (c.mine ? [i] : []));
      assert.equal(mines.length, n, `${w}x${h} mine count`);
      const sx = safe % w, sy = Math.floor(safe / w);
      for (const m of mines) assert.ok(Math.abs(m % w - sx) > 1 || Math.abs(Math.floor(m / w) - sy) > 1, `mine ${m} next to safe ${safe}`);
      b.cells.forEach((c, i) => {
        const x = i % w, y = Math.floor(i / w);
        let k = 0;
        for (const m of mines) if (m !== i && Math.abs(m % w - x) <= 1 && Math.abs(Math.floor(m / w) - y) <= 1) k++;
        assert.equal(c.count, k, `count at ${i}`);
      });
      assert.ok(b.placed && b.cells[safe].count === 0);
    }
  }
}
// rand at both extremes still places exactly N on allowed cells
for (const r of [0, 0.999999]) {
  const b = json(`(() => { const b = newBoard(9, 9, 10); placeMines(b, 40, () => ${r}); return b; })()`);
  assert.equal(b.cells.filter(c => c.mine).length, 10);
  assert.ok(!b.cells[40].mine && !b.cells[30].mine && !b.cells[50].mine);
}

// model on a hand-placed board: 5x3, a wall of mines in column 2
//   . . * . .
//   . . * . .
//   . . * . .
const mk = (w, h, mines) => `(() => { const b = newBoard(${w}, ${h}, ${mines.length});
  for (const i of ${JSON.stringify(mines)}) b.cells[i].mine = true;
  b.cells.forEach((c, i) => { c.count = neighbours(b, i).filter(n => b.cells[n].mine).length; });
  b.placed = true; return b; })()`;
const openIdx = (b) => b.cells.flatMap((c, i) => (c.open ? [i] : []));
const WALL = mk(5, 3, [2, 7, 12]);
assert.equal(run(`status(${WALL})`), 'playing');
// Flood: zeros in column 0 plus their numbered border in column 1, nothing past the wall
let b = json(`(() => { const b = ${WALL}; reveal(b, 0); return b; })()`);
assert.deepEqual(openIdx(b), [0, 1, 5, 6, 10, 11]);
assert.equal(b.left, 12 - 6);
// a flag stays hidden inside a flood; a question mark is opened (and cleared), since only flags hold a flood
b = json(`(() => { const b = ${WALL}; b.cells[10].mark = 'flag'; b.cells[5].mark = 'question'; reveal(b, 0); return b; })()`);
assert.deepEqual(openIdx(b), [0, 1, 5, 6, 11]);
assert.deepEqual([b.cells[10].mark, b.cells[5].mark], ['flag', '']);
// Number: only that cell
b = json(`(() => { const b = ${WALL}; reveal(b, 3); return b; })()`);
assert.deepEqual(openIdx(b), [3]);
// Blocked: reveal on a flag or a question mark does nothing
b = json(`(() => { const b = ${WALL}; b.cells[0].mark = 'flag'; b.cells[4].mark = 'question'; reveal(b, 0); reveal(b, 4); return b; })()`);
assert.deepEqual(openIdx(b), []);
// Mine: lost, boom recorded; further reveals and marks ignored
b = json(`(() => { const b = ${WALL}; reveal(b, 7); reveal(b, 0); cycleMark(b, 4); return [b, status(b)]; })()`);
assert.deepEqual([b[1], b[0].boom, openIdx(b[0]), b[0].cells[4].mark], ['lost', 7, [], '']);
// Win: last safe cell -> won, every mine flagged
b = json(`(() => { const b = ${WALL}; reveal(b, 0); reveal(b, 4); return [b, status(b)]; })()`);
assert.equal(b[1], 'won');
assert.ok([2, 7, 12].every(i => b[0].cells[i].mark === 'flag'));
// Marks: hidden -> flag -> question -> hidden; a revealed cell doesn't change; marks work before the first reveal
assert.deepEqual(json(`(() => { const b = ${WALL}, out = []; for (let k = 0; k < 3; k++) { cycleMark(b, 4); out.push(b.cells[4].mark); } return out; })()`), ['flag', 'question', '']);
assert.equal(run(`(() => { const b = ${WALL}; reveal(b, 3); cycleMark(b, 3); return b.cells[3].mark; })()`), '');
assert.equal(run('(() => { const b = newBoard(9, 9, 10); cycleMark(b, 0); return b.cells[0].mark; })()'), 'flag');

// Chord, on a 3x3 with mines at the top corners: the centre is a 2
//   * . *
//   . 2 .
//   . . .
const CORNERS = mk(3, 3, [0, 2]);
// flag count matches: every hidden unflagged neighbour opens (a 0 floods), question-marked ones too
b = json(`(() => { const b = ${CORNERS}; reveal(b, 4); b.cells[0].mark = b.cells[2].mark = 'flag'; b.cells[1].mark = 'question'; chord(b, 4); return [b, status(b)]; })()`);
assert.deepEqual([openIdx(b[0]), b[1]], [[1, 3, 4, 5, 6, 7, 8], 'won']);
// flag count differs (one or three flags): nothing
for (const flags of [[0], [0, 2, 6]]) {
  b = json(`(() => { const b = ${CORNERS}; reveal(b, 4); for (const f of ${JSON.stringify(flags)}) b.cells[f].mark = 'flag'; chord(b, 4); return b; })()`);
  assert.deepEqual(openIdx(b), [4], `chord with ${flags.length} flags`);
}
// chord on a hidden cell or a revealed 0 does nothing
assert.deepEqual(openIdx(json(`(() => { const b = ${CORNERS}; chord(b, 7); return b; })()`)), []);
// Chord loss: a wrong flag sends the chord onto a mine
b = json(`(() => { const b = ${CORNERS}; reveal(b, 4); b.cells[0].mark = b.cells[1].mark = 'flag'; chord(b, 4); return [b, status(b)]; })()`);
assert.deepEqual([b[1], b[0].boom], ['lost', 2]);

// Large flood: a 300x300 open board with one mine floods from a corner without recursion (deep recursion would overflow)
assert.deepEqual(json(`(() => { const b = ${mk(300, 300, [300 * 300 - 1])}; reveal(b, 0); return [b.left, status(b)]; })()`), [0, 'won']);
assert.deepEqual(json(`(() => { const b = ${mk(30, 16, [479])}; reveal(b, 0); return [b.cells.filter(c => c.open).length, status(b)]; })()`), [479, 'won']);
const floodSrc = html.slice(html.indexOf('function openCell'), html.indexOf('const reveal'));
assert.ok(!/openCell\(b/.test(floodSrc.slice(20)) && !floodSrc.includes('reveal('), 'flood recurses');

// ---- shell ----
// First click: mines placed then, clicked cell is a 0 and opens a region; timer starts
for (const [r, at] of [[0, 0], [0.5, 40], [0.999, 80], [0.3, 4]]) {
  rnd = r;
  g.button('new');
  assert.equal(run('board.placed'), false);
  g.tap(at);
  assert.equal(run('board.placed'), true);
  assert.equal(run(`board.cells[${at}].count`), 0, `first click at ${at}`);
  assert.ok(g.opened().length > 1, 'first click opened a single cell');
  assert.equal(json('board.cells.filter(c => c.mine).length'), 10);
}
// a flagged first click places nothing
g.button('new');
g.right(0);
g.tap(0);
assert.deepEqual([run('board.placed'), g.opened()], [false, []]);

// Rendering of cells: numbers with their class and label, empty opens, flags, questions
g.setBoard(5, 3, [2, 7, 12]);
g.tap(0);
assert.deepEqual([g.cell(0).className, g.cell(0).textContent, g.cell(0).getAttribute('aria-label')], ['cell open', '', 'Row 1, column 1, empty']);
assert.deepEqual([g.cell(1).className, g.cell(1).textContent, g.cell(1).getAttribute('aria-label')], ['cell open n2', '2', 'Row 1, column 2, 2 mines nearby']);
assert.equal(g.cell(6).className, 'cell open n3');
assert.equal(g.cells().length, 15);

// Marks via right click: flag -> question -> hidden; counter -1 then back; revealed cell: no change
g.right(4);
assert.deepEqual([g.cell(4).className, g.cell(4).textContent, g.els.mines.textContent], ['cell flag', '⚑', '2']);
assert.equal(g.cell(4).getAttribute('aria-label'), 'Row 1, column 5, flagged');
g.right(4);
assert.deepEqual([g.cell(4).className, g.cell(4).textContent, g.els.mines.textContent], ['cell question', '?', '3']);
g.right(4);
assert.deepEqual([g.cell(4).className, g.cell(4).textContent, g.els.mines.textContent], ['cell', '', '3']);
g.right(1);
assert.equal(run('board.cells[1].mark'), '');
// counter can go negative
g.right(3); g.right(4); g.right(8); g.right(9);
assert.equal(g.els.mines.textContent, '-1');
// Blocked: left click on a flag or question mark does nothing
g.tap(3);
assert.equal(run('board.cells[3].open'), false);
g.right(3); // question
g.tap(3);
assert.equal(run('board.cells[3].open'), false);

// Timer: stays 0 before the first reveal; counts whole seconds while playing; caps at 999
g.button('new');
run('step(5000); render()');
assert.deepEqual([run('elapsed'), g.els.time.textContent], [0, '0']);
rnd = 0.5;
g.tap(40);
run('step(999); render()');
assert.equal(g.els.time.textContent, '0');
run('step(1); render()');
assert.equal(g.els.time.textContent, '1');
run('step(2500); render()');
assert.equal(g.els.time.textContent, '3');
run('elapsed = 998500; step(100); render()');
assert.equal(g.els.time.textContent, '998');
run('for (let k = 0; k < 100; k++) step(100); render()');
assert.equal(g.els.time.textContent, '999');

// rAF: the loop renders and re-queues; dt is capped at 100 ms
const r0 = g.rafs.length;
assert.equal(r0, 1);
run('elapsed = 0');
g.rafs[0](1000); // first frame: no step
g.rafs[1](6000); // a 5 s gap counts as 100 ms
assert.deepEqual([g.rafs.length, run('elapsed')], [3, 100]);
g.rafs[2](6050);
assert.equal(run('elapsed'), 150);
let t0 = g.touches.n;
g.rafs[3](6150); // 250 ms: still shows 0, so no render
assert.equal(g.touches.n, t0, 'frame rendered with no change in shown time');
run('elapsed = 950');
g.rafs[4](6250); // crosses 1 s: renders
assert.equal(g.els.time.textContent, '1');
t0 = g.touches.sets;
run('render()');
assert.equal(g.touches.sets, t0, 'render() rewrote an unchanged attribute');

// Mine (shell): lost, all mines shown, clicked mine marked, wrong flags marked, timer stops, input ignored
g.setBoard(5, 3, [2, 7, 12]);
g.right(7);  // right flag
g.right(3);  // wrong flag
g.tap(0);
g.tap(2);
assert.equal(run('status(board)'), 'lost');
assert.deepEqual([g.cell(2).className, g.cell(2).textContent, g.cell(2).getAttribute('aria-label')], ['cell mine boom', '●', 'Row 1, column 3, exploded mine']);
assert.deepEqual([g.cell(12).className, g.cell(12).textContent], ['cell mine', '●']);
assert.deepEqual([g.cell(7).className, g.cell(7).textContent], ['cell flag', '⚑']);
assert.deepEqual([g.cell(3).className, g.cell(3).textContent, g.cell(3).getAttribute('aria-label')], ['cell wrong', '✕', 'Row 1, column 4, wrong flag']);
assert.equal(g.els.status.textContent, 'A mine went off. Press New game to try again.');
let snap = run('JSON.stringify(board)');
run('step(3000)');
assert.equal(run('elapsed'), 0, 'timer ran after loss');
g.tap(4); g.right(4); g.tap(1); g.touch(4); run('step(500)');
assert.equal(run('JSON.stringify(board)'), snap, 'board input after loss');
g.listeners.pointerup({ pointerId: 5 });
g.touch(4, 6); g.listeners.pointerup({ pointerId: 6 }); // the next press clears the fired long press's suppress
assert.deepEqual([run('suppress'), run('press')], [false, null]);
// a question-marked mine still shows as a mine after a loss
g.setBoard(5, 3, [2, 7, 12]);
g.right(12); g.right(12);
g.tap(2);
assert.deepEqual([run('board.cells[12].mark'), g.cell(12).className, g.cell(12).textContent], ['question', 'cell mine', '●']);

// Chord (shell): a left click on a revealed number with matching flags opens around it; wrong flag loses
g.setBoard(3, 3, [0, 2]);
g.tap(4);
g.right(0);
g.tap(4); // one flag of two: nothing
assert.deepEqual(g.opened(), [4]);
g.right(2);
g.tap(4);
assert.equal(run('status(board)'), 'won');
g.setBoard(3, 3, [0, 2]);
g.tap(4); g.right(0); g.right(1); g.tap(4);
assert.equal(run('status(board)'), 'lost');

// Win (shell): mines shown as flags, counter 0, timer stops, input ignored, status says so
g.setBoard(5, 3, [2, 7, 12]);
g.right(3); // flagged safe cell: never opened, so it must be unmarked before the win
g.tap(0);
run('step(4200)');
g.right(3); g.right(3); // flag -> question -> hidden
g.right(12); g.right(12); // a question-marked mine becomes a flag on the win
g.tap(4);
assert.equal(run('status(board)'), 'won');
assert.ok([2, 7, 12].every(i => g.cell(i).className === 'cell flag'));
assert.deepEqual([g.els.mines.textContent, g.els.time.textContent, g.els.status.textContent], ['0', '4', 'You cleared the field in 4 seconds.']);
snap = run('JSON.stringify(board)');
run('step(3000)');
g.right(2); g.tap(2); g.key('KeyF');
assert.equal(run('JSON.stringify(board)'), snap, 'board input after win');
assert.equal(run('elapsed'), 4200, 'timer ran after win');
// one second: singular
g.setBoard(3, 3, [0, 2]);
g.tap(4); g.right(0); g.right(2);
run('elapsed = 1500');
g.tap(4);
assert.equal(g.els.status.textContent, 'You cleared the field in 1 second.');

// #status (aria-live) is written only when its text changes
const w0 = g.writes.status;
run('render(); render(); step(100); render()');
assert.equal(g.writes.status, w0);

// Difficulty: Medium 16x16/40, Hard 30x16/99; timer 0; class drives the column count
for (const [id, w, h, n] of [['medium', 16, 16, 40], ['hard', 30, 16, 99], ['easy', 9, 9, 10]]) {
  run('elapsed = 7000');
  g.button(id);
  assert.deepEqual(json('[board.w, board.h, board.mines, level, elapsed]'), [w, h, n, id, 0]);
  assert.equal(g.cells().length, w * h);
  assert.deepEqual([g.els.board.className, g.els.mines.textContent, g.els.time.textContent], [id, String(n), '0']);
  assert.equal(g.els.board.getAttribute('aria-label'), `Minefield board, ${w} by ${h}, ${n} mines`);
  assert.equal(g.els[id].getAttribute('aria-pressed'), 'true');
}
// Hard is 30 wide, 16 tall: the last cell of the first row is column 30, the last cell row 16
g.button('hard');
assert.equal(g.cell(29).getAttribute('aria-label'), 'Row 1, column 30, hidden');
assert.equal(g.cell(479).getAttribute('aria-label'), 'Row 16, column 30, hidden');
assert.match(html, /#board\.hard \{ --cols: 30; \}/);
rnd = 0.5;
g.tap(0);
assert.equal(json('board.cells.filter(c => c.mine).length'), 99);
// the rebuild is keyed on the level too, not only the cell count
const hardCell = g.cell(0);
run("level = 'medium'; render()"); // same 480 cells, another level
assert.deepEqual([g.els.board.className, g.cells().length], ['medium', 480]);
assert.notEqual(g.cell(0), hardCell, 'cells not rebuilt for a new level');
run("level = 'hard'; render()");
// inherited names are not difficulties
g.click({ id: 'constructor' });
assert.equal(run('level'), 'hard');

// Reset: New game keeps the difficulty, fresh board, timer 0, counter = mines; same cell elements reused
run('step(3000)');
g.right(5);
const el0 = g.cell(0);
g.button('new');
assert.deepEqual(json('[level, board.placed, elapsed, board.cells.some(c => c.open || c.mark)]'), ['hard', false, 0, false]);
assert.deepEqual([g.els.mines.textContent, g.els.time.textContent, g.els.status.textContent], ['99', '0', '']);
assert.equal(g.cell(0), el0);
g.key('KeyN'); // N also starts a new game
assert.equal(run('board.placed'), false);

// Keys: F marks the focused cell; repeats and modified keys are left alone
g.button('easy');
const pk = g.prevented();
g.cell(3).focus();
g.key('KeyF');
assert.equal(run('board.cells[3].mark'), 'flag');
g.key('KeyF', { repeat: true }); g.key('KeyF', { ctrlKey: true });
assert.equal(run('board.cells[3].mark'), 'flag');
g.els.new.focus(); g.key('KeyF'); // focus off the board: nothing
run('elapsed = 1');
g.key('KeyN', { metaKey: true });
assert.equal(run('elapsed'), 1, 'Cmd+N reset the game');
assert.equal(g.prevented(), pk);

// Long press: touch held >= 450 ms without moving > 10 px cycles the mark and swallows the click that follows
g.button('new');
g.touch(10);
run('step(449)');
assert.equal(run('board.cells[10].mark'), '');
run('step(1)');
assert.equal(run('board.cells[10].mark'), 'flag');
g.listeners.pointerup({ pointerId: 5 });
g.tap(10);
assert.deepEqual([run('board.placed'), run('board.cells[10].mark'), run('suppress')], [false, 'flag', false]);
run('render()');
assert.equal(g.cell(10).className, 'cell flag');
// released early: normal click
g.touch(20);
run('step(300)');
g.listeners.pointerup({ pointerId: 5 });
run('step(500)');
assert.equal(run('board.cells[20].mark'), '');
rnd = 0.5;
g.tap(20);
assert.equal(run('board.cells[20].open'), true);
// moved more than 10 px: no mark; 10 px or less: still a long press
g.button('new');
g.touch(30);
g.listeners.pointermove({ pointerId: 5, clientX: 58, clientY: 57 }); // ~10.6 px
run('step(600)');
assert.equal(run('board.cells[30].mark'), '');
g.touch(30);
g.listeners.pointermove({ pointerId: 5, clientX: 56, clientY: 58 }); // 10 px
g.listeners.pointermove({ pointerId: 9, clientX: 500, clientY: 500 }); // another pointer
run('step(450)');
assert.equal(run('board.cells[30].mark'), 'flag');
// pointercancel (browser took over to scroll) drops it; mouse and pen presses never long-press
g.touch(31);
g.listeners.pointercancel({ pointerId: 5 });
run('step(600)');
for (const pointerType of ['mouse', 'pen']) {
  g.listeners.pointerdown({ target: g.cell(31), button: 0, isPrimary: true, pointerType, pointerId: 1, clientX: 0, clientY: 0 });
  run('step(600)');
}
assert.equal(run('board.cells[31].mark'), '');
// a long press whose click never arrived doesn't eat the next tap
g.touch(40);
run('step(450)');
g.listeners.pointerup({ pointerId: 5 });
g.touch(0, 6);
g.listeners.pointerup({ pointerId: 6 });
g.tap(0);
assert.equal(run('board.placed'), true);
// a long press marks exactly once, whether the browser's contextmenu comes during the press or after it fired
g.button('new');
g.touch(10);
g.right(10);
assert.equal(run('board.cells[10].mark'), '', 'contextmenu marked during a touch press');
run('step(450)');
g.right(10);
assert.equal(run('board.cells[10].mark'), 'flag');
g.listeners.pointerup({ pointerId: 5 });
g.tap(10);
assert.equal(run('board.cells[10].mark'), 'flag');
// a long press with no click after it doesn't swallow a keyboard click (detail 0) or the ContextMenu key
g.touch(20);
run('step(450)');
g.listeners.pointerup({ pointerId: 5 });
rnd = 0.5;
g.listeners.click({ target: g.cell(40), detail: 0 });
assert.equal(run('board.cells[40].open'), true, 'keyboard click swallowed');
g.button('new');
g.touch(20);
run('step(450)');
g.listeners.pointerup({ pointerId: 5 });
g.key('ContextMenu');
g.right(21);
assert.equal(run('board.cells[21].mark'), 'flag', 'ContextMenu key swallowed');
// Mac Ctrl+click: pointerdown (button 0 + ctrlKey), contextmenu, click with ctrlKey -> marks, doesn't reveal
// (from a question mark, so the mark clears and a reveal would not be blocked)
g.button('new');
g.right(30); g.right(30);
g.listeners.pointerdown({ target: g.cell(30), button: 0, ctrlKey: true, isPrimary: true, pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0 });
g.right(30);
g.listeners.click({ target: g.cell(30), ctrlKey: true, detail: 1 });
assert.deepEqual([run('board.cells[30].mark'), run('board.placed')], ['', false]);
// a pending long press is dropped by New game and by a difficulty switch
for (const id of ['new', 'medium']) {
  g.touch(10);
  g.button(id);
  run('step(500)');
  assert.ok(json('board.cells.every(c => !c.mark)'), `long press survived ${id}`);
}
g.button('easy');

// Context menu: prevented on the board (cells and gaps), left alone elsewhere
const onBoard = { closest: (s) => (s === '#board' ? {} : null) }, outside = { closest: () => null };
let p = g.prevented();
g.listeners.contextmenu({ target: onBoard, preventDefault: () => p++ });
g.listeners.contextmenu({ target: outside, preventDefault: () => p++ });
assert.equal(p, g.prevented() + 1);

// render() leaves state alone
const s0 = run('JSON.stringify([board, level, elapsed, press, suppress])');
run('render(); render()');
assert.equal(run('JSON.stringify([board, level, elapsed, press, suppress])'), s0);

console.log('all minefield tests passed');
