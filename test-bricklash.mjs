// Self-check for bricklash.html: runs its <script> in node:vm with a stub DOM and asserts the spec's I/O matrix.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./bricklash.html', import.meta.url), 'utf8');
const { run, key, listeners, texts } = load('./bricklash.html');
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
const ball = (i = 0) => [...run(`[balls[${i}].x, balls[${i}].y, balls[${i}].vx, balls[${i}].vy]`)]; // spread: vm arrays fail deepEqual across realms
// Playing with one ball and the full wall; keeps the wall alive so no level clear fires by accident.
const play = (b, more = '') => run(`reset(); state = 'playing'; balls = [${b}]; ${more}`);

// Markup: canvas 480x640, one bare script, no Atari branding
assert.match(html, /<canvas[^>]*\bwidth="480"[^>]*\bheight="640"/);
assert.equal(html.match(/<script/g).length, 1);
assert.ok(!/breakout|atari/i.test(html), 'named-game branding');

// Opening: 60 bricks, serve, ball on the paddle centre, HUD text
run('reset()');
assert.deepEqual([run('state'), run('bricks.filter(Boolean).length'), run('score'), run('lives'), run('level')], ['serve', 60, 0, 3, 1]);
assert.deepEqual([run('paddleX'), run('paddleW'), run('balls.length')], [200, 80, 1]);
assert.deepEqual(ball(), [240, 594, 0, 0]);
texts.length = 0;
run('render()');
for (const t of ['Score 0', 'Lives 3', 'Level 1']) assert.ok(texts.includes(t), t);
assert.equal(run('new Set(COLORS).size'), 6, 'one color per row');

// Serve: ball follows the paddle until launch
key('ArrowRight');
run('tick()');
assert.deepEqual([run('paddleX'), ball()[0], ball()[1]], [204, 244, 594]);
listeners.keyup({ code: 'ArrowRight' });
run('tick()');
assert.equal(run('paddleX'), 204, 'keyup stops the paddle');

// Launch: 30° right of vertical at 360 px/s; key repeat ignored; right click ignored
run('reset()');
key('Space', true);
listeners.pointerdown({ button: 2 });
assert.equal(run('state'), 'serve');
key('Space');
assert.equal(run('state'), 'playing');
near(ball()[2], 180, 'serve vx');
near(ball()[3], -360 * Math.cos(Math.PI / 6), 'serve vy');
run('reset()');
listeners.pointerdown({ button: 0 });
assert.equal(run('state'), 'playing', 'click launches');

// Paddle bounce: centre straight up, right edge 60° right, left edge 60° left, same speed
for (const [x, deg] of [[240, 0], [280, 60], [200, -60], [285, 60]]) {
  play(`{ x: ${x}, y: 592, vx: 0, vy: 360 }`);
  run('tick()');
  const [, , vx, vy] = ball();
  near(vx, 360 * Math.sin(deg * Math.PI / 180), `vx at x=${x}`);
  near(vy, -360 * Math.cos(deg * Math.PI / 180), `vy at x=${x}`);
}
// A ball moving up never bounces off the paddle
play('{ x: 270, y: 605, vx: 0, vy: -360 }');
run('tick()');
assert.deepEqual(ball().slice(2), [0, -360]);
// A ball whose previous top was already below the paddle top is not scooped back up
play('{ x: 240, y: 596, vx: 0, vy: 360 }');
run('tick()');
assert.equal(ball()[3], 360);
// Wide paddle in play: 180..300, so the outer 20 px angle by the 60 px half-width; edge = 60°
for (const [x, deg] of [[300, 60], [290, 50], [180, -60]]) {
  play(`{ x: ${x}, y: 592, vx: 0, vy: 360 }`, 'setWidth(WIDE_W)');
  run('tick()');
  near(ball()[2], 360 * Math.sin(deg * Math.PI / 180), `wide vx at x=${x}`);
  near(ball()[3], -360 * Math.cos(deg * Math.PI / 180), `wide vy at x=${x}`);
}
// Wide paddle: ArrowRight clamps at 480 - 120; a capsule at the wide edge (left 299) is caught
play('{ x: 240, y: 300, vx: 0, vy: 0 }', "setWidth(WIDE_W); paddleX = 358; keyR = true; tick(); keyR = false");
assert.equal(run('paddleX'), 360);
play('{ x: 240, y: 300, vx: 0, vy: 0 }', "setWidth(WIDE_W); capsules = [{ x: 311, y: 600, type: 'multi' }]");
run('tick()');
assert.deepEqual([run('capsules.length'), run('balls.length')], [0, 3]);
// Ball past the paddle side misses it
play('{ x: 300, y: 592, vx: 0, vy: 360 }', 'paddleX = 0');
run('tick()');
assert.equal(ball()[3], 360);

