// Self-check for snake.html: runs its <script> in node:vm with a stub DOM and asserts the core rules.
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const store = { snakeHighScore: '30' };
const localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const { run, key, listeners, texts } = load('./snake.html', { localStorage });
const head = () => run('JSON.stringify(snake[0])');

// Start: length 3, head at centre, moving right, high score loaded
run('reset()');
assert.equal(run('snake.length'), 3);
assert.equal(head(), '{"x":10,"y":10}');
assert.equal(run('highScore'), 30);

// Timing: one tick per 1000/8 = 125ms
run('reset(); food = {x: 0, y: 0}');
run('step(124)');
assert.equal(head(), '{"x":10,"y":10}');
run('step(1)');
assert.equal(head(), '{"x":11,"y":10}');

// No 180° reversal, not even via two keys within one tick
run('reset(); food = {x: 0, y: 0}');
key('ArrowLeft');
assert.equal(run('nextDir'), 'right');
key('KeyW'); key('ArrowLeft'); // up is queued, left still checked against current 'right'
assert.equal(run('nextDir'), 'up');
run('tick()');
assert.equal(head(), '{"x":10,"y":9}');

// Eating grows and scores; every 50 points speeds up by 0.5
run('reset(); food = {x: 11, y: 10}; tick()');
assert.deepEqual([run('snake.length'), run('score'), run('speed')], [4, 10, 8]);
run('score = 40; food = {x: 12, y: 10}; tick()');
assert.deepEqual([run('score'), run('speed')], [50, 8.5]);
assert.ok(!run('snake.some(s => s.x === food.x && s.y === food.y)'), 'food placed on snake');

// Wall kills; high score saved only when beaten
run('reset(); snake = [{x: 19, y: 0}, {x: 18, y: 0}, {x: 17, y: 0}]; score = 40; tick()');
assert.equal(run('gameOver'), true);
assert.equal(store.snakeHighScore, '40');
run('reset(); snake = [{x: 19, y: 0}, {x: 18, y: 0}, {x: 17, y: 0}]; score = 10; tick()');
assert.equal(store.snakeHighScore, '40');

// Wrap-around: same move comes out the other side; toggle survives restart
key('KeyT');
run('reset(); snake = [{x: 19, y: 0}, {x: 18, y: 0}, {x: 17, y: 0}]; food = {x: 5, y: 5}; tick()');
assert.equal(run('gameOver'), false);
assert.equal(head(), '{"x":0,"y":0}');
key('KeyT');
assert.equal(run('wrap'), false);

// Moving into the tail cell is legal (it moves away); into the body is not
run('reset(); snake = [{x: 5, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}, {x: 6, y: 5}]; dir = "up"; nextDir = "right"; food = {x: 0, y: 0}; tick()');
assert.equal(run('gameOver'), false);
run('reset(); snake = [{x: 5, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}, {x: 6, y: 5}, {x: 7, y: 5}]; dir = "up"; nextDir = "right"; food = {x: 0, y: 0}; tick()');
assert.equal(run('gameOver'), true);

// Pause stops time; holding P doesn't flicker it
run('reset(); food = {x: 0, y: 0}');
key('KeyP');
run('step(1000)');
assert.equal(head(), '{"x":10,"y":10}');
key('KeyP', true);
assert.equal(run('paused'), true);
run('render()');
assert.ok(texts.includes('Paused'));
key('KeyP');
run('step(125)');
assert.equal(head(), '{"x":11,"y":10}');

// Filling the board is a win, not a plain game over
run(`reset();
  const path = [];
  for (let y = 0; y < GRID; y++) for (let i = 0; i < GRID; i++) path.push({ x: y % 2 ? GRID - 1 - i : i, y });
  snake = path.slice(0, -1).reverse(); food = path[path.length - 1]; dir = nextDir = 'left'; tick()`);
assert.deepEqual([run('gameOver'), run('won'), run('snake.length')], [true, true, 400]);
texts.length = 0;
run('render()');
assert.ok(texts.includes('You win!'));

// Game over: input frozen except Space, which restarts
run('reset(); snake = [{x: 19, y: 0}, {x: 18, y: 0}, {x: 17, y: 0}]; tick()');
key('ArrowDown'); key('KeyP');
assert.deepEqual([run('nextDir'), run('paused')], ['right', false]);
texts.length = 0;
run('render()');
assert.ok(texts.includes('Game Over'));
key('Space');
assert.deepEqual([run('gameOver'), run('score'), run('snake.length')], [false, 0, 3]);

// Game keys prevent page scroll; others don't
let prevented = 0;
for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'])
  listeners.keydown({ code, preventDefault: () => prevented++ });
assert.equal(prevented, 5);
for (const code of ['KeyP', 'KeyT', 'KeyW', 'F5', 'Tab'])
  listeners.keydown({ code, preventDefault: () => prevented++ });
assert.equal(prevented, 5, 'non-game key prevented');

console.log('all snake tests passed');
