// Self-check for molebop.html: runs its <script> in node:vm with a stub DOM and asserts the rules in spec-molebop-whack-game.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./molebop.html', import.meta.url), 'utf8');

// Page: one bare <script>, DOM buttons (no canvas, setInterval, sound or assets), aria-live status, Start button
assert.equal(html.match(/<script/g).length, 1);
for (const banned of ['setInterval', '<canvas', '<audio', 'Audio(', 'src=', 'href=', '<img']) assert.ok(!html.includes(banned), banned);
assert.match(html, /<title>Molebop<\/title>/);
assert.match(html, /id="status" aria-live="polite"/);
assert.match(html, /id="field" role="group" aria-label="[^"]+"/);
assert.match(html, /<button id="start">Start<\/button>/);
assert.match(html, /requestAnimationFrame\(frame\)/);

// DOM stub: one persistent element per id (every id must exist in the markup); `w.n` counts every DOM write
function makeDoc() {
  const els = {}, listeners = {}, w = { n: 0, looks: 0 }; // looks: getElementById calls, a sign render() ran
  const node = (id, tag) => {
    let text = '', cls = '', hidden, inert;
    const attrs = {};
    return {
      id, tag, children: [],
      get textContent() { return text; },
      set textContent(v) { text = String(v); w.n++; },
      get className() { return cls; },
      set className(v) { cls = v; w.n++; },
      get hidden() { return hidden; },
      set hidden(v) { hidden = v; w.n++; },
      get inert() { return inert; },
      set inert(v) { inert = v; w.n++; },
      setAttribute(k, v) { attrs[k] = String(v); w.n++; },
      getAttribute(k) { return attrs[k] ?? null; },
      appendChild(c) { this.children.push(c); return c; },
    };
  };
  const document = {
    getElementById: (id) => {
      w.looks++;
      assert.ok(html.includes(`id="${id}"`), `no element with id="${id}"`);
      return (els[id] ??= node(id));
    },
    createElement: (tag) => node(undefined, tag),
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  return { document, els, listeners, w };
}

// Math.random: queued values first, then `rdef`; `calls` counts draws (a pop draws 3: hole, kind, up time)
let rq = [], rdef = 0.5, calls = 0;
const stubMath = Object.assign(Object.create(Math), { random: () => (calls++, rq.length ? rq.shift() : rdef) });
const memStorage = (s) => ({ getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = String(v); } });

function game(globals = {}) {
  const d = makeDoc(), rafs = [];
  const g = load('./molebop.html', { document: d.document, Math: stubMath, requestAnimationFrame: (fn) => rafs.push(fn), ...globals });
  d.document.getElementById('start'); // the script never looks it up; clicks read only its id
  const json = (expr) => JSON.parse(g.run(`JSON.stringify(${expr})`));
  const hole = (i) => g.run(`holeEls[${i}]`);
  const mole = (i) => g.run(`moleEls[${i}]`);
  let prevented = 0;
  const down = (i, button = 0) => d.listeners.pointerdown({ target: hole(i), button });
  const click = (target, detail = 1) => d.listeners.click({ target, detail });
  const key = (code, mods = {}) => d.listeners.keydown({ code, repeat: false, preventDefault: () => prevented++, ...mods });
  const put = (i, kind, up = 5000) => g.run(`holes[${i}] = { kind: '${kind}', up: ${up} }; render()`);
  const text = (id) => d.els[id].textContent;
  return { ...g, ...d, rafs, json, hole, mole, down, click, key, put, text, prevented: () => prevented };
}

// ---- Opening page: ready panel with Start, Time 30, Score 0, Best 0, no mole up ----
let g = game();
assert.equal(g.run('phase'), 'ready');
assert.deepEqual([g.text('time'), g.text('score'), g.text('best')], ['30', '0', '0']);
assert.deepEqual([g.els.panel.hidden, g.els.field.inert], [false, true]);
assert.equal(g.text('status'), '');
assert.ok(g.text('message').includes('30 seconds'));
assert.equal(g.els.field.children.length, 9);
assert.ok(g.els.field.children.every((b, i) => b.tag === 'button' && b.className === 'hole'
  && b.getAttribute('aria-label') === `Hole ${i + 1}, empty` && b.children.length === 1 && b.children[0].className === 'mole'));
assert.ok(g.json('holes').every(h => h === null));
assert.equal(g.rafs.length, 1);

// ---- Input outside `playing` is ignored: no penalty, no score, no pops ----
const holeState = (x) => x.json('[score, holes, phase]');
const idle = (x) => {
  const before = holeState(x);
  x.put(2, 'mole');
  x.down(2); x.click(x.hole(2), 0); x.key('Digit3'); x.key('Numpad9');
  x.down(5); x.key('Digit6');
  x.run('holes[2] = null');
  assert.deepEqual(holeState(x), before);
  const c = calls;
  x.run('step(5000)');
  assert.equal(calls, c, 'stepped while not playing');
};
idle(g);

