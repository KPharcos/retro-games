// Self-check for gapwing.html: runs its <script> in node:vm with a stub DOM and asserts the core rules.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const { run, key, listeners, texts } = load('./gapwing.html');
const hover = (n) => run(`for (let i = 0; i < ${n}; i++) { y = 300; vy = 0; tick(); }`); // holds the bird at y = 300 for n ticks; does not stop when the bird dies

// Canvas is 400x600
assert.match(readFileSync(new URL('./gapwing.html', import.meta.url), 'utf8'), /<canvas[^>]*\bwidth="400"[^>]*\bheight="600"/);

// Ready: nothing moves; hint drawn
run('reset()');
run('step(1000)');
assert.deepEqual([run('state'), run('y'), run('vy'), run('dist')], ['ready', 260, 0, 0]);
texts.length = 0;
run('render()');
assert.ok(texts.includes('tap or Space to flap'));

// Start: Space or pointerdown -> playing with vy = -8
key('Space');
assert.deepEqual([run('state'), run('vy')], ['playing', -8]);
run('reset()');
listeners.pointerdown({ button: 2 });
assert.deepEqual([run('state'), run('vy')], ['ready', 0], 'right-click must not flap');
listeners.pointerdown({ button: 0 });
assert.deepEqual([run('state'), run('vy')], ['playing', -8]);

// Flap sets, not adds
run('vy = -5');
key('Space');
assert.equal(run('vy'), -8);

// Key repeat: no extra flap
run('vy = 3');
key('Space', true);
assert.equal(run('vy'), 3);

// Gravity: vy += 0.5, then y += vy
run('reset(); state = "playing"; y = 300; vy = 0; tick()');
assert.deepEqual([run('vy'), run('y')], [0.5, 300.5]);

// Frame timing: 16 ms is no frame, one more ms is exactly one
run('reset(); state = "playing"; y = 300; vy = 0');
run('step(16)');
assert.equal(run('vy'), 0);
run('step(1)');
assert.equal(run('vy'), 0.5);

// Spawn: first pillar after 90 frames at x = 400, next 90 frames later; gap fits 60..ground-60
run('reset(); state = "playing"');
hover(89);
assert.equal(run('pipes.length'), 0);
hover(1);
assert.equal(run('pipes.length'), 1);
assert.equal(run('pipes[0].x'), 400);
hover(89);
assert.equal(run('pipes.length'), 1);
hover(1);
assert.deepEqual([run('pipes.length'), run('pipes[0].x'), run('pipes[1].x')], [2, 220, 400]);
assert.equal(run('dist'), 2 * 180);
// Culling: a pillar is dropped once its right edge reaches x = 0
run('reset(); state = "playing"');
hover(319);
assert.deepEqual([run('pipes.length'), run('pipes[0].x')], [3, -58]);
hover(1);
assert.equal(run('pipes.length'), 2);
for (let i = 0; i < 200; i++) {
  run('reset(); spawnPipe()');
  assert.ok(run('pipes[0].top >= MARGIN && pipes[0].top + pipes[0].gap <= GROUND - MARGIN'), 'gap out of range');
}
// Literal bounds at the extremes of Math.random: gap spans y = 60 .. 480 (ground 540 - 60)
let rnd = 0;
const stubMath = Object.assign(Object.create(Math), { random: () => rnd }); // spread would be empty: Math's props are non-enumerable
const m = load('./gapwing.html', { Math: stubMath });
for (const s of [0, 25, 50]) {
  rnd = 0;
  m.run(`reset(); score = ${s}; spawnPipe()`);
  assert.equal(m.run('pipes[0].top'), 60);
  rnd = 0.999999;
  m.run(`reset(); score = ${s}; spawnPipe()`);
  const bottom = m.run('pipes[0].top + pipes[0].gap');
  assert.ok(bottom < 480 && bottom > 479.9, `gap bottom ${bottom} at score ${s}`);
}

// Score: +1 once, when the right edge passes the bird's x
run('reset(); state = "playing"; pipes = [{ x: 42, top: 200, gap: 150, scored: false }]'); // right edge 102 -> 100 after one frame
hover(1);
assert.equal(run('score'), 0);
hover(1);
assert.equal(run('score'), 1);
hover(5);
assert.equal(run('score'), 1);

