import assert from 'node:assert/strict';
import { test, vi, afterEach } from 'vitest';
import NumBase from '../src/numbase.ts';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
afterEach(() => vi.unstubAllGlobals());
const { pathToFileURL } = require('node:url');
const path = require('node:path');

function reference(decimal, symbols, radix = symbols.length) {
  let value = BigInt(decimal);
  const sign = decimal[0] === '-' ? '-' : '';
  if (value < 0n) value = -value;
  let result = '';
  do {
    result = symbols[Number(value % BigInt(radix))] + result;
    value /= BigInt(radix);
  } while (value);
  return sign + result;
}

test('default encoding accepts exact strings, safe numbers, and bigint', () => {
  const base = new NumBase();
  for (const decimal of ['0', '-0', '0000123', '-0000123', '9007199254740993', '1234567890'.repeat(30)]) {
    assert.equal(base.encode(decimal), reference(decimal, base.BASE));
  }
  for (const value of [0, -0, 42, -42, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 9007199254740993n]) {
    assert.equal(base.encode(value), base.encode(String(value)));
  }
});

test('default encoding rejects rounded numbers, coercible objects, and incomplete decimal strings', () => {
  const base = new NumBase();
  for (const value of [Number.MAX_SAFE_INTEGER + 1, 1e21, NaN, Infinity, -Infinity, 0.1, null, undefined, true, {}, [12], Symbol('x')]) {
    assert.throws(() => base.encode(value), TypeError);
  }
  for (const value of ['', '-', '+1', ' 12', '12 ', '12\n', '12\r', '12\u2028', '12\u2029', '1.0', '1e3', '１２']) {
    assert.throws(() => base.encode(value), TypeError);
  }
  assert.throws(() => base.encode('1.0'), TypeError);
  assert.throws(() => base.encode(Number.MAX_SAFE_INTEGER + 1), TypeError);
});

test('default decoding rejects missing digits and unsupported symbols', () => {
  const base = new NumBase('0123456789abcdef');
  assert.equal(base.decode('000f'), '15');
  assert.equal(base.decode('-00f'), '-15');
  assert.equal(base.decode('-0'), '-0');
  for (const value of ['', '-', 10, null, undefined, {}, 'g', '1-0']) {
    assert.throws(() => base.decode(value), TypeError);
  }
  assert.throws(() => base.decode('2', 2), /base limit/);
  assert.throws(() => base.decode(''), TypeError);
  assert.throws(() => base.decode('-'), TypeError);
});

test('radices default to alphabet length and accept explicit numeric overrides', () => {
  const base = new NumBase('0123456789abcdef');
  for (const radix of [null, '2', '02', 0, 1, -2, 17, 2.5, NaN, Infinity, {}, true]) {
    assert.throws(() => base.encode('10', radix), RangeError);
    assert.throws(() => base.decode('10', radix), RangeError);
  }
  assert.equal(base.MAX_BASE, 16);
  assert.equal(base.encode('10'), 'a');
  assert.equal(base.encode('10', 4), '22');
  assert.equal(base.decode('22', 4), '10');
  assert.equal(base.decode('22'), '34');
});

test('alphabet and default radix are immutable at runtime', () => {
  for (const [alphabet, options] of [['0123', undefined], ['😀😁😂😃', { unicode: true }]]) {
    const base = new NumBase(alphabet, options);
    const encoded = base.encode('9007199254740993');
    assert.ok(Object.isFrozen(base.BASE));
    assert.throws(() => { base.BASE[0] = 'x'; }, TypeError);
    assert.throws(() => { base.BASE = ['a', 'b']; }, TypeError);
    assert.throws(() => { base.MAX_BASE = 2; }, TypeError);
    assert.throws(() => { base.BASE.reverse(); }, TypeError);
    assert.throws(() => { base.BASE.push('x'); }, TypeError);
    assert.throws(() => Object.defineProperty(base, 'BASE', { value: ['a', 'b'] }), TypeError);
    assert.throws(() => Object.defineProperty(base, 'MAX_BASE', { value: 2 }), TypeError);
    assert.equal(base.encode('9007199254740993'), encoded);
    assert.equal(base.decode(encoded), '9007199254740993');
    assert.deepEqual(Object.keys(base), ['BASE', 'MAX_BASE']);
  }
});

test('native radix formatting respects the selected alphabet prefix', () => {
  const decimal = '18446744073709551615';
  for (const alphabet of ['0123456789abcdef', '0123456789ABCDEF', 'fedcba9876543210', '0123ZYXWVUTSRQPO', '0x']) {
    const base = new NumBase(alphabet);
    for (let radix = 2; radix <= base.MAX_BASE; radix++) {
      const encoded = reference(decimal, base.BASE, radix);
      assert.equal(base.encode(decimal, radix), encoded);
      assert.equal(base.decode(encoded, radix), decimal);
    }
  }
});

test('convert handles huge values, signs, normalization, and explicit radices', () => {
  const source = new NumBase('0123456789abcdef');
  const target = new NumBase();
  for (const decimal of ['0', '-0', '123', '-123', '9007199254740993', '9876543210'.repeat(40)]) {
    const hexadecimal = reference(decimal, source.BASE);
    assert.equal(source.convert(hexadecimal, target), reference(decimal, target.BASE));
    assert.equal(target.convert(target.encode(decimal), source), hexadecimal);
  }
  assert.equal(source.convert('000f', target), 'f');
  assert.equal(source.convert('1010', target, { sourceRadix: 2, targetRadix: 8 }), '12');
  assert.equal(source.convert('1010', source, { sourceRadix: 2, targetRadix: 16 }), 'a');
});