// ---- Start: the button begins a round; panel hides; a second click while playing does nothing ----
g.click(g.els.start);
assert.equal(g.run('phase'), 'playing');
assert.deepEqual([g.els.panel.hidden, g.els.field.inert], [true, false]);
g.run('score = 3');
g.click(g.els.start);
assert.equal(g.run('score'), 3);
// Space and Enter start only when not playing, and are prevented then (no scroll, no doubled click)
g = game();
g.key('Space');
assert.deepEqual([g.run('phase'), g.prevented()], ['playing', 1]);
g.run('score = 4');
g.key('Space'); g.key('Enter');
assert.deepEqual([g.run('score'), g.prevented()], [4, 1]);
g = game();
g.key('Enter');
assert.equal(g.run('phase'), 'playing');
g = game();
g.key('NumpadEnter');
assert.deepEqual([g.run('phase'), g.prevented()], ['playing', 1]);
// held Space / Enter / NumpadEnter: repeats are prevented (no native click storm on a focused hole) and do nothing else
g.run('score = 2');
for (const code of ['Space', 'Enter', 'NumpadEnter']) g.key(code, { repeat: true });
g.key('Digit1', { repeat: true }); // other repeats are left alone
assert.deepEqual([g.run('score'), g.prevented()], [2, 4]);
g.run("end('time'); render()"); // held Enter from the end screen doesn't restart either
g.key('Enter', { repeat: true });
assert.deepEqual([g.run('phase'), g.prevented()], ['over', 5]);
g = game();
g.key('Space', { repeat: true }); g.key('Enter', { ctrlKey: true }); g.key('Space', { shiftKey: true });
assert.equal(g.run('phase'), 'ready');

// ---- Spawns: first pop 500 ms after Start, then every 800 ms; every 450 ms once time left <= 10 s ----
g = game();
g.click(g.els.start);
rdef = 0.5;
g.run('step(499)');
assert.ok(g.json('holes').every(h => h === null));
calls = 0;
g.run('step(1)');
assert.equal(calls, 3);
assert.equal(g.json('holes').filter(Boolean).length, 1);
// whole round in 50 ms steps: record when each pop happens
g = game();
g.click(g.els.start);
const pops = [];
for (let t = 50; t <= 30000; t += 50) {
  calls = 0;
  g.run('step(50)');
  for (let k = 0; k < calls / 3; k++) pops.push(t);
}
const want = [];
for (let t = 500; t < 30000; t += 30000 - t <= 10000 ? 450 : 800) want.push(t);
assert.deepEqual(pops, want);
assert.ok(want.includes(20500) && want.includes(20950) && want.includes(19700) && !want.includes(20400), 'switch at 10 s left');
assert.equal(g.run('phase'), 'over');

// ---- Up time: 700 + rand * 500 ms; an untouched mole goes down with no score change ----
g = game();
g.click(g.els.start);
rq = [0, 0.5, 0]; // hole 0, normal, rand 0 -> 700 ms
g.run('step(500)');
assert.deepEqual(g.json('holes[0]'), { kind: 'mole', up: 700 });
g.run('step(100); step(100); step(100); step(100); step(100); step(100); step(99)');
assert.equal(g.json('holes[0]').kind, 'mole');
g.run('step(1)');
assert.deepEqual([g.json('holes[0]'), g.run('score')], [null, 0]);
rq = [0, 0.5, 0.9999]; // rand -> 1: just under 1200 ms
g.run('popIn = 1; step(1)');
const up = g.run('holes[0].up');
assert.ok(up > 1199 && up < 1200, String(up));
// random empty hole: with holes 0-2 up, rand 0 picks hole 3 and rand 0.99 the last empty hole
g.run("holes = [{kind:'mole',up:9e3},{kind:'mole',up:9e3},{kind:'mole',up:9e3},null,null,null,null,null,null]");
rq = [0, 0.5, 0.5]; g.run('pop()');
rq = [0.99, 0.5, 0.5]; g.run('pop()');
assert.deepEqual(g.json('holes.map(Boolean)'), [true, true, true, true, false, false, false, false, true]);

// ---- Kind per pop: golden 10%, bomb 10%, normal 80% ----
for (const [r, kind] of [[0, 'golden'], [0.0999, 'golden'], [0.1, 'bomb'], [0.1999, 'bomb'], [0.2, 'mole'], [0.9999, 'mole']]) {
  g.run('holes = Array(9).fill(null)');
  rq = [0, r, 0.5];
  g.run('pop()');
  assert.equal(g.json('holes[0].kind'), kind, String(r));
}

