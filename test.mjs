// Self-check for stackfall.html: runs its <script> in node:vm with a stub DOM and asserts the spec's I/O matrix.
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const { run, key, listeners, texts } = load('./stackfall.html');

// Bag: 14 draws are two permutations of all 7
run('reset(); bag = []');
const draws = JSON.parse(run('JSON.stringify(Array.from({ length: 14 }, takeFromBag))'));  // cross-realm arrays -> plain
for (const half of [draws.slice(0, 7), draws.slice(7)]) assert.deepEqual([...half].sort(), [0, 1, 2, 3, 4, 5, 6]);
// Bags are shuffled: 20 bags all in one order would mean no shuffle (chance ~0 if random)
const many = JSON.parse(run('bag = []; JSON.stringify(Array.from({ length: 140 }, takeFromBag))'));
assert.ok(new Set(Array.from({ length: 20 }, (_, i) => many.slice(i * 7, i * 7 + 7).join())).size > 1, 'bag not shuffled');

// Rotation does not mutate the shared shape table
run('reset(); spawn(5); tryRotate()');
assert.equal(run('JSON.stringify(SHAPES[5])'), '[[0,1,0],[1,1,1],[0,0,0]]');
assert.equal(run('JSON.stringify(cur.m)'), '[[0,1,0],[0,1,1],[0,1,0]]'); // clockwise

// Wall kick: vertical I (cells in matrix column 2), rotating back to horizontal
run('reset(); spawn(0); tryRotate(); cur.y = 5; cur.x = -1');   // cell in board col 1 -> needs x+1
assert.equal(run('tryRotate()'), true);
assert.equal(run('cur.x'), 0);
run('reset(); spawn(0); tryRotate(); cur.y = 5; cur.x = -2');   // flush against wall: no kick fits
const before = run('JSON.stringify(cur.m)');
assert.equal(run('tryRotate()'), false);
assert.equal(run('cur.x'), -2);
assert.equal(run('JSON.stringify(cur.m)'), before);
run('reset(); spawn(0); tryRotate(); cur.y = 5; cur.x = 3; board[7][6] = 1'); // obstacle blocks in-place and x+1 -> x-1
assert.equal(run('tryRotate()'), true);
assert.equal(run('cur.x'), 2);
run('reset(); spawn(0); tryRotate(); cur.y = 5; cur.x = 3; board[7][3] = 1'); // obstacle blocks in-place and x-1 -> x+1
assert.equal(run('tryRotate()'), true);
assert.equal(run('cur.x'), 4);

// Up kick: flat pieces resting on the floor can still rotate
run('reset(); spawn(5); cur.y = 18');
assert.equal(run('resting()'), true);
assert.equal(run('tryRotate()'), true);
assert.equal(run('cur.y'), 17);
run('reset(); spawn(0); cur.y = 18'); // flat I on floor needs up two
assert.equal(run('tryRotate()'), true);
assert.equal(run('cur.y'), 16);

// Floor: piece stops with its lowest cell on row 19
run('reset(); while (!resting()) step(1000)');
const maxRow = run('cur.y + Math.max(...cur.m.flatMap((r, y) => r.some(Boolean) ? [y] : []))');
assert.equal(maxRow, 19);

// Lock delay: locks at >= 500ms resting, not before
const piece = run('cur');
run('step(499)');
assert.equal(run('cur'), piece, 'locked too early');
run('step(1)');
assert.notEqual(run('cur'), piece, 'did not lock at 500ms');
assert.ok(run('board[19].some(Boolean)'));

// Lock delay restart on move, capped at 15
run('reset(); spawn(3); cur.y = 18; step(0)'); // O piece resting on floor
for (let i = 0; i < 15; i++) { run('step(400)'); key(i % 2 ? 'ArrowLeft' : 'ArrowRight'); }
const o = run('cur');
run('step(400)'); key('ArrowRight'); // 16th move: no more restarts
run('step(100)');
assert.notEqual(run('cur'), o, 'lock delay reset not capped');

// Lock delay restart on rotate (vertical T resting on floor can rotate back to flat)
run('reset(); spawn(5); tryRotate(); cur.y = 17; step(0)');
const tr = run('cur');
run('step(400)'); key('ArrowUp');
assert.equal(run('JSON.stringify(cur.m)'), '[[0,0,0],[1,1,1],[0,1,0]]');
run('step(400)');
assert.equal(run('cur'), tr, 'rotate did not restart lock timer');

// Lock cap can't be dodged by stepping off and back onto a ledge
run('reset(); board[10][4] = 1; spawn(3); cur.x = 4; cur.y = 8; step(0)'); // O resting on 1-wide ledge
const ledge = run('cur');
for (let i = 0; i < 100 && run('cur') === ledge; i++) { run('step(16)'); key('ArrowRight'); run('step(16)'); key('ArrowLeft'); }
assert.notEqual(run('cur'), ledge, 'ledge stalling never locked');

