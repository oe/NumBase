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
const alphabet = current.BASE.join('');
const digitIndexes = Object.fromEntries(Array.from(alphabet, (symbol, i) => [symbol, BigInt(i)]));
// A minimal positive-integer reference, with the same Base62 alphabet.
function nativeEncode(decimal) {
  let value = BigInt(decimal);
  const digits = [];
  do {
    digits.push(alphabet[Number(value % 62n)]);
    value /= 62n;
  } while (value);
  return digits.reverse().join('');
}
function nativeDecode(encoded) {
  let value = 0n;
  for (const symbol of encoded) value = value * 62n + digitIndexes[symbol];
  return value.toString();
}
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
const hexadecimal = new Current('0123456789abcdef');
const bmp = new Current('中国上海市徐汇区');
const unicodeBMP = new Current('中国上海市徐汇区', { unicode: true });
const emoji = new Current('😀😁😂😃😊🚀中国', { unicode: true });
const bmpEncoded = bmp.encode(decimal);
const emojiEncoded = emoji.encode(decimal);
cases.push(
  ['manual pipeline vs convert (1,000 digits)', () => hexadecimal.encode(current.decode(encoded)), () => current.convert(encoded, hexadecimal), 10],
  ['UTF16 vs Unicode BMP decode (1,000 digits)', () => bmp.decode(bmpEncoded), () => unicodeBMP.decode(bmpEncoded), 10],
  ['BMP vs emoji code-point decode (1,000 digits)', () => unicodeBMP.decode(bmpEncoded), () => emoji.decode(emojiEncoded), 10],
);
console.log(`Node ${process.version}; median of 7 alternating paired samples, milliseconds per operation`);
console.log('Selected baseline vs current (or the two named paths for feature overhead):');
for (const [name, before, after, iterations] of cases) {
  assert.deepEqual(after(), before());
  const [oldMs, newMs] = measurePair(before, after, iterations);
  console.log(`${name}: before=${oldMs.toFixed(6)} after=${newMs.toFixed(6)} ratio=${(oldMs / newMs).toFixed(2)}x`);
}
console.log('Practical IDs: selected baseline vs current');
for (const [name, value] of [
  ['small integer control', '19901230'],
  ['64-bit ID', '18446744073709551615'],
  ['128-bit ID', '340282366920938463463374607431768211455'],
]) {
  const encoded = current.encode(value);
  for (const [operation, before, after] of [
    ['encode', () => legacy.encode(value), () => current.encode(value)],
    ['decode', () => legacy.decode(encoded), () => current.decode(encoded)],
  ]) {
    assert.equal(after(), before());
    const [oldMs, newMs] = measurePair(before, after, 5000);
    console.log(`${name} ${operation}: baseline=${oldMs.toFixed(6)} current=${newMs.toFixed(6)} ratio=${(oldMs / newMs).toFixed(2)}x`);
  }
}
console.log('Minimal BigInt reference vs current: identical positive Base62 values, reference excludes validation');
for (const [name, value, iterations] of [
  ['64-bit ID', '18446744073709551615', 5000],
  ['128-bit ID', '340282366920938463463374607431768211455', 5000],
  ['1,000 decimal digits', decimal, 10],
]) {
  const encoded = current.encode(value);
  for (const [operation, reference, after] of [
    ['encode', () => nativeEncode(value), () => current.encode(value)],
    ['decode', () => nativeDecode(encoded), () => current.decode(encoded)],
  ]) {
    assert.equal(after(), reference());
    const [referenceMs, currentMs] = measurePair(reference, after, iterations);
    console.log(`${name} ${operation}: reference=${referenceMs.toFixed(6)} current=${currentMs.toFixed(6)} ratio=${(referenceMs / currentMs).toFixed(2)}x`);
  }
}