// ---- Full field: a due pop is skipped and its timer restarts ----
g.run("holes = Array.from({ length: 9 }, () => ({ kind: 'mole', up: 9000 })); popIn = 1; timeLeft = 20000");
calls = 0;
g.run('step(1)');
assert.deepEqual([calls, g.run('popIn'), g.json('holes').every(Boolean)], [0, 800, true]);
g.run('popIn = 1; timeLeft = 10002; step(1)'); // 10001 left at the pop: still slow
assert.equal(g.run('popIn'), 800);
g.run('popIn = 1; timeLeft = 10001; step(1)'); // exactly 10 s left: fast
assert.equal(g.run('popIn'), 450);

// ---- Hits and misses ----
g = game();
g.click(g.els.start);
g.put(4, 'mole');
g.key('Digit5');
assert.deepEqual([g.run('score'), g.json('holes[4]'), g.text('score')], [1, null, '1']);
g.put(2, 'golden');
g.down(2);
assert.deepEqual([g.run('score'), g.json('holes[2]'), g.text('score')], [6, null, '6']);
g.down(2); // empty: -1
assert.equal(g.run('score'), 5);
g.put(3, 'mole');
g.down(3, 2); // right button: nothing
assert.deepEqual([g.run('score'), g.json('holes[3].kind')], [5, 'mole']);
g.click(g.hole(3)); // a pointer click (detail 1) already whacked on pointerdown
assert.equal(g.run('score'), 5);
g.click(g.hole(3), 0); // keyboard click (Enter / Space on the focused hole)
assert.deepEqual([g.run('score'), g.json('holes[3]')], [6, null]);
g.run('score = 0');
g.down(0); g.key('Digit1');
assert.equal(g.run('score'), 0, 'miss went below 0');

// ---- Bomb: ends the round at the current score, clears the field, updates best ----
g = game({ localStorage: memStorage({}) });
g.click(g.els.start);
g.run('score = 7');
g.put(0, 'mole'); g.put(8, 'bomb');
g.down(8);
assert.deepEqual(g.json('[phase, reason, score, best]'), ['over', 'bomb', 7, 7]);
assert.ok(g.json('holes').every(h => h === null));
assert.deepEqual([g.els.panel.hidden, g.els.field.inert], [false, true]);
assert.equal(g.text('status'), 'Boom! A bomb ended the round. You scored 7. Best: 7.');
assert.equal(g.text('message'), g.text('status'));
assert.deepEqual([g.text('best'), g.hole(0).className, g.hole(8).getAttribute('aria-label')], ['7', 'hole', 'Hole 9, empty']);
idle(g);
g.click(g.els.start); // Start from `over` begins a fresh round
assert.deepEqual(g.json('[phase, reason, score, timeLeft, popIn, holes.every(h => h === null)]'), ['playing', '', 0, 30000, 500, true]);
assert.deepEqual([g.text('score'), g.text('time'), g.text('status'), g.els.panel.hidden, g.els.field.inert], ['0', '30', '', true, false]);

// ---- Time up: 30 s of step time ends the round; Start begins a fresh one with score 0 and Time 30 ----
g = game();
g.click(g.els.start);
g.run('score = 3');
for (let k = 0; k < 299; k++) g.run('step(100)');
assert.equal(g.run('phase'), 'playing');
g.run('render()');
assert.equal(g.text('time'), '1');
g.run('step(100)');
assert.deepEqual(g.json('[phase, reason, timeLeft, best]'), ['over', 'time', 0, 3]);
assert.ok(g.json('holes').every(h => h === null));
g.run('render()');
assert.equal(g.text('status'), "Time's up! You scored 3. Best: 3.");
assert.equal(g.text('time'), '0');
const els0 = g.els.field.children.slice();
g.key('Enter');
assert.deepEqual(g.json('[phase, score, timeLeft, popIn]'), ['playing', 0, 30000, 500]);
assert.deepEqual([g.text('score'), g.text('time'), g.text('status'), g.els.panel.hidden], ['0', '30', '', true]);
assert.ok(g.els.field.children.length === 9 && els0.every((el, i) => g.hole(i) === el), 'hole elements not reused');

// ---- Countdown shows ceil(timeLeft / 1000) ----
for (const [left, shownT] of [[30000, '30'], [29999, '30'], [29000, '29'], [10001, '11'], [10000, '10'], [1, '1']]) {
  g.run(`timeLeft = ${left}; render()`);
  assert.equal(g.text('time'), shownT, String(left));
}

