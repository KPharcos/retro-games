// Self-check for snake.html: runs its <script> in node:vm with a stub DOM and asserts the rules in spec-snake-game.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./snake.html', import.meta.url), 'utf8');
const { run, key, listeners, texts } = load('./snake.html');
const json = (expr) => JSON.parse(run(`JSON.stringify(${expr})`)); // arrays cross the vm boundary badly
const head = () => json('snake[0]');
const rendered = () => { texts.length = 0; run('render()'); return texts; };

// Page: 400x400 canvas with role="img" and a label, aria-live status, one bare <script>, no setInterval
assert.match(html, /<canvas[^>]*\bwidth="400"[^>]*\bheight="400"[^>]*role="img"[^>]*aria-label="[^"]+"/);
assert.match(html, /id="status" aria-live="polite"/);
assert.equal(html.match(/<script/g).length, 1);
assert.ok(!html.includes('setInterval'));

// Start
run('reset()');
assert.deepEqual(json('snake'), [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
assert.deepEqual([json('dir'), run('score'), run('speed'), run('over'), run('paused')], [[1, 0], 0, 8, false, false]);
assert.ok(rendered().includes('Score: 0') && texts.includes('High: 0'));

// Tick timing: 1000/8 = 125 ms per move
run('reset(); food = { x: 0, y: 0 }');
run('step(124)');
assert.deepEqual(head(), { x: 10, y: 10 });
run('step(1)');
assert.deepEqual(head(), { x: 11, y: 10 });
assert.equal(run('snake.length'), 3);

// Steering: arrows and WASD
for (const [code, d] of [['ArrowUp', [0, -1]], ['KeyS', [0, 1]], ['KeyD', [1, 0]], ['KeyW', [0, -1]]]) {
  run('reset()'); key(code);
  assert.deepEqual(json('nextDir'), d, code);
}
run('reset(); food = { x: 0, y: 0 }'); key('KeyW'); run('tick()'); key('KeyA'); run('tick()');
assert.deepEqual(head(), { x: 9, y: 9 });
run('reset(); food = { x: 0, y: 0 }'); key('ArrowDown'); run('tick()');
assert.deepEqual(head(), { x: 10, y: 11 });
key('ArrowUp');
assert.deepEqual(json('nextDir'), [0, 1], 'vertical reverse (ArrowUp) accepted');
key('KeyW');
assert.deepEqual(json('nextDir'), [0, 1], 'vertical reverse (KeyW) accepted');
key('ArrowLeft');
assert.deepEqual(json('nextDir'), [-1, 0]);

// Reverse ignored (arrow and WASD)
run('reset()'); key('ArrowLeft'); key('KeyA');
assert.deepEqual(json('nextDir'), [1, 0]);

// Space mid-run is a no-op, live or paused
run('reset(); food = { x: 0, y: 0 }; tick()');
const live = run('JSON.stringify([snake, score, food])');
key('Space');
assert.equal(run('JSON.stringify([snake, score, food])'), live, 'Space reset a live run');
key('KeyP'); key('Space');
assert.deepEqual([run('paused'), run('JSON.stringify([snake, score, food])')], [true, live], 'Space reset a paused run');

// keydown without a code (synthetic event) neither throws nor changes state
run('reset(); food = { x: 0, y: 0 }');
const noCode = run('JSON.stringify([snake, dir, nextDir, paused, wrap, over])');
listeners.keydown({ preventDefault() {} });
assert.equal(run('JSON.stringify([snake, dir, nextDir, paused, wrap, over])'), noCode);

// Quick double key: Up queued, Left rejected (checked against last move, right)
run('reset(); food = { x: 0, y: 0 }'); key('ArrowUp'); key('ArrowLeft');
assert.deepEqual(json('nextDir'), [0, -1]);
run('tick()');
assert.deepEqual(head(), { x: 10, y: 9 });
assert.equal(run('over'), false);

// Eat: +1 length, +10 score, new food on an empty cell
run('reset(); food = { x: 11, y: 10 }; tick()');
assert.deepEqual([run('snake.length'), run('score'), run('over')], [4, 10, false]);
const f = json('food');
assert.ok(f.x >= 0 && f.x < 20 && f.y >= 0 && f.y < 20);
assert.ok(!json('snake').some(c => c.x === f.x && c.y === f.y), 'food on snake');

// Food is a uniform pick over empty cells: Math.random extremes give the first and last empty cell
let rnd = 0;
const stubMath = Object.assign(Object.create(Math), { random: () => rnd }); // spread would be empty: Math's props are non-enumerable
const m = load('./snake.html', { Math: stubMath });
m.run('reset()');
assert.equal(m.run('JSON.stringify(food)'), '{"x":0,"y":0}');
rnd = 0.999999;
m.run('reset()');
assert.equal(m.run('JSON.stringify(food)'), '{"x":19,"y":19}');
rnd = 0;
m.run('snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }]; placeFood()');
assert.equal(m.run('JSON.stringify(food)'), '{"x":2,"y":0}', 'food on a snake cell');

// Speed-up: every multiple of 50
run('reset(); score = 40; food = { x: 11, y: 10 }; tick()');
assert.deepEqual([run('score'), run('speed')], [50, 8.5]);
run('food = { x: 12, y: 10 }; tick()');
assert.deepEqual([run('score'), run('speed')], [60, 8.5]);
run('score = 90; food = { x: 13, y: 10 }; tick()');
assert.deepEqual([run('score'), run('speed')], [100, 9]);
// faster tick interval: 1000/8.5 ~ 117.6 ms
run('reset(); food = { x: 0, y: 0 }; speed = 8.5; step(117)');
assert.deepEqual(head(), { x: 10, y: 10 });
run('step(1)');
assert.deepEqual(head(), { x: 11, y: 10 });

// Wall death (wrap off), each edge
for (const [h, d] of [[[19, 5], [1, 0]], [[0, 5], [-1, 0]], [[5, 0], [0, -1]], [[5, 19], [0, 1]]]) {
  run(`reset(); food = { x: 10, y: 15 }; snake = [{ x: ${h[0]}, y: ${h[1]} }]; dir = nextDir = [${d}]; tick()`);
  assert.equal(run('over'), true, `wall ${h}`);
  assert.equal(run('won'), false);
}

// Self death
run('reset(); food = { x: 0, y: 0 }; snake = [{x:5,y:5},{x:6,y:5},{x:6,y:6},{x:5,y:6},{x:4,y:6}]; dir = nextDir = [0, 1]; tick()');
assert.equal(run('over'), true);

// Tail cell: free when the tail moves away
run('reset(); food = { x: 0, y: 0 }; snake = [{x:5,y:5},{x:6,y:5},{x:6,y:6},{x:5,y:6}]; dir = nextDir = [0, 1]; tick()');
assert.equal(run('over'), false);
assert.deepEqual(head(), { x: 5, y: 6 });
assert.equal(run('snake.length'), 4);

// Death mid-step stops the tick loop
run('reset(); food = { x: 0, y: 0 }; snake = [{ x: 19, y: 5 }]; step(1000)');
assert.deepEqual([run('over'), head()], [true, { x: 19, y: 5 }]);

// Wrap: each edge enters the opposite one
for (const [h, d, to] of [[[19, 5], [1, 0], [0, 5]], [[0, 5], [-1, 0], [19, 5]], [[5, 0], [0, -1], [5, 19]], [[5, 19], [0, 1], [5, 0]]]) {
  run(`reset(); wrap = true; food = { x: 10, y: 15 }; snake = [{ x: ${h[0]}, y: ${h[1]} }]; dir = nextDir = [${d}]; tick()`);
  assert.deepEqual([run('over'), head()], [false, { x: to[0], y: to[1] }], `wrap ${h}`);
}
// eating across the wrapped edge
run('reset(); wrap = true; snake = [{ x: 19, y: 5 }, { x: 18, y: 5 }]; food = { x: 0, y: 5 }; tick()');
assert.deepEqual([run('over'), run('snake.length'), run('score'), head()], [false, 3, 10, { x: 0, y: 5 }]);
run('wrap = false');

// Wrap toggle: T flips, repeat ignored, survives restart; drawn on canvas
run('wrap = false; reset()');
key('KeyT');
assert.equal(run('wrap'), true);
key('KeyT', true);
assert.equal(run('wrap'), true, 'repeat toggled wrap');
assert.ok(rendered().includes('Wrap'));
run('end(false)'); key('Space');
assert.deepEqual([run('over'), run('wrap')], [false, true]);
key('KeyT');
assert.equal(run('wrap'), false);

// Pause: step does nothing, "Paused" drawn, repeat ignored, P resumes
run('reset(); food = { x: 0, y: 0 }');
key('KeyP');
assert.equal(run('paused'), true);
run('step(1000)');
assert.deepEqual([head(), run('acc')], [{ x: 10, y: 10 }, 0]);
assert.ok(rendered().includes('Paused'));
key('KeyP', true);
assert.equal(run('paused'), true, 'repeat toggled pause');
key('KeyP');
assert.equal(run('paused'), false);
run('step(125)');
assert.deepEqual(head(), { x: 11, y: 10 });

// Game over screen
run('reset(); score = 30; end(false)');
rendered();
for (const t of ['Game over', 'Press Space to restart']) assert.ok(texts.includes(t), t);
assert.equal(texts.filter(t => t === 'Score: 30').length, 2, 'overlay score missing (HUD + overlay)');
assert.ok(!texts.includes('You win!'));

// While over: only Space restarts; steering, P, T ignored; time stops
run('reset(); snake = [{ x: 19, y: 5 }]; food = { x: 0, y: 0 }; tick()');
assert.equal(run('over'), true);
const overSnap = run('JSON.stringify([snake, nextDir, paused, wrap, score])');
for (const code of ['ArrowUp', 'KeyW', 'KeyP', 'KeyT', 'Enter']) key(code);
run('step(1000)');
assert.equal(run('JSON.stringify([snake, nextDir, paused, wrap, score])'), overSnap);
assert.equal(run('over'), true);
key('Space');
assert.deepEqual([run('over'), run('score'), run('speed'), run('snake.length'), json('dir'), run('acc')], [false, 0, 8, 3, [1, 0], 0]);
// reset() clears a paused run too
run('paused = true; reset()');
assert.equal(run('paused'), false);

// Full board: eating the last empty cell wins
const path = [];
for (let y = 0; y < 20; y++) for (let i = 0; i < 20; i++) path.push({ x: y % 2 ? 19 - i : i, y }); // serpentine, ends at (0,19)
run(`reset(); score = 3960; snake = ${JSON.stringify(path.slice(0, 399).reverse())}; food = { x: 0, y: 19 }; dir = nextDir = [-1, 0]; tick()`);
assert.deepEqual([run('over'), run('won'), run('snake.length'), run('score')], [true, true, 400, 3970]);
rendered();
for (const t of ['You win!', 'Press Space to restart']) assert.ok(texts.includes(t), t);
assert.equal(texts.filter(t => t === 'Score: 3970').length, 2, 'overlay score missing (HUD + overlay)');
assert.ok(!texts.includes('Game over'));
key('Space');
assert.deepEqual([run('over'), run('won'), run('snake.length')], [false, false, 3]);
// a win reached mid-step stays a win: the loop stops instead of ticking into the wall
run(`reset(); score = 3960; snake = ${JSON.stringify(path.slice(0, 399).reverse())}; food = { x: 0, y: 19 }; dir = nextDir = [-1, 0]; speed = 40; step(100)`);
assert.deepEqual([run('over'), run('won')], [true, true]);

// Scroll: arrows and Space prevented (also while over and on repeat); other keys untouched
let prevented = 0;
const press = (code, repeat = false) => listeners.keydown({ code, repeat, preventDefault: () => prevented++ });
run('reset()');
for (const code of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']) press(code);
press('ArrowUp', true);
run('end(false)'); press('ArrowDown');
assert.equal(prevented, 7);
for (const code of ['KeyW', 'KeyA', 'KeyP', 'KeyT', 'F5', 'Tab']) press(code);
assert.equal(prevented, 7, 'non-game key prevented');

// frame() caps dt at 100 ms: at 20 ticks/s a 5 s gap gives 2 moves, not 100
run('reset(); wrap = false; food = { x: 0, y: 0 }; speed = 20; last = null; frame(0); frame(5000)');
assert.deepEqual([run('over'), head()], [false, { x: 12, y: 10 }]);

// rAF wiring: bootstraps once, each frame() re-queues
const calls = [];
const r = load('./snake.html', { requestAnimationFrame: (cb) => calls.push(cb) });
assert.equal(calls.length, 1);
r.run('frame(0)');
assert.equal(calls.length, 2);

// render() leaves state alone
run('reset(); score = 20; paused = true');
const snap = () => run('JSON.stringify([snake, dir, nextDir, food, score, speed, acc, over, won, paused, wrap, high])');
const before = snap();
rendered();
run('paused = false; end(false)');
const before2 = snap();
rendered();
assert.equal(snap(), before2, 'render() changed state');
assert.notEqual(before, before2);

// High score: read at load, written only when beaten
const store = { snakeHighScore: '30' };
const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const h = load('./snake.html', { localStorage: storage });
assert.equal(h.run('high'), 30);
h.texts.length = 0; h.run('render()');
assert.ok(h.texts.includes('High: 30'));
// HUD shows the live best while a run beats the record; the stored high itself is untouched
h.texts.length = 0; h.run('score = 50; render()');
assert.ok(h.texts.includes('High: 50'));
assert.equal(h.run('high'), 30);
h.texts.length = 0; h.run('score = 10; render()');
assert.ok(h.texts.includes('High: 30'));
h.run('reset(); score = 20; end(false)');
assert.deepEqual([store.snakeHighScore, h.run('high')], ['30', 30]);
h.run('reset(); score = 40; end(false)');
assert.deepEqual([store.snakeHighScore, h.run('high')], ['40', 40]);
h.run('reset(); score = 40; end(false)');
assert.equal(store.snakeHighScore, '40');
// a win saves the high score too
h.run(`reset(); score = 3960; snake = ${JSON.stringify(path.slice(0, 399).reverse())}; food = { x: 0, y: 19 }; dir = nextDir = [-1, 0]; tick()`);
assert.deepEqual([h.run('won'), h.run('high'), store.snakeHighScore], [true, 3970, '3970']);
// garbage in storage reads as 0
assert.equal(load('./snake.html', { localStorage: { getItem: () => 'junk', setItem() {} } }).run('high'), 0);

// Blocked storage: getItem/setItem throw; game plays normally with high 0
const boom = () => { throw new Error('SecurityError'); };
const b = load('./snake.html', { localStorage: { getItem: boom, setItem: boom } });
assert.equal(b.run('high'), 0);
b.run('reset(); food = { x: 0, y: 0 }; step(125)');
assert.equal(b.run('JSON.stringify(snake[0])'), '{"x":11,"y":10}');
b.run('score = 50; end(false)');
assert.deepEqual([b.run('over'), b.run('high')], [true, 50]);
// no localStorage at all (default harness) also loads
assert.equal(run('typeof high'), 'number');

// #status (aria-live) follows the state; this stub keeps one element per id so the text sticks
const els = {}, docListeners = {}, writes = {};
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const g = load('./snake.html', { document: {
  getElementById: (id) => (els[id] ??= (() => {
    let text = '';
    writes[id] = 0;
    return { getContext: () => ctxStub, get textContent() { return text; }, set textContent(v) { text = v; writes[id]++; } };
  })()),
  addEventListener: (type, fn) => { docListeners[type] = fn; },
} });
const gKey = (code) => docListeners.keydown({ code, repeat: false, preventDefault() {} });
g.run('food = { x: 0, y: 0 }; render(); step(125); render()');
assert.equal(els.status.textContent, 'Playing. Wrap off.');
assert.equal(writes.status, 1, 'live region rewritten every render');
gKey('KeyP'); g.run('render(); render()');
assert.equal(els.status.textContent, 'Paused. Press P to resume.');
gKey('KeyP'); gKey('KeyT'); g.run('render(); render()');
assert.equal(els.status.textContent, 'Playing. Wrap on.');
assert.equal(writes.status, 3);
g.run('score = 70; end(false); render(); render()');
assert.equal(els.status.textContent, 'Game over. Score: 70. Press Space to restart.');
assert.equal(writes.status, 4);
g.run('score = 80; end(true); render()');
assert.equal(els.status.textContent, 'You win! Score: 80. Press Space to restart.');

console.log('all snake tests passed');
