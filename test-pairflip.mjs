// Self-check for pairflip.html: runs its <script> in node:vm with a stub DOM and asserts the rules in spec-pairflip-memory-game.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./pairflip.html', import.meta.url), 'utf8');

// Page: one bare <script>, DOM buttons (no canvas, timers, sound, assets, saved scores or emoji), 3D flip, reduced motion
assert.equal(html.match(/<script/g).length, 1);
for (const banned of ['setTimeout', 'setInterval', '<canvas', '<audio', 'Audio(', 'src=', 'href=', 'localStorage']) assert.ok(!html.includes(banned), banned);
assert.ok(!/\p{Extended_Pictographic}/u.test(html), 'emoji in page');
assert.match(html, /<title>Pairflip<\/title>/);
assert.match(html, /id="status" aria-live="polite"/);
assert.match(html, /<div id="win" hidden>/);
assert.match(html, /<button id="again">Play again<\/button>/);
assert.match(html, /\.card\.up \{ transform: perspective\(500px\) rotateY\(180deg\)/);
assert.match(html, /backface-visibility: hidden/);
assert.match(html, /content: attr\(data-face\)/);
assert.match(html, /@media \(prefers-reduced-motion: reduce\) \{ \.card \{ transition: none; \} \}/);
assert.match(html, /requestAnimationFrame\(frame\)/);

// DOM stub: one persistent element per id (every id must exist in the markup), created elements tracked as children
function makeDoc() {
  const els = {}, listeners = {}, focused = { el: null }, touches = { n: 0 }; // n: attribute reads/writes and text writes
  const node = (id, tag) => {
    const attrs = {};
    let text = '';
    return {
      id, tag, className: '', hidden: undefined, inert: undefined, children: [], parent: null,
      get textContent() { return text; },
      set textContent(v) { text = String(v); touches.n++; },
      setAttribute(k, v) { attrs[k] = String(v); touches.n++; },
      getAttribute(k) { touches.n++; return attrs[k] ?? null; },
      focus() { focused.el = this; },
      appendChild(c) { this.children.push(c); c.parent = this; return c; },
      remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; },
    };
  };
  const document = {
    getElementById: (id) => {
      assert.ok(html.includes(`id="${id}"`), `no element with id="${id}"`);
      return (els[id] ??= node(id));
    },
    createElement: (tag) => node(undefined, tag),
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  return { document, els, listeners, focused, touches };
}

let rand = () => 0; // rand 0: Fisher-Yates rotates left by one, so card i pairs with card i + n/2
const stubMath = Object.assign(Object.create(Math), { random: () => rand() }); // spread would be empty: Math's props are non-enumerable

function game() {
  const d = makeDoc(), rafs = [];
  const g = load('./pairflip.html', { document: d.document, Math: stubMath, requestAnimationFrame: (fn) => rafs.push(fn) });
  const json = (expr) => JSON.parse(g.run(`JSON.stringify(${expr})`)); // arrays cross the vm boundary badly
  const cards = () => d.els.board.children;
  const click = (target) => d.listeners.click({ target });
  const tap = (i) => click(cards()[i]);
  const button = (id) => { assert.ok(html.includes(`<button id="${id}"`), id); click(d.document.getElementById(id)); };
  const key = (code, o = {}) => d.listeners.keydown({ code, repeat: false, ...o });
  let t = 0;
  const tick = (ms) => { // one rAF frame ms after the last; each frame must queue the next
    const n = rafs.length;
    t += ms; rafs.at(-1)(t);
    assert.equal(rafs.length, n + 1, 'frame re-registers itself');
  };
  tick(0); // first frame: sets the clock, no step
  const ups = () => cards().flatMap((c, i) => (c.className.includes('up') ? [i] : []));
  const shown = () => [d.els.moves.textContent, d.els.time.textContent];
  return { ...g, ...d, rafs, json, cards, click, tap, button, key, tick, ups, shown };
}

// ---- Fisher-Yates ----
let g = game();
const { run } = g;
run('var seq = [], nextRand = () => seq.shift()');
assert.deepEqual(g.json('shuffle([1, 2, 3, 4], () => 0)'), [2, 3, 4, 1]);
assert.deepEqual(g.json('shuffle([1, 2, 3, 4], () => 0.999)'), [1, 2, 3, 4]);
assert.deepEqual(g.json('(seq = [0.5, 0.25, 0.9], shuffle([1, 2, 3, 4], nextRand))'), [4, 2, 1, 3]); // j = 2, 0, 1
assert.equal(run('(() => { const a = [1, 2]; return shuffle(a, () => 0) === a; })()'), true, 'in place');
assert.deepEqual(g.json('cards.map(c => c.face).join("")'), 'BCDEFGHABCDEFGHA', 'deck is the shuffled A-H pairs');

// Every letter exactly twice, A-H normal and A-R hard, over a seeded Math.random
let seed = 20261124;
rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const [m, letters] of [['normal', 'ABCDEFGH'], ['hard', 'ABCDEFGHIJKLMNOPQR']]) {
  run(`mode = '${m}'`);
  for (let rep = 0; rep < 50; rep++) {
    run('reset()');
    const faces = g.json('cards.map(c => c.face)');
    assert.deepEqual([...faces].sort().join(''), [...letters].flatMap(l => [l, l]).join(''), `${m} faces`);
  }
}
rand = () => 0;