// ---- Hole looks and labels: golden and bomb differ by glyph, not only colour ----
g = game();
g.click(g.els.start);
g.put(0, 'mole'); g.put(2, 'golden'); g.put(6, 'bomb');
assert.deepEqual([0, 2, 6].map(i => [g.hole(i).className, g.mole(i).className, g.mole(i).textContent, g.hole(i).getAttribute('aria-label')]), [
  ['hole up', 'mole mole', '', 'Hole 1, mole'],
  ['hole up', 'mole golden', '★', 'Hole 3, golden mole'],
  ['hole up', 'mole bomb', '✸', 'Hole 7, bomb'],
]);
g.run('holes[2] = null; render()'); // going down: hole loses `up`, mole keeps its look while sliding
assert.deepEqual([g.hole(2).className, g.mole(2).className, g.mole(2).textContent, g.hole(2).getAttribute('aria-label')],
  ['hole', 'mole golden', '★', 'Hole 3, empty']);

// ---- render() writes only what changed, and is read-only ----
let n = g.w.n;
g.run('render(); render()');
assert.equal(g.w.n, n, 'render rewrote unchanged DOM');
const state = g.json('[phase, reason, score, best, timeLeft, popIn, holes]');
g.run('render()');
assert.deepEqual(g.json('[phase, reason, score, best, timeLeft, popIn, holes]'), state);
g.put(4, 'mole');
assert.equal(g.w.n, n + 3, 'one new mole: hole class, label, mole class'); // glyph '' already ''

// ---- rAF: re-queues, caps dt at 100 ms, renders only when what it shows changes ----
g = game();
g.click(g.els.start);
rdef = 0.5;
g.rafs[0](1000); // first frame: no step
assert.deepEqual([g.rafs.length, g.run('timeLeft')], [2, 30000]);
g.rafs[1](6000); // a 5 s gap counts as 100 ms
assert.equal(g.run('timeLeft'), 29900);
n = g.w.n;
const looks = g.w.looks;
g.rafs[2](6100); g.rafs[3](6200); g.rafs[4](6300); // 29.6 s left, nothing popped yet: no render
assert.deepEqual([g.w.n, g.w.looks], [n, looks], 'frame rendered with nothing changed');
g.rafs[5](6400); // 500 ms in: first pop renders
assert.ok(g.w.n > n);
assert.equal(g.json('holes').filter(Boolean).length, 1);
n = g.w.n;
g.rafs[6](6500); g.rafs[7](6600); g.rafs[8](6700); g.rafs[9](6800); // 29.1 s left
assert.equal(g.w.n, n);
g.rafs[10](6900); // 29.0 s: Time ticks to 29
assert.equal(g.text('time'), '29');

// ---- Keys: Digit1-9 in reading order, Numpad1-9 in pad layout (Numpad7 top-left); modified and repeated keys ignored ----
g = game();
g.click(g.els.start);
for (const [code, i] of [['Digit1', 0], ['Digit3', 2], ['Digit9', 8], ['Numpad7', 0], ['Numpad9', 2], ['Numpad5', 4], ['Numpad1', 6], ['Numpad3', 8]]) {
  g.run('holes = Array(9).fill(null); score = 0');
  g.put(i, 'mole');
  g.key(code);
  assert.deepEqual([g.run('score'), g.json(`holes[${i}]`)], [1, null], code);
}
g.run('holes = Array(9).fill(null); score = 0');
g.put(0, 'mole');
for (const mods of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) g.key('Digit1', mods);
g.key('Digit0'); g.key('KeyA'); g.key('Numpad0');
assert.deepEqual([g.run('score'), g.json('holes[0].kind')], [0, 'mole']);

// ---- Best: read at load, saved only when beaten; junk, throwing or missing storage reads as 0 ----
const store = { 'molebop-best': '12' };
const endAt = (x, s) => { x.click(x.els.start); x.run(`score = ${s}`); x.run('for (let k = 0; k < 300; k++) step(100); render()'); };
g = game({ localStorage: memStorage(store) });
assert.deepEqual([g.run('best'), g.text('best')], [12, '12']);
endAt(g, 15);
assert.deepEqual([store['molebop-best'], g.text('best'), g.run('phase')], ['15', '15', 'over']);
g = game({ localStorage: memStorage(store) });
endAt(g, 9);
assert.deepEqual([store['molebop-best'], g.text('best')], ['15', '15']);
store['molebop-best'] = '12';
g = game({ localStorage: memStorage(store) });
endAt(g, 9);
assert.deepEqual([store['molebop-best'], g.text('best')], ['12', '12']);
assert.deepEqual(Object.keys(store), ['molebop-best'], 'saved something besides the best');
assert.equal(game({ localStorage: { getItem: () => 'junk', setItem() {} } }).run('best'), 0);
const boom = () => { throw new Error('SecurityError'); };
for (const globals of [{ localStorage: { getItem: boom, setItem: boom } }, {}]) {
  const b = game(globals);
  assert.equal(b.run('best'), 0);
  endAt(b, 4);
  assert.deepEqual([b.run('best'), b.text('best')], [4, '4']);
}

console.log('all molebop tests passed');