// Paddle clamp: keys and pointer
run('reset(); paddleX = 0; keyL = true; tick()');
assert.equal(run('paddleX'), 0);
run('keyL = false; paddleX = 400; keyR = true; tick(); keyR = false');
assert.equal(run('paddleX'), 400);
let rect = { left: 0, width: 480 };
const pd = {}, pctx = new Proxy({}, { get: () => () => {}, set: () => true });
const p = load('./bricklash.html', { document: {
  getElementById: () => ({ getContext: () => pctx, getBoundingClientRect: () => rect, textContent: '' }),
  addEventListener: (type, fn) => { pd[type] = fn; },
} });
pd.pointermove({ clientX: -50 });
assert.equal(p.run('paddleX'), 0);
pd.pointermove({ clientX: 600 });
assert.equal(p.run('paddleX'), 400);
pd.pointermove({ clientX: 100 });
assert.equal(p.run('paddleX'), 60, 'centred on the pointer');
rect = { left: 10, width: 240 }; // canvas shrunk to half by CSS
pd.pointermove({ clientX: 70 });
assert.equal(p.run('paddleX'), 80, 'pointer scaled by the canvas rect');
rect = { left: 0, width: 480 };
pd.pointermove({ clientX: 100 });
p.run('tick()');
assert.deepEqual([...p.run('[balls[0].x, balls[0].y, state]')], [100, 594, 'serve'], 'serve ball follows the pointer');
p.run("state = 'playing'; balls = [{ x: 240, y: 300, vx: 0, vy: 0 }]; setWidth(WIDE_W)");
pd.pointermove({ clientX: 480 });
assert.equal(p.run('paddleX'), 360, 'wide paddle clamps at the right wall');

// Walls and ceiling reflect
play('{ x: 7, y: 300, vx: -360, vy: 0 }');
run('tick()');
assert.deepEqual(ball().slice(0, 3), [6, 300, 360]);
play('{ x: 473, y: 300, vx: 360, vy: 0 }');
run('tick()');
assert.deepEqual(ball().slice(0, 3), [474, 300, -360]);
play('{ x: 240, y: 48, vx: 0, vy: -360 }', 'bricks.fill(false); bricks[0] = true');
run('tick()');
assert.deepEqual([ball()[1], ball()[3]], [46, 360]);

// Brick from below: bottom row col 3 (x 144..192, y 180..200), +10, vy flips
play('{ x: 168, y: 208, vx: 0, vy: -360 }');
run('tick()');
assert.deepEqual([run('bricks[53]'), run('score'), ball()[3], run('bricks.filter(Boolean).length')], [false, 10, 360, 59]);
// Brick from the left: row 2 col 5 (x 240..288, y 120..140), +40, vx flips
play('{ x: 232, y: 130, vx: 360, vy: 0 }', 'bricks.fill(false); bricks[25] = true; bricks[0] = true');
run('tick()');
assert.deepEqual([run('bricks[25]'), run('score'), ball()[2], ball()[3]], [false, 40, -360, 0]);
// From the right
play('{ x: 296, y: 130, vx: -360, vy: 0 }', 'bricks.fill(false); bricks[25] = true; bricks[0] = true');
run('tick()');
assert.deepEqual([run('bricks[25]'), ball()[2]], [false, 360]);
// One brick per ball per tick: ball rising into the seam between cols 3 and 4
play('{ x: 192, y: 208, vx: 0, vy: -360 }');
run('tick()');
assert.deepEqual([run('bricks.filter(Boolean).length'), run('bricks[53]'), run('bricks[54]'), ball()[3]], [59, false, true, 360]);
// Corner clip: rising at x 189 into col 4's corner with col 3 cleared flips vy too (else it climbs the whole column)
play('{ x: 189, y: 208, vx: 0, vy: -360 }', 'bricks[53] = false');
run('tick()');
assert.deepEqual([run('bricks.filter(Boolean).length'), run('bricks[54]'), ball()[3]], [58, false, 360]);
// Already leaving: overlapping a cell while moving away keeps the sign (a bare negate would turn it back)
play('{ x: 236, y: 130, vx: -120, vy: 0 }', 'bricks.fill(false); bricks[25] = true; bricks[0] = true');
run('tick()');
assert.deepEqual([run('bricks[25]'), ball()[2]], [false, -120]);
play('{ x: 168, y: 204, vx: 0, vy: 120 }');
run('tick()');
assert.deepEqual([run('bricks[53]'), ball()[3]], [false, 120]);
// Row values: top row +60, bottom row +10
play('{ x: 24, y: 72, vx: 0, vy: 360 }', 'bricks.fill(false); bricks[0] = true; bricks[59] = true');
run('tick()');
assert.deepEqual([run('score'), ball()[3]], [60, -360], 'hit from above bounces up');
run('balls = [{ x: 456, y: 208, vx: 0, vy: -360 }]; bricks[0] = true; tick()');
assert.equal(run('score'), 70);