// ---- Acceptance: page opens on 16 face-down cards, Moves 0, Time 0:00, win hidden ----
g = game();
const n = 16;
assert.equal(g.cards().length, n);
assert.ok(g.cards().every(c => c.tag === 'button' && c.className === 'card'));
assert.deepEqual(g.shown(), ['0', '0:00']);
assert.equal(g.els.win.hidden, true);
assert.equal(g.els.board.inert, false);
assert.equal(g.els.status.textContent, '');
assert.equal(g.els.board.className, 'normal');
assert.equal(g.els.board.getAttribute('aria-label'), 'Cards, 4 by 4');
assert.deepEqual(['normal', 'hard'].map(id => g.els[id].getAttribute('aria-pressed')), ['true', 'false']);
assert.equal(g.cards()[5].getAttribute('aria-label'), 'Row 2, column 2, face down');
assert.equal(g.cards()[0].getAttribute('data-face'), 'B');
const els0 = [...g.cards()];

// Timer stays at 0 before the first flip; quiet frames don't render
let t0 = g.touches.n;
g.tick(100); g.tick(100);
assert.equal(g.run('elapsed'), 0);
assert.equal(g.touches.n, t0, 'frame rendered with nothing changed');

// ---- First flip: face-up, timer starts, moves 0 ----
g.tap(0);
assert.deepEqual(g.ups(), [0]);
assert.equal(g.cards()[0].getAttribute('aria-label'), 'Row 1, column 1, B');
assert.equal(g.els.status.textContent, 'B');
t0 = g.touches.n;
g.tick(100); // timer runs but still shows 0:00: no render
assert.equal(g.touches.n, t0, 'frame rendered with no change in shown time');
assert.equal(g.run('elapsed'), 100);
assert.deepEqual(g.shown(), ['0', '0:00']);

// ---- Re-click a face-up card: ignored ----
g.tap(0);
assert.deepEqual([g.ups(), g.run('moves'), g.json('open')], [[0], 0, [0]]);

// ---- Mismatch: both up, moves +1; 799 ms still up, 800 ms both down (through frame, no click) ----
g.tap(1);
assert.deepEqual([g.ups(), g.shown()[0], g.run('hold')], [[0, 1], '1', 800]);
assert.equal(g.els.status.textContent, 'B and C, no match');
// Third click during the hold: ignored
g.tap(2);
assert.deepEqual([g.ups(), g.run('moves')], [[0, 1], 1]);
t0 = g.touches.n;
for (let k = 0; k < 7; k++) g.tick(100);
g.tick(99); // 799 ms
assert.deepEqual(g.ups(), [0, 1]);
assert.equal(g.touches.n, t0, 'hold frames rendered before the flip-back');
g.tick(1); // 800 ms
assert.ok(g.touches.n > t0, 'flip-back renders');
assert.deepEqual([g.ups(), g.json('open'), g.run('hold')], [[], [], 0]);
assert.equal(g.cards()[1].getAttribute('aria-label'), 'Row 1, column 2, face down');
assert.equal(g.run('elapsed'), 900);
assert.deepEqual(g.shown(), ['1', '0:00']);
g.tick(100); // timer keeps running while nothing is open
assert.deepEqual(g.shown(), ['1', '0:01']);

// dt is capped at 100 ms per frame
g.tick(5000);
assert.equal(g.run('elapsed'), 1100);

// ---- Match: both stay up as matched, moves +1, clicks open at once ----
g.tap(0); g.tap(8);
assert.deepEqual([g.ups(), g.shown()[0], g.json('open'), g.run('hold')], [[0, 8], '2', [], 0]);
assert.ok(g.cards()[0].className === 'card up matched' && g.cards()[8].className === 'card up matched');
assert.equal(g.cards()[8].getAttribute('aria-label'), 'Row 3, column 1, B, matched');
assert.equal(g.els.status.textContent, 'B and B, matched');
g.tap(3); // no hold after a match
assert.deepEqual(g.ups(), [0, 3, 8]);
// Re-click a matched card: ignored
g.tap(0);
assert.deepEqual([g.ups(), g.json('open'), g.run('moves')], [[0, 3, 8], [3], 2]);
g.tap(11); // completes E
assert.deepEqual(g.ups(), [0, 3, 8, 11]);

// Buttons are reused across moves
assert.ok(g.cards().every((c, i) => c === els0[i]), 'card buttons reused');