// Past the cap, falling to a new lowest row still gets a fresh 500ms
run('reset(); board[10][4] = 1; spawn(3); cur.x = 4; cur.y = 8; step(0); lockResets = 15');
key('ArrowRight'); // off the ledge
run('while (!resting()) step(16)');
const fell = run('cur');
assert.equal(run('cur.y'), 18);
run('step(499)');
assert.equal(run('cur'), fell, 'locked on landing after cap');
run('step(1)');
assert.notEqual(run('cur'), fell, 'did not lock 500ms after landing');

// Gravity uses the level's interval
run('reset(); level = 3; spawn(1)');
const gy0 = run('cur.y');
run('step(interval() - 1)');
assert.equal(run('cur.y'), gy0);
run('step(1)');
assert.equal(run('cur.y'), gy0 + 1);

// Soft drop: one row, nothing when resting
run('reset()');
const sy = run('cur.y');
key('ArrowDown');
assert.equal(run('cur.y'), sy + 1);
run('while (!resting()) cur.y++');
const ry = run('cur.y');
key('ArrowDown');
assert.equal(run('cur.y'), ry);

// Locked cells store type + 1
run('reset(); spawn(2); hardDrop()');
assert.ok(run('board.flat().filter(Boolean).every(v => v === 3)'));

// Clear 4 at level 2: +1600, rows above shift down
run(`reset(); level = 2; lines = 10;
  for (let y = 16; y < 20; y++) board[y].fill(1);
  board[15][0] = 2; clearLines()`);
assert.equal(run('score'), 1600);
assert.equal(run('lines'), 14);
assert.equal(run('board[19][0]'), 2);
assert.equal(run('board.flat().filter(Boolean).length'), 1);

// Level up: 9 -> 10 lines
run('reset(); lines = 9');
const slow = run('interval()');
run('board[19].fill(1); clearLines()');
assert.equal(run('level'), 2);
assert.ok(run('interval()') < slow);
assert.equal(slow, 1000);

// Spawn collision: game over, input ignored except R, overlay drawn
run('reset(); score = 500; lines = 12; level = 2; for (let y = 0; y < 4; y++) { board[y].fill(1); board[y][9] = 0 } spawnNext()');
assert.equal(run('gameOver'), true);
const frozen = run('JSON.stringify(board)'), stuck = run('cur');
run('step(600); step(600)'); // first step only starts the lock timer
assert.equal(run('cur'), stuck, 'piece locked after game over');
assert.equal(run('JSON.stringify(board)'), frozen, 'board changed after game over');
const x0 = run('cur.x');
key('ArrowLeft'); key('Space'); key('KeyC');
assert.equal(run('cur.x'), x0);
assert.equal(run('held'), null);
run('render()');
assert.ok(texts.includes('Game over'));
key('KeyR');
assert.equal(run('gameOver'), false);
assert.equal(run('board.flat().some(Boolean)'), false);
assert.deepEqual([run('score'), run('lines'), run('level')], [0, 0, 1]);

// Hold twice: second press ignored; works again after lock
run('reset()');
const t0 = run('cur.type');
key('KeyC');
assert.equal(run('held'), t0);
const t1 = run('cur.type');
key('ShiftLeft');
assert.equal(run('held'), t0);
assert.equal(run('cur.type'), t1);
key('Space');
const t2 = run('cur.type');
key('KeyC');
assert.equal(run('held'), t2);
assert.equal(run('cur.type'), t0);

// Hard drop lands on ghost and locks immediately
run('reset()');
const gy = run('ghostY()'), p = run('cur');
const expected = JSON.stringify(JSON.parse(run('JSON.stringify(cur.m.flatMap((r, y) => r.flatMap((v, x) => v ? [[cur.x + x, ghostY() + y]] : [])))')).sort());
key('Space');
assert.notEqual(run('cur'), p);
const filled = JSON.stringify(JSON.parse(run('JSON.stringify(board.flatMap((r, y) => r.flatMap((v, x) => v ? [[x, y]] : [])))')).sort());
assert.equal(filled, expected, 'locked cells not at ghost row');
assert.ok(gy > 10);

// Auto-repeat ignored for rotate, hard drop and hold; moves still repeat
const held_key = (code) => key(code, true);
run('reset(); spawn(5)');
const rm = run('JSON.stringify(cur.m)'), rp = run('cur'), rx = run('cur.x');
for (const code of ['ArrowUp', 'Space', 'KeyC', 'ShiftLeft']) held_key(code);
assert.equal(run('JSON.stringify(cur.m)'), rm, 'repeat rotated');
assert.equal(run('cur'), rp, 'repeat dropped or held');
assert.equal(run('held'), null);
held_key('ArrowLeft');
assert.equal(run('cur.x'), rx - 1);

// Game keys prevent page scroll
let prevented = 0;
for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'])
  listeners.keydown({ code, preventDefault: () => prevented++ });
assert.equal(prevented, 5);
for (const code of ['KeyR', 'F5', 'Tab', 'KeyA'])
  listeners.keydown({ code, preventDefault: () => prevented++ });
assert.equal(prevented, 5, 'non-game key prevented');

console.log('all tests passed');