test('convert validates both ends instead of silently passing invalid input through', () => {
  const base = new NumBase();
  for (const target of [null, {}, { encode: 42 }]) {
    assert.throws(() => base.convert('a', target), TypeError);
  }
  assert.throws(() => base.convert('', base), TypeError);
  assert.throws(() => base.convert('?', base), TypeError);
  assert.throws(() => base.convert('a', base, { sourceRadix: 1 }), RangeError);
  assert.throws(() => base.convert('a', base, { targetRadix: 1 }), RangeError);
  assert.throws(() => new NumBase('-01'), TypeError);
});

test('Unicode mode counts and converts complete code points', () => {
  const alphabet = '😀😁😂😃😊🚀中国';
  const base = new NumBase(alphabet, { unicode: true });
  assert.equal(base.MAX_BASE, 8);
  assert.deepEqual(base.BASE, Array.from(alphabet));
  for (let radix = 2; radix <= base.MAX_BASE; radix++) {
    for (const decimal of ['0', '-0', '1', '123', '-123', '9007199254740993', '1234567890'.repeat(20)]) {
      const encoded = reference(decimal, Array.from(alphabet), radix);
      assert.equal(base.encode(decimal, radix), encoded);
      const normalized = decimal === '-0' ? '-0' : BigInt(decimal).toString();
      assert.equal(base.decode(encoded, radix), normalized);
    }
  }
});

test('Unicode conversion interoperates with legacy BMP and ASCII alphabets', () => {
  const emoji = new NumBase('😀😁😂😃😊🚀中国', { unicode: true });
  const hexadecimal = new NumBase('0123456789abcdef');
  for (const decimal of ['0', '-0', '123', '-123', '999999999999999999999999999999']) {
    const encoded = emoji.encode(decimal);
    assert.equal(emoji.convert(encoded, hexadecimal), hexadecimal.encode(decimal));
    assert.equal(hexadecimal.convert(hexadecimal.encode(decimal), emoji), encoded);
  }
  const oldBMP = new NumBase('中国上海市徐汇区');
  const unicodeBMP = new NumBase('中国上海市徐汇区', { unicode: true });
  assert.equal(oldBMP.encode('19901230'), unicodeBMP.encode('19901230'));
});

test('Unicode mode rejects duplicate symbols, lone surrogates, and malformed digits', () => {
  for (const alphabet of ['😀😀', '\ud8000', '0\udc00', '\ud800\ud800', '\udc00\ud800']) {
    assert.throws(() => new NumBase(alphabet, { unicode: true }), TypeError);
  }
  const base = new NumBase('😀😁', { unicode: true });
  for (const encoded of ['\ud800', '\udc00', '😀\ud800', '\udc00😁', '😃']) {
    assert.throws(() => base.decode(encoded), TypeError);
  }
  assert.throws(() => new NumBase('01', { unicode: 'yes' }), TypeError);
});

test('Unicode means code points, not grapheme clusters or normalization', () => {
  const flags = new NumBase('🇨🇳🇺🇸', { unicode: true });
  assert.equal(flags.MAX_BASE, 4);
  assert.equal(new NumBase('e\u0301é', { unicode: true }).MAX_BASE, 3);
  assert.throws(() => new NumBase('😀😁'), /unique/);
  assert.deepEqual(Object.keys(new NumBase()), ['BASE', 'MAX_BASE']);
});

test('conversion works across CommonJS and native ESM constructors', async () => {
  const { default: ESM } = await import(pathToFileURL(path.join(__dirname, '../dist/numbase.mjs')));
  const cjs = new NumBase('0123456789abcdef');
  const esm = new ESM('😀😁😂😃', { unicode: true });
  assert.equal(esm.convert(cjs.convert('ffff', esm), cjs), 'ffff');
});

test('Unicode alphabets can exceed the UTF-16 single-unit symbol space', () => {
  const symbols = Array.from({ length: 70000 }, (_, i) => String.fromCodePoint(0x10000 + i));
  const base = new NumBase(symbols.join(''), { unicode: true });
  const decimal = '9876543210'.repeat(20);
  const encoded = reference(decimal, symbols);
  assert.equal(base.MAX_BASE, 70000);
  assert.equal(base.encode(decimal), encoded);
  assert.equal(base.decode(encoded), decimal);
});

test('new configuration rejects malformed options and preserves the selected mode', () => {
  const base = new NumBase();
  for (const options of [null, false, 1, 'unicode']) {
    assert.throws(() => new NumBase('01', options), TypeError);
    assert.throws(() => base.convert('a', base, options), TypeError);
  }
  for (const alphabet of [1, true, {}, ['😀', '😁']]) {
    assert.throws(() => new NumBase(alphabet, { unicode: true }), TypeError);
  }
  const options = { unicode: true };
  const unicode = new NumBase('😀😁', options);
  options.unicode = false;
  assert.equal(unicode.decode('😁😁'), '3');
});