// ---- Win: match the rest; panel shows moves and time, timer frozen, clicks ignored ----
for (const i of [1, 2, 4, 5, 6, 7]) { g.tap(i); g.tap(i + 8); }
assert.equal(g.run('won()'), true);
const moves = g.run('moves'), elapsed = g.run('elapsed');
assert.equal(moves, 9);
assert.equal(g.els.win.hidden, false);
assert.equal(g.els.board.inert, true, 'cards leave the Tab order under the panel');
assert.equal(g.focused.el, g.els.again, 'winning flip focuses Play again');
assert.equal(g.els.result.textContent, `You found all 8 pairs in 9 moves and 0:01.`);
assert.equal(g.els.status.textContent, g.els.result.textContent);
for (let k = 0; k < 20; k++) g.tick(100);
assert.equal(g.run('elapsed'), elapsed, 'timer frozen');
assert.deepEqual(g.shown(), ['9', '0:01']);
g.run('cards[0].up = false'); // even a face-down card ignores clicks once won
g.tap(0);
assert.deepEqual([g.run('cards[0].up'), g.run('moves')], [false, 9]);

// Play again starts a new game: reshuffled, board live again, first card focused
rand = () => 0.999;
g.button('again');
assert.equal(g.json('cards.map(c => c.face).join("")'), 'ABCDEFGHABCDEFGH', 'Play again reshuffles');
rand = () => 0;
assert.equal(g.els.win.hidden, true);
assert.equal(g.els.board.inert, false);
assert.equal(g.focused.el, g.cards()[0], 'Play again focuses the first card');
assert.deepEqual([g.ups(), g.shown(), g.run('elapsed'), g.els.status.textContent], [[], ['0', '0:00'], 0, '']);
assert.ok(g.cards().every((c, i) => c === els0[i]), 'same count: buttons reused');

// ---- Restart during a hold: fresh deck, all down, moves 0, timer 0 and stopped ----
g.tap(0); g.tap(1); g.tick(100);
assert.ok(g.run('hold') > 0 && g.run('elapsed') > 0);
rand = () => 0.999; // a different deck shows a new shuffle ran
g.button('restart');
assert.deepEqual([g.ups(), g.shown(), g.run('hold'), g.json('open')], [[], ['0', '0:00'], 0, []]);
assert.equal(g.json('cards.map(c => c.face).join("")'), 'ABCDEFGHABCDEFGH');
assert.equal(g.cards()[0].getAttribute('data-face'), 'A');
g.tick(100); g.tick(100);
assert.equal(g.run('elapsed'), 0, 'timer stopped after restart');
rand = () => 0;

// ---- Key R: restart; repeat or modified ignored ----
g.tap(0);
for (const o of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
  g.key('KeyR', o);
  assert.deepEqual(g.ups(), [0], JSON.stringify(o));
}
g.key('KeyN');
assert.deepEqual(g.ups(), [0]);
g.key('KeyR');
assert.deepEqual([g.ups(), g.shown()], [[], ['0', '0:00']]);
assert.equal(g.json('cards.map(c => c.face).join("")'), 'BCDEFGHABCDEFGHA');

// ---- Hard mode: 36 cards, new game; Normal goes back to 16 ----
g.tap(0);
g.button('hard');
assert.equal(g.cards().length, 36);
assert.equal(g.els.board.className, 'hard');
assert.equal(g.els.board.getAttribute('aria-label'), 'Cards, 6 by 6');
assert.deepEqual(['normal', 'hard'].map(id => g.els[id].getAttribute('aria-pressed')), ['false', 'true']);
assert.deepEqual([g.ups(), g.shown()], [[], ['0', '0:00']]);
assert.equal(g.json('cards.map(c => c.face).join("")'), 'BCDEFGHIJKLMNOPQRABCDEFGHIJKLMNOPQRA');
assert.equal(g.cards()[7].getAttribute('aria-label'), 'Row 2, column 2, face down');
for (let i = 0; i < 18; i++) { g.tap(i); g.tap(i + 18); }
assert.equal(g.els.result.textContent, 'You found all 18 pairs in 18 moves and 0:00.');
// Play again, Restart and R stay in Hard
const hardEls = [...g.cards()];
for (const act of [() => g.button('again'), () => g.button('restart'), () => g.key('KeyR')]) {
  act();
  assert.deepEqual([g.cards().length, g.els.board.className, g.run('mode'), g.els.win.hidden], [36, 'hard', 'hard', true]);
  assert.ok(g.cards().every((c, i) => c === hardEls[i]), 'hard buttons reused');
}
g.button('normal');
assert.equal(g.cards().length, 16);
assert.equal(g.els.board.className, 'normal');
assert.deepEqual([g.els.win.hidden, g.ups(), g.shown()], [true, [], ['0', '0:00']]);
assert.ok(g.cards().every(c => c.parent === g.els.board) && g.els.board.children.length === 16, 'old buttons removed');

// ---- Time shows m:ss ----
assert.deepEqual(g.json('[0, 999, 1000, 59999, 60000, 605000].map(clock)'), ['0:00', '0:00', '0:01', '0:59', '1:00', '10:05']);

console.log('all pairflip tests passed');