// Lose life: last ball's top below 640 -> lives - 1, serve
play('{ x: 240, y: 645, vx: 0, vy: 360 }');
run('tick()');
assert.deepEqual([run('lives'), run('state'), run('balls.length')], [2, 'serve', 1]);
assert.deepEqual(ball(), [240, 594, 0, 0]);
// Top still above 640: in play
play('{ x: 240, y: 642, vx: 0, vy: 120 }');
run('tick()');
assert.deepEqual([run('lives'), run('state')], [3, 'playing']);
// Multi-ball: losing one of two keeps play going
play('{ x: 240, y: 645, vx: 0, vy: 360 }, { x: 240, y: 300, vx: 0, vy: -360 }');
run('tick()');
assert.deepEqual([run('lives'), run('state'), run('balls.length')], [3, 'playing', 1]);

// Game over on the third life; Space resets
play('{ x: 240, y: 645, vx: 0, vy: 360 }', 'lives = 1; score = 90; level = 3');
run('tick()');
assert.equal(run('state'), 'over');
run('step(1000)');
assert.equal(run('state'), 'over');
texts.length = 0;
run('render()');
assert.ok(texts.includes('Game Over') && texts.includes('Score: 90'));
key('Space');
assert.deepEqual([run('state'), run('score'), run('lives'), run('level'), run('bricks.filter(Boolean).length')], ['serve', 0, 3, 1, 60]);
play('{ x: 240, y: 645, vx: 0, vy: 360 }', 'lives = 1; score = 90; tick()');
listeners.pointerdown({ button: 2 });
assert.equal(run('state'), 'over', 'right click must not restart');
listeners.pointerdown({ button: 0 });
assert.deepEqual([run('state'), run('score'), run('lives')], ['serve', 0, 3], 'click restarts');

// Level clear: last brick -> level 2, full wall, serve, power-ups cleared, speed 400
play('{ x: 168, y: 208, vx: 0, vy: -360 }', 'bricks.fill(false); bricks[53] = true; capsules = [{ x: 10, y: 300, type: "wide" }]; setWidth(WIDE_W); wide = 50');
run('tick()');
assert.deepEqual([run('level'), run('bricks.filter(Boolean).length'), run('state'), run('capsules.length'), run('paddleW'), run('wide'), run('score')],
  [2, 60, 'serve', 0, 80, 0, 10]);
key('Space');
near(Math.hypot(ball()[2], ball()[3]), 400, 'level 2 speed');
run('reset(); level = 20; launch()');
near(Math.hypot(ball()[2], ball()[3]), 720, 'speed cap');

// Fixed step: 8 ms is no tick, one more ms is exactly one (3 px at 360 px/s)
play('{ x: 240, y: 400, vx: 0, vy: -360 }');
run('step(8)');
assert.equal(ball()[1], 400);
run('step(1)');
assert.equal(ball()[1], 397);
// frame() caps dt at 100 ms: a 5 s gap runs 12 ticks (11 if float rounding loses one), not 600
play('{ x: 240, y: 400, vx: 0, vy: -360 }', 'last = null; frame(0); frame(5000)');
assert.ok([364, 367].includes(ball()[1]), `dt cap: y ${ball()[1]}`);

// Capsule drops: 1/8 chance, then 50/50 wide or multi, at the brick centre
let rq = [];
const stubMath = Object.assign(Object.create(Math), { random: () => rq.shift() ?? 0.99 }); // spread would be empty: Math's props are non-enumerable
const m = load('./bricklash.html', { Math: stubMath });
for (const [rolls, type] of [[[0.1, 0.3], 'wide'], [[0.124, 0.7], 'multi'], [[0.125], null]]) {
  m.run('reset(); state = "playing"; balls = [{ x: 168, y: 208, vx: 0, vy: -360 }]');
  rq = rolls;
  m.run('tick()');
  assert.equal(m.run('capsules.length'), type ? 1 : 0, `drop ${rolls}`);
  if (type) assert.deepEqual([...m.run("[capsules[0].x, capsules[0].y, capsules[0].type]")], [168, 190 + 150 / 120, type]); // spawns at the centre, falls once in the same tick
}

