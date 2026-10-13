// Run with: node --test tests/js/
// deck.js is a plain browser script (no exports), so it is loaded into a vm
// context and its top-level functions are read off that context.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DECK_JS = path.join(__dirname, '..', '..', 'frontend', 'js', 'deck.js');

function loadDeck({ random } = {}) {
  const failures = [];
  const context = vm.createContext({
    console: {
      log() {},
      assert(cond, ...msg) { if (!cond) failures.push(msg); },
    },
  });
  if (random) vm.runInContext('Math', context).random = random;
  vm.runInContext(fs.readFileSync(DECK_JS, 'utf8'), context, { filename: DECK_JS });
  return { generateDeck: context.generateDeck, shuffle: context.shuffle, failures };
}

const { generateDeck, shuffle, failures: selfTestFailures } = loadDeck();

function config(enabled) {
  const ops = {
    addition:       { enabled: false, min: 0, max: 10 },
    subtraction:    { enabled: false, min: 0, max: 10 },
    multiplication: { enabled: false, min: 2, max: 10 },
    division:       { enabled: false, min: 1, max: 10 },
  };
  for (const [op, range] of Object.entries(enabled)) ops[op] = { enabled: true, ...range };
  return { operations: ops };
}

test('built-in console self-tests pass at load', () => {
  assert.deepEqual(selfTestFailures, []);
});

test('addition covers every pair in range exactly once', () => {
  const deck = generateDeck(config({ addition: { min: 0, max: 2 } }));

  assert.equal(deck.length, 9);
  assert.equal(new Set(deck.map(c => c.id)).size, 9);
  for (const c of deck) {
    const [a, b] = c.label.split(' + ').map(Number);
    assert.equal(c.answer, a + b);
    assert.equal(c.display, `${c.label} = ?`);
    assert.equal(c.operation, 'addition');
  }
});

test('subtraction never produces a negative answer', () => {
  const deck = generateDeck(config({ subtraction: { min: 0, max: 10 } }));

  assert.equal(deck.length, 66); // pairs with a >= b out of 0..10
  for (const c of deck) assert.ok(c.answer >= 0, c.label);
});

test('multiplication answers are correct', () => {
  const deck = generateDeck(config({ multiplication: { min: 2, max: 9 } }));

  assert.equal(deck.length, 64);
  const card = deck.find(c => c.id === 'multiplication_7_8');
  assert.equal(card.answer, 56);
  assert.equal(card.label, '7 × 8');
});

test('division always has whole-number answers and never divides by zero', () => {
  const deck = generateDeck(config({ division: { min: 0, max: 12 } }));

  assert.ok(deck.length > 0);
  for (const c of deck) {
    const [dividend, divisor] = c.label.split(' ÷ ').map(Number);
    assert.notEqual(divisor, 0, c.label);
    assert.ok(Number.isInteger(c.answer), c.label);
    assert.equal(dividend / divisor, c.answer, c.label);
    assert.ok(c.answer >= 0 && c.answer <= 12, c.label);
  }
});

test('disabled operations contribute no cards', () => {
  const deck = generateDeck(config({ addition: { min: 0, max: 3 }, division: { min: 1, max: 3 } }));
  const ops = new Set(deck.map(c => c.operation));

  assert.deepEqual([...ops].sort(), ['addition', 'division']);
});

test('nothing enabled gives an empty deck', () => {
  // length, not deepEqual: the array comes from the vm realm, whose Array.prototype differs.
  assert.equal(generateDeck(config({})).length, 0);
});

test('ids are unique across a mixed deck', () => {
  const deck = generateDeck(config({
    addition: { min: 0, max: 10 }, subtraction: { min: 0, max: 10 },
    multiplication: { min: 0, max: 12 }, division: { min: 1, max: 12 },
  }));

  assert.equal(new Set(deck.map(c => c.id)).size, deck.length);
});

test('shuffle returns a permutation of its input, in place', () => {
  const input = Array.from({ length: 50 }, (_, i) => i);
  const arr = [...input];

  const out = shuffle(arr);

  assert.equal(out, arr);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});

test('shuffle is a Fisher-Yates: each position draws from the unshuffled prefix', () => {
  // With Math.random() always ~1, j === i at every step, so nothing moves.
  const high = loadDeck({ random: () => 0.9999 });
  assert.deepEqual(high.shuffle([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);

  // With Math.random() always 0, j === 0: each element is swapped with the front,
  // which rotates the array by one.
  const low = loadDeck({ random: () => 0 });
  assert.deepEqual(low.shuffle([1, 2, 3, 4, 5]), [2, 3, 4, 5, 1]);
});

test('shuffle is roughly uniform', () => {
  // 3 elements -> 6 orderings; each should appear about 1/6 of the time.
  const counts = new Map();
  const runs = 60000;
  for (let i = 0; i < runs; i++) {
    const key = shuffle(['a', 'b', 'c']).join('');
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  assert.equal(counts.size, 6);
  for (const [key, n] of counts) {
    assert.ok(Math.abs(n / runs - 1 / 6) < 0.01, `${key}: ${n}`);
  }
});
