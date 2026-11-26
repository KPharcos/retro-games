// Self-check for rallyline.html: runs its <script> in node:vm with a stub DOM and asserts the spec's I/O matrix.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from './harness.mjs';

const html = readFileSync(new URL('./rallyline.html', import.meta.url), 'utf8');
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
const DEG = Math.PI / 180;

// Markup: canvas 800x500, one bare script, no named-game branding, the two page controls
assert.match(html, /<canvas[^>]*\bwidth="800"[^>]*\bheight="500"/);
assert.equal(html.match(/<script/g).length, 1);
assert.ok(!/pong|atari/i.test(html), 'named-game branding');
assert.match(html, /<input type="checkbox" id="two"/);
assert.match(html, /<input type="range" id="ai" min="2" max="8" step="1" value="4"/);

// A document stub with real-ish #two / #ai elements, a focus tracker and per-id write counts
let rq = [];
const stubMath = Object.assign(Object.create(Math), { random: () => rq.shift() ?? 0.5 }); // spread would be empty: Math's props are non-enumerable
function makeDoc() {
  const pctx = new Proxy({}, { get: (_, k) => (k === 'fillText' ? (t) => texts.push(t) : () => {}), set: () => true });
  const texts = [], listeners = {}, writes = {}, focus = { el: null };
  const els = {
    two: { id: 'two', checked: false, blur() { if (focus.el === this) focus.el = null; } },
    ai: { id: 'ai', value: '4', disabled: false },
  };
  const doc = {
    getElementById: (id) => {
      assert.ok(html.includes(`id="${id}"`), `#${id} in markup`);
      return (els[id] ??= (() => {
        let text = '';
        writes[id] = 0;
        return { getContext: () => pctx, get textContent() { return text; }, set textContent(v) { text = v; writes[id]++; } };
      })());
    },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  const g = load('./rallyline.html', { document: doc, Math: stubMath });
  const key = (code, more = {}) => {
    let prevented = false;
    listeners.keydown({ code, repeat: false, preventDefault: () => { prevented = true; }, ...more });
    return prevented;
  };
  const up = (code) => listeners.keyup({ code, preventDefault() {} });
  return { ...g, key, up, listeners, els, writes, focus, texts };
}

const { run, key, up, listeners, els, writes, focus, texts } = makeDoc();
const ball = () => [...run('[ball.x, ball.y, ball.vx, ball.vy]')]; // spread: vm arrays fail deepEqual across realms
const play = (b, more = '') => run(`reset(); state = 'playing'; ball = ${b}; ${more}`);

// Open: serve, 0-0, ball at centre, paddles centred; serve screen text
assert.deepEqual([...run('[state, scoreL, scoreR, leftY, rightY, speed, twoPlayer, aiSpeed]')], ['serve', 0, 0, 210, 210, 5, false, 4]);
assert.deepEqual(ball(), [400, 250, 0, 0]);
texts.length = 0;
run('render()');
for (const t of ['0', 'Space to serve']) assert.ok(texts.includes(t), t);
assert.equal(texts.filter((t) => t === '0').length, 2, 'two scores');
assert.equal(els.status.textContent, 'Score 0-0. Press Space to serve.');

// Serve: random 0.5 -> 0°, then < 0.5 right / else left; repeat and Space while playing ignored
rq = [0.5, 0.2];
key('Space', { repeat: true });
assert.equal(run('state'), 'serve', 'repeat ignored');
key('Space');
assert.equal(run('state'), 'playing');
assert.deepEqual(ball(), [400, 250, 5, 0]);
rq = [0, 0];
key('Space');
assert.deepEqual(ball(), [400, 250, 5, 0], 'Space while playing ignored');
run('reset()');
rq = [0.5, 0.5];
key('Space');
assert.deepEqual(ball(), [400, 250, -5, 0]);
// Serve angle range: random 0 -> -30°, 0.999… -> just under +30°
run('reset()');
rq = [0, 0];
key('Space');
near(ball()[2], 5 * Math.cos(-30 * DEG), 'vx at -30°');
near(ball()[3], 5 * Math.sin(-30 * DEG), 'vy at -30°');
run('reset()');
rq = [1 - Number.EPSILON, 0];
key('Space');
const a = Math.atan2(ball()[3], ball()[2]) / DEG;
assert.ok(a < 30 && a > 29.999, `angle ${a}`);
// Serve state: ball still, paddles move
run('reset()');
key('KeyS');
run('tick()');
assert.deepEqual([run('leftY'), ...ball()], [216, 400, 250, 0, 0]);
up('KeyS');

// Left paddle: W held 1 tick -> y - 6, clamped at 0; keyup and blur stop it
run('reset(); leftY = 100');
key('KeyW');
run('tick()');
assert.equal(run('leftY'), 94);
run('leftY = 4; tick()');
assert.equal(run('leftY'), 0);
run('leftY = 100');
up('KeyW');
run('tick()');
assert.equal(run('leftY'), 100, 'keyup stops it');
key('KeyW');
run('onblur(); tick()');
assert.equal(run('leftY'), 100, 'blur stops it');
key('KeyS');
run('leftY = 418; tick()');
assert.equal(run('leftY'), 420, 'clamped at the bottom');
up('KeyS');

// AI: ball 100 px below its centre -> 4 / tick; aiSpeed 8 -> 8; a smaller gap lands exactly on ball y; clamped
play('{ x: 400, y: 350, vx: 0, vy: 0 }');
run('tick()');
assert.equal(run('rightY'), 214);
run('rightY = 210; aiSpeed = 8; tick()');
assert.equal(run('rightY'), 218);
run('rightY = 307; tick()');
assert.equal(run('rightY + 40'), 350, 'gap < aiSpeed lands on ball y');
run('aiSpeed = 4; ball.y = 495; rightY = 418; tick()');
assert.equal(run('rightY'), 420, 'AI clamped');

// Paddle hit: left face x 32, paddle 210..290 (centre 250). Centre -> flat right; bottom edge -> 60° down-right; speed 5.25
for (const [y, deg] of [[250, 0], [295, 60], [205, -60], [268, 24]]) {
  play(`{ x: 39, y: ${y}, vx: -5, vy: 0 }`, 'speed = 5');
  run('tick()');
  const [x, , vx, vy] = ball();
  assert.equal(x, 37, 'flush with the face');
  near(vx, 5.25 * Math.cos(deg * DEG), `vx at y=${y}`);
  near(vy, 5.25 * Math.sin(deg * DEG), `vy at y=${y}`);
  near(run('speed'), 5.25, 'speed');
}
// Right face x 768: centre -> flat left
play('{ x: 760, y: 250, vx: 5, vy: 0 }', 'speed = 5; rightY = 210; aiSpeed = 0');
run('tick()');
assert.equal(ball()[0], 763);
near(ball()[2], -5.25, 'right paddle returns left');
// Right paddle mirror: edges 60° (bottom down-left, top up-left); moving away, past the face, outside the span, fast ball
for (const [y, deg] of [[295, 60], [205, -60]]) {
  play(`{ x: 761, y: ${y}, vx: 5, vy: 0 }`, 'speed = 5');
  run('tick()');
  const [x, , vx, vy] = ball();
  assert.equal(x, 763, 'flush with the right face');
  near(vx, -5.25 * Math.cos(deg * DEG), `right vx at y=${y}`);
  near(vy, 5.25 * Math.sin(deg * DEG), `right vy at y=${y}`);
}
play('{ x: 764, y: 250, vx: -5, vy: 0 }');
run('tick()');
assert.deepEqual(ball(), [759, 250, -5, 0], 'right: moving away');
play('{ x: 770, y: 250, vx: 5, vy: 0 }');
run('tick()');
assert.deepEqual(ball(), [775, 250, 5, 0], 'right: already past the face');
play('{ x: 761, y: 296, vx: 5, vy: 0 }');
run('tick()');
assert.deepEqual(ball(), [766, 296, 5, 0], 'right: below the paddle');
play('{ x: 740, y: 250, vx: 40, vy: 0 }', 'speed = 40');
run('tick()');
assert.equal(ball()[0], 763);
near(ball()[2], -42, 'right: fast return');
// Ball moving away or already past the face: no hit; outside the paddle's y span: no hit
play('{ x: 36, y: 250, vx: 5, vy: 0 }');
run('tick()');
assert.deepEqual(ball(), [41, 250, 5, 0], 'moving away');
play('{ x: 30, y: 250, vx: -5, vy: 0 }');
run('tick()');
assert.deepEqual(ball(), [25, 250, -5, 0], 'already past the face');
play('{ x: 39, y: 296, vx: -5, vy: 0 }');
run('tick()');
assert.deepEqual(ball(), [34, 296, -5, 0], 'below the paddle');
// Fast ball does not tunnel: 40 px/tick from x 60 crosses the face and is returned
play('{ x: 60, y: 250, vx: -40, vy: 0 }', 'speed = 40');
run('tick()');
assert.equal(ball()[0], 37);
near(ball()[2], 42, 'fast return');
// Overlap is judged where the edge crosses the face (t = 0.2 here), not at the end of the tick
play('{ x: 39, y: 290, vx: -10, vy: 20 }', 'speed = 5');
run('tick()');
assert.deepEqual(ball().slice(0, 2), [37, 294], 'crossing y 294 inside, end y 310 outside: hit');
assert.ok(ball()[2] > 0, 'returned');
play('{ x: 39, y: 300, vx: -10, vy: -10 }');
run('tick()');
assert.deepEqual(ball(), [29, 290, -10, -10], 'crossing y 298 outside, end y 290 inside: miss');

// Speed up: two hits -> 5 × 1.05²
play('{ x: 39, y: 250, vx: -5, vy: 0 }', 'aiSpeed = 0; rightY = 210');
run('tick()');
run('ball.x = 761; tick()');
near(run('speed'), 5 * 1.05 ** 2, 'two hits');
near(ball()[2], -5 * 1.05 ** 2, 'second return');
run('aiSpeed = 4');

// Walls: top moving up flips down, bottom moving down flips up
play('{ x: 400, y: 7, vx: 3, vy: -4 }');
run('tick()');
assert.deepEqual(ball().slice(1), [5, 3, 4]);
play('{ x: 400, y: 493, vx: 3, vy: 4 }');
run('tick()');
assert.deepEqual(ball().slice(1), [495, 3, -4]);

// Point: fully past the right edge -> left +1, serve, speed 5; past the left edge -> right +1
play('{ x: 804, y: 100, vx: 6, vy: 0 }', 'speed = 6');
run('tick()');
assert.deepEqual([...run('[scoreL, scoreR, state, speed]')], [1, 0, 'serve', 5]);
assert.deepEqual(ball(), [400, 250, 0, 0]);
play('{ x: 804, y: 100, vx: 1, vy: 0 }');
run('tick()');
assert.equal(run('scoreL'), 0, 'edge still on screen');
play('{ x: -4, y: 100, vx: -6, vy: 0 }');
run('tick()');
assert.deepEqual([...run('[scoreL, scoreR, state]')], [0, 1, 'serve']);
play('{ x: -4, y: 100, vx: -1, vy: 0 }');
run('tick()');
assert.equal(run('scoreR'), 0, 'left edge still on screen');
// Right side wins through tick() / point(false)
play('{ x: -4, y: 100, vx: -6, vy: 0 }', 'scoreR = 6');
run('tick()');
assert.deepEqual([...run('[state, scoreL, scoreR]')], ['over', 0, 7]);
// step() stops ticking once a tick ends the match (the ball is still past the edge)
play('{ x: 804, y: 100, vx: 6, vy: 0 }', 'scoreL = 6; acc = 0; step(34)');
assert.deepEqual([...run('[state, scoreL]')], ['over', 7]);

// Win: left at 6 scores -> over; winner names per mode; step frozen; Space -> 0-0 serve
play('{ x: 804, y: 100, vx: 6, vy: 0 }', 'scoreL = 6; scoreR = 3');
run('tick()');
assert.equal(run('state'), 'over');
run('step(1000)');
assert.equal(run('state'), 'over');
texts.length = 0;
run('render()');
assert.ok(texts.includes('You win') && texts.includes('Space to play again'));
assert.equal(els.status.textContent, 'You win 7-3. Press Space to play again.');
run('scoreL = 2; scoreR = 7; render()');
assert.ok(texts.includes('AI wins'));
run('twoPlayer = true; render()');
assert.ok(texts.includes('Right wins'));
run('scoreL = 7; scoreR = 5; render()');
assert.ok(texts.includes('Left wins'));
run('twoPlayer = false');
key('Space');
assert.deepEqual([...run('[state, scoreL, scoreR, leftY, rightY]')], ['serve', 0, 0, 210, 210]);

// 2 players via #two: arrows move the right paddle 6/tick, AI off; unchecking hands back to AI
els.two.checked = true;
listeners.input({ target: els.two });
assert.deepEqual([run('twoPlayer'), els.ai.disabled], [true, true]);
play('{ x: 400, y: 450, vx: 0, vy: 0 }');
run('tick()');
assert.equal(run('rightY'), 210, 'AI does not move it');
key('ArrowUp');
run('tick()');
assert.equal(run('rightY'), 204);
up('ArrowUp');
key('ArrowDown');
run('tick(); tick()');
assert.equal(run('rightY'), 216);
up('ArrowDown');
els.two.checked = false;
listeners.input({ target: els.two });
assert.deepEqual([run('twoPlayer'), els.ai.disabled], [false, false]);
run('tick()');
assert.equal(run('rightY'), 220, 'AI back');
// AI speed range applies at once, no match reset
run('scoreL = 3');
els.ai.value = '8';
listeners.input({ target: els.ai });
assert.deepEqual([run('aiSpeed'), run('scoreL'), run('state')], [8, 3, 'playing']);
run('tick()');
assert.equal(run('rightY'), 228);
els.ai.value = '4';
listeners.input({ target: els.ai });
// Mouse change blurs the checkbox; Space on the focused checkbox toggles it and does not serve
run('reset()');
focus.el = els.two;
els.two.checked = true;
listeners.input({ target: els.two });
assert.equal(focus.el, null, 'mouse change loses focus');
focus.el = els.two;
assert.equal(key('Space', { target: els.two }), true, 'Space prevented on the checkbox');
assert.deepEqual([els.two.checked, run('twoPlayer'), els.ai.disabled, run('state')], [false, false, false, 'serve']);
key('Space', { target: els.two });
assert.deepEqual([els.two.checked, run('twoPlayer'), run('state')], [true, true, 'serve']);

// preventDefault: Space always; arrows only in 2-player mode; others never
assert.equal(key('ArrowUp'), true);
assert.equal(key('ArrowDown'), true);
up('ArrowUp'); up('ArrowDown');
els.two.checked = false;
listeners.input({ target: els.two });
assert.deepEqual([key('ArrowUp'), key('ArrowDown'), key('KeyW'), key(undefined)], [false, false, false, false]);
up('ArrowUp'); up('ArrowDown'); up('KeyW');
let upPrevented = false;
listeners.keyup({ code: 'Space', preventDefault: () => { upPrevented = true; } });
assert.ok(upPrevented, 'Space keyup prevented');
assert.equal(key('Space'), true);
assert.equal(run('state'), 'playing');

// Beatable: AI at speed 4 misses a 60° edge return off the left paddle
// (paddle at 100..180, ball at its bottom edge, AI centred); at speed 8 the AI returns the same shot
play('{ x: 39, y: 185, vx: -5, vy: 0 }', 'leftY = 100');
for (let i = 0; i < 400 && run('state') === 'playing'; i++) run('tick()');
assert.deepEqual([...run('[scoreL, scoreR]')], [1, 0], 'AI missed the edge shot');
play('{ x: 39, y: 185, vx: -5, vy: 0 }', 'leftY = 100; aiSpeed = 8; tick()');
for (let i = 0; i < 400 && run('ball.vx') > 0; i++) run('tick()');
assert.deepEqual([...run('[scoreL, state]')], [0, 'playing'], 'AI at 8 returns it');
run('aiSpeed = 4');

// Fixed step: step(16) is no tick, one more ms is one
play('{ x: 400, y: 250, vx: 3, vy: 0 }', 'aiSpeed = 4');
run('step(16)');
assert.equal(ball()[0], 400);
run('step(1)');
assert.equal(ball()[0], 403);
// rAF jitter: 60 frames of 16.667 ± 0.2 ms run exactly one tick each
play('{ x: 100, y: 250, vx: 3, vy: 0 }');
for (let i = 0; i < 60; i++) {
  run(`step(${1000 / 60 + (i % 3 - 1) * 0.2})`);
  assert.equal(ball()[0], 103 + 3 * i, `frame ${i}`);
}
// frame() caps dt at 100 ms: a 5 s gap runs 5 ticks (6 × 1000/60 rounds just above 100)
play('{ x: 400, y: 250, vx: 3, vy: 0 }', 'last = null; frame(0); frame(5000)');
assert.equal(ball()[0], 415, 'dt cap');

// render() leaves state alone
play('{ x: 100, y: 300, vx: 2, vy: -3 }', 'scoreL = 2; scoreR = 4; leftY = 50; acc = 7');
const snap = () => run('JSON.stringify([state, scoreL, scoreR, leftY, rightY, ball, speed, acc, twoPlayer, aiSpeed, [...held]])');
const before = snap();
run('render()');
assert.equal(snap(), before, 'render() changed state');

// #status is written only when its text changes
run('reset(); render()');
const w = writes.status;
run('render()');
assert.equal(writes.status, w, 'unchanged status rewritten');
key('Space');
run('render(); render()');
assert.equal(els.status.textContent, 'Playing.');
assert.equal(writes.status, w + 1);

// rAF wiring: bootstraps once, each frame() re-queues; default harness stub loads too
const calls = [];
const f = load('./rallyline.html', { requestAnimationFrame: (cb) => calls.push(cb) });
assert.equal(calls.length, 1);
f.run('frame(0)');
assert.equal(calls.length, 2);
assert.ok(f.texts.includes('Space to serve'));

console.log('all rallyline tests passed');
