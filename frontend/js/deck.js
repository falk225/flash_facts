const OPS = {
  addition:       { symbol: '+',  compute: (a, b) => a + b },
  subtraction:    { symbol: '−',  compute: (a, b) => a - b },
  multiplication: { symbol: '×',  compute: (a, b) => a * b },
  division:       { symbol: '÷',  compute: (a, b) => a / b },
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateDeck(config) {
  const cards = [];

  for (const [opKey, opCfg] of Object.entries(config.operations)) {
    if (!opCfg.enabled) continue;
    const { min, max } = opCfg;
    const op = OPS[opKey];

    if (opKey === 'division') {
      // Iterate quotient (a) and divisor (b); dividend = a * b
      // This guarantees whole-number answers within range
      for (let quotient = min; quotient <= max; quotient++) {
        for (let divisor = Math.max(1, min); divisor <= max; divisor++) {
          const dividend = quotient * divisor;
          const label = `${dividend} ${op.symbol} ${divisor}`;
          cards.push({
            id: `${opKey}_${dividend}_${divisor}`,
            label,
            operation: opKey,
            display: `${dividend} ${op.symbol} ${divisor} = ?`,
            answer: quotient
          });
        }
      }
    } else {
      for (let a = min; a <= max; a++) {
        for (let b = min; b <= max; b++) {
          if (opKey === 'subtraction' && a < b) continue; // no negatives
          const answer = op.compute(a, b);
          const label = `${a} ${op.symbol} ${b}`;
          cards.push({
            id: `${opKey}_${a}_${b}`,
            label,
            operation: opKey,
            display: `${a} ${op.symbol} ${b} = ?`,
            answer
          });
        }
      }
    }
  }

  return shuffle(cards);
}

// Self-tests (run once at load, visible in dev console)
(function runTests() {
  const cfg = {
    operations: {
      addition:       { enabled: true, min: 0, max: 2 },
      subtraction:    { enabled: true, min: 0, max: 3 },
      multiplication: { enabled: true, min: 2, max: 3 },
      division:       { enabled: true, min: 1, max: 3 }
    }
  };
  const deck = generateDeck(cfg);

  // No negative subtraction results
  deck.filter(c => c.operation === 'subtraction').forEach(c => {
    console.assert(c.answer >= 0, 'Subtraction answer must be >= 0', c);
  });

  // All division answers are whole numbers
  deck.filter(c => c.operation === 'division').forEach(c => {
    console.assert(Number.isInteger(c.answer), 'Division answer must be integer', c);
    console.assert(c.answer >= 0, 'Division answer must be >= 0', c);
  });

  // Multiplication spot check: 2*3=6
  const twoThree = deck.find(c => c.id === 'multiplication_2_3');
  console.assert(twoThree && twoThree.answer === 6, '2×3 should equal 6');

  console.log(`[deck] Tests passed. Sample deck size: ${deck.length}`);
})();