// Wide: 120 px for 10 s (1200 ticks), then 80; a second catch restarts the timer; stays inside the walls
const hold = '{ x: 240, y: 300, vx: 0, vy: 0 }'; // a parked ball keeps play going
play(`${hold}`, `capsules = [{ x: 240, y: 600, type: 'wide' }]`);
run('tick()');
assert.deepEqual([run('paddleW'), run('paddleX'), run('capsules.length')], [120, 180, 0]);
run('for (let i = 0; i < 600; i++) tick()');
run("capsules = [{ x: 240, y: 600, type: 'wide' }]; tick()");
run('for (let i = 0; i < 1199; i++) tick()');
assert.equal(run('paddleW'), 120, 'timer restarted');
run('tick()');
assert.deepEqual([run('paddleW'), run('paddleX')], [80, 200]);
play(`${hold}`, `paddleX = 400; capsules = [{ x: 440, y: 600, type: 'wide' }]`);
run('tick()');
assert.deepEqual([run('paddleW'), run('paddleX')], [120, 360]);
run('for (let i = 0; i < 1200; i++) tick()');
assert.deepEqual([run('paddleW'), run('paddleX')], [80, 380]);

// Multi: two new balls at the first ball, ±45° up, current speed
play(`{ x: 100, y: 300, vx: 0, vy: 0 }`, `level = 2; capsules = [{ x: 240, y: 600, type: 'multi' }]`);
run('tick()');
assert.equal(run('balls.length'), 3);
for (const [i, sign] of [[1, -1], [2, 1]]) {
  const [x, y, vx, vy] = ball(i);
  assert.deepEqual([x, y], [100, 300]);
  near(vx, sign * 400 * Math.SQRT1_2, `multi vx ${i}`);
  near(vy, -400 * Math.SQRT1_2, `multi vy ${i}`);
}
// A missed capsule falls off and is removed
play(`${hold}`, `paddleX = 0; capsules = [{ x: 400, y: 600, type: 'multi' }]`);
run('for (let i = 0; i < 35; i++) tick()');
assert.deepEqual([run('capsules.length'), run('balls.length')], [1, 1]);
run('tick()');
assert.equal(run('capsules.length'), 0);

// Losing the last ball clears capsules and the wide paddle
play(`{ x: 240, y: 645, vx: 0, vy: 360 }`, `capsules = [{ x: 400, y: 300, type: 'multi' }]; setWidth(WIDE_W); wide = 99`);
run('tick()');
assert.deepEqual([run('capsules.length'), run('paddleW'), run('wide')], [0, 80, 0]);

// Keys: Space and arrows prevent scroll; others untouched
let prevented = 0;
for (const code of ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'Tab', undefined])
  listeners.keydown({ code, repeat: false, preventDefault: () => prevented++ });
assert.equal(prevented, 4);
listeners.keyup({ code: 'ArrowLeft' });
listeners.keyup({ code: 'ArrowRight' });
// Window blur drops held arrows (keyup never comes)
key('ArrowLeft'); key('ArrowRight');
run('onblur()');
assert.deepEqual([run('keyL'), run('keyR')], [false, false]);

// rAF wiring: bootstraps once, each frame() re-queues
const calls = [];
const f = load('./bricklash.html', { requestAnimationFrame: (cb) => calls.push(cb) });
assert.equal(calls.length, 1);
f.run('frame(0)');
assert.equal(calls.length, 2);
assert.ok(f.texts.includes('Score 0'));

// render() leaves state alone
play('{ x: 100, y: 300, vx: 50, vy: -80 }', 'score = 30; capsules = [{ x: 50, y: 250, type: "wide" }]; wide = 7');
const snap = () => run('JSON.stringify([state, score, lives, level, bricks, balls, capsules, paddleX, paddleW, wide, acc])');
const before = snap();
run('render()');
assert.equal(snap(), before, 'render() changed state');

// #status (aria-live) is written only when its text changes
const els = {}, writes = {}, docL = {};
const g = load('./bricklash.html', { document: {
  getElementById: (id) => (els[id] ??= (() => {
    let text = '';
    writes[id] = 0;
    return { getContext: () => pctx, get textContent() { return text; }, set textContent(v) { text = v; writes[id]++; } };
  })()),
  addEventListener: (type, fn) => { docL[type] = fn; },
} });
g.run('render(); render()');
assert.equal(els.status.textContent, 'Level 1, 3 lives. Press Space or click to launch.');
assert.equal(writes.status, 1, 'live region rewritten every render');
docL.keydown({ code: 'Space', repeat: false, preventDefault() {} });
g.run('render(); score = 50; render()');
assert.equal(els.status.textContent, 'Playing.');
assert.equal(writes.status, 2);
g.run('balls = [{ x: 240, y: 700, vx: 0, vy: 0 }]; lives = 1; tick(); render(); render()');
assert.equal(els.status.textContent, 'Game Over. Score: 50. Press Space or click to play again.');
assert.equal(writes.status, 3);

console.log('all bricklash tests passed');