// Pipe hit: above gap top, centre in the gap but circle overlapping the bottom pillar, centre below gap bottom
run('reset(); state = "playing"; pipes = [{ x: 80, top: 200, gap: 150, scored: false }]; y = 190; vy = -0.5; tick()');
assert.equal(run('state'), 'over');
run('reset(); state = "playing"; pipes = [{ x: 80, top: 200, gap: 150, scored: false }]; y = 345; vy = -0.5; tick()');
assert.equal(run('state'), 'over');
run('reset(); state = "playing"; pipes = [{ x: 80, top: 200, gap: 150, scored: false }]; y = 360; vy = -0.5; tick()');
assert.equal(run('state'), 'over');
// Clear through the middle of the gap
run('reset(); state = "playing"; pipes = [{ x: 80, top: 200, gap: 150, scored: false }]; y = 275; vy = -0.5; tick()');
assert.equal(run('state'), 'playing');
// Near miss: 13 px above the bottom pillar (radius 12)
run('reset(); state = "playing"; pipes = [{ x: 80, top: 200, gap: 150, scored: false }]; y = 337; vy = -0.5; tick()');
assert.equal(run('state'), 'playing');
// Edge of the circle clips the pillar's corner
run('reset(); state = "playing"; pipes = [{ x: 112, top: 200, gap: 150, scored: false }]; y = 205; vy = -0.5; tick()');
assert.equal(run('state'), 'over');
// Corner miss: dx = 10, dy = 10 overlaps the bounding box but not the circle
run('reset(); state = "playing"; pipes = [{ x: 112, top: 200, gap: 150, scored: false }]; y = 210; vy = -0.5; tick()');
assert.equal(run('state'), 'playing');

// Over the top: the top pillar extends upward without limit
run('reset(); state = "playing"; pipes = [{ x: 80, top: 200, gap: 150, scored: false }]; y = -50; vy = -0.5; tick()');
assert.equal(run('state'), 'over');
run('reset(); state = "playing"; y = -50; vy = -0.5; tick()');
assert.equal(run('state'), 'playing', 'flying above the screen with no pillar is fine');
// A pillar already behind the bird no longer hits it, above or below the gap
run('reset(); state = "playing"; pipes = [{ x: -10, top: 200, gap: 150, scored: true }]; y = 100; vy = -0.5; tick()');
assert.equal(run('state'), 'playing');
run('reset(); state = "playing"; pipes = [{ x: -10, top: 200, gap: 150, scored: true }]; y = 400; vy = -0.5; tick()');
assert.equal(run('state'), 'playing');

// Death mid-step: the pillar column and the ground both cover the bird on this tick; the check is only that the loop stops after the first tick
run('reset(); state = "playing"; y = GROUND - BIRD_R - 1; vy = 0.6; pipes = [{ x: 42, top: 200, gap: 150, scored: false }]; step(100)');
assert.deepEqual([run('state'), run('score'), run('pipes[0].x')], ['over', 0, 40]);
assert.ok(Math.abs(run('y') - 528.1) < 1e-9, 'more than one tick ran');

// Ground: 1 px above is fine; bird bottom reaching the ground ends the run
run('reset(); state = "playing"; y = GROUND - BIRD_R - 1; vy = -0.5; tick()');
assert.equal(run('state'), 'playing');
run('reset(); state = "playing"; y = GROUND - BIRD_R - 1; vy = 0.5; tick()');
assert.equal(run('state'), 'over');

const distOver = run('dist');
run('step(1000); overTime = 0');
assert.equal(run('dist'), distOver, 'scrolled while over');

// Game over screen; early restart ignored; restart after 500 ms
texts.length = 0;
run('score = 7; render()');
assert.ok(texts.includes('Game Over'));
assert.ok(texts.includes('Score: 7'));
assert.ok(!texts.includes('tap or Space to restart'), 'restart hint before 500 ms');
run('step(499)');
key('Space');
listeners.pointerdown({ button: 0 });
assert.equal(run('state'), 'over');
run('step(1)');
texts.length = 0;
run('render()');
assert.ok(texts.includes('tap or Space to restart'));
key('Space');
assert.deepEqual([run('state'), run('score'), run('pipes.length')], ['ready', 0, 0]);
run('acc = 5; spawnT = 7; overTime = 600; dist = 99; reset()');
assert.deepEqual([run('acc'), run('spawnT'), run('overTime'), run('dist')], [0, 0, 0, 0]);
// Restart by pointer too
run('reset(); state = "playing"; y = GROUND; tick(); step(500)');
listeners.pointerdown({ button: 0 });
assert.equal(run('state'), 'ready');

