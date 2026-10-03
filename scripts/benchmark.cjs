const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const Current = require('..');
const Legacy = require(process.argv[2] || '../test/fixtures/numbase-0.1.1.cjs');
const decimal = '9876543210'.repeat(100);
const largeAlphabet = Array.from({ length: 4096 }, (_, i) => String.fromCharCode(0x1000 + i)).join('');
const current = new Current();
const legacy = new Legacy();
const currentLarge = new Current(largeAlphabet);
const legacyLarge = new Legacy(largeAlphabet);
const encoded = legacy.encode(decimal);
const encodedLarge = legacyLarge.encode(decimal);
function measurePair(before, after, iterations) {
  const functions = [before, after];
  for (let i = 0; i < 10; i++) { before(); after(); }
  const samples = [[], []];
  for (let sample = 0; sample < 7; sample++) {
    // Alternate order so warm-up, GC, and machine load do not always favor one build.
    for (const index of sample % 2 ? [1, 0] : [0, 1]) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) functions[index]();
      samples[index].push((performance.now() - start) / iterations);
    }
  }
  return samples.map(values => values.sort((a, b) => a - b)[3]);
}
const cases = [
  ['encode 1,000 decimal digits (base62)', () => legacy.encode(decimal), () => current.encode(decimal), 10],
  ['decode 1,000 decimal digits (base62)', () => legacy.decode(encoded), () => current.decode(encoded), 10],
  ['decode 1,000 decimal digits (base4096)', () => legacyLarge.decode(encodedLarge), () => currentLarge.decode(encodedLarge), 10],
  ['construct 4,096-symbol alphabet', () => new Legacy(largeAlphabet).MAX_BASE, () => new Current(largeAlphabet).MAX_BASE, 30],
  ['encode small integer (base62)', () => legacy.encode(19901230), () => current.encode(19901230), 20000],
  ['decode small integer (base62)', () => legacy.decode('1lvXA'), () => current.decode('1lvXA'), 20000],
];
console.log(`Node ${process.version}; median of 7 alternating paired samples, milliseconds per operation`);
for (const [name, before, after, iterations] of cases) {
  assert.deepEqual(after(), before());
  const [oldMs, newMs] = measurePair(before, after, iterations);
  console.log(`${name}: old=${oldMs.toFixed(4)} new=${newMs.toFixed(4)} ratio=${(oldMs / newMs).toFixed(2)}x`);
}