// frame() caps dt at 100 ms: a 5 s gap runs ~6 frames, not 300
run('reset(); state = "playing"; y = 300; vy = 0; last = null; frame(0); frame(5000)');
assert.equal(run('state'), 'playing');
// 100 ms is 6 frames in exact maths; float rounding may give 5; a cap above about 116 ms gives 7 or more
assert.ok(run('vy') >= 2.5 && run('vy') <= 3, 'dt cap: expected 5 or 6 ticks');

// rAF wiring: the script bootstraps the loop once, and each frame() re-queues itself
const calls = [];
const f = load('./gapwing.html', { requestAnimationFrame: (cb) => calls.push(cb) });
assert.equal(calls.length, 1);
f.run('state = "playing"; frame(0)'); // score is drawn only while playing
assert.equal(calls.length, 2);
assert.ok(f.texts.includes('0'));

// Playing: score drawn on the canvas; render() leaves state alone
run('reset(); state = "playing"; score = 3; dist = 123; pipes = [{ x: 150, top: 200, gap: 150, scored: false }]');
const snap = () => run('JSON.stringify([state, y, vy, dist, score, pipes])');
const before = snap();
texts.length = 0;
run('render()');
assert.ok(texts.includes('3'));
assert.equal(snap(), before, 'render() changed state');

// Ramp: gap shrinks 5 px per 5 points, floor 100; each pillar keeps its spawn gap
for (const [s, gap] of [[0, 150], [4, 150], [9, 145], [10, 140]]) {
  run(`reset(); score = ${s}; spawnPipe()`);
  assert.equal(run('pipes[0].gap'), gap, `gap at score ${s}`);
}
run('score = 50; spawnPipe()');
assert.deepEqual([run('pipes[0].gap'), run('pipes[1].gap')], [140, 100]);
run('score = 90; spawnPipe()');
assert.equal(run('pipes[2].gap'), 100);
// Ramp through tick(), not only spawnPipe()
run('reset(); state = "playing"; score = 10');
hover(90);
assert.equal(run('pipes[0].gap'), 140);
// A pillar keeps its spawn gap when the score changes later
run('reset(); state = "playing"; score = 0; spawnPipe(); score = 10');
hover(5);
assert.equal(run('pipes[0].gap'), 150);

// Space prevents page scroll; other keys untouched
let prevented = 0;
listeners.keydown({ code: 'Space', repeat: false, preventDefault: () => prevented++ });
listeners.keydown({ code: 'Space', repeat: true, preventDefault: () => prevented++ });
assert.equal(prevented, 2);
run('reset()');
for (const code of ['ArrowUp', 'ArrowDown', 'KeyW', 'F5', 'Tab'])
  listeners.keydown({ code, repeat: false, preventDefault: () => prevented++ });
assert.equal(prevented, 2, 'non-game key prevented');
assert.deepEqual([run('state'), run('vy')], ['ready', 0], 'non-Space key flapped');

// #status (aria-live) follows the state; this stub keeps one element per id so the text sticks
const els = {}, docListeners = {}, writes = {};
const ctxStub = new Proxy({}, { get: () => () => {}, set: () => true });
const g = load('./gapwing.html', { document: {
  getElementById: (id) => (els[id] ??= (() => {
    let text = '';
    writes[id] = 0;
    return { getContext: () => ctxStub, get textContent() { return text; }, set textContent(v) { text = v; writes[id]++; } };
  })()),
  addEventListener: (type, fn) => { docListeners[type] = fn; },
} });
g.run('render(); render()');
assert.equal(els.status.textContent, 'Ready. Tap or press Space to flap.');
assert.equal(writes.status, 1, 'live region rewritten every render');
docListeners.keydown({ code: 'Space', repeat: false, preventDefault() {} });
g.run('render(); render()');
assert.equal(els.status.textContent, 'Flying.');
assert.equal(writes.status, 2);
g.run('score = 4; y = GROUND; tick(); render(); render()');
assert.equal(els.status.textContent, 'Game Over. Score: 4. Tap or press Space to restart.');
assert.equal(writes.status, 3);

console.log('all gapwing tests passed');
