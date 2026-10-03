import assert from 'node:assert/strict';
import { test, vi, afterEach } from 'vitest';
import NumBase from '../src/numbase.ts';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
afterEach(() => vi.unstubAllGlobals());
const Legacy = require('./fixtures/numbase-0.1.1.cjs');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const huge = '9999999999999999999999999999999999999999999999999999999999999999';
const encodedHuge = 'isFUl3RMFVGKeLAbPmHOAA86LLjpGwei1jXh';
function referenceEncode(decimal, alphabet, radix) {
  let value = BigInt(decimal);
  const sign = value < 0n ? '-' : '';
  if (value < 0n) value = -value;
  let encoded = '';
  do {
    encoded = alphabet[Number(value % BigInt(radix))] + encoded;
    value /= BigInt(radix);
  } while (value);
  return sign + encoded;
}
test('matches the documented arbitrary-size and Chinese examples', () => {
  const base = new NumBase();
  assert.equal(base.encode(huge), encodedHuge);
  assert.equal(base.decode(encodedHuge), huge);
  const chinese = new NumBase('中国上海市徐汇区');
  assert.equal(chinese.encode(19901230), '国国海区上徐市徐汇');
  assert.equal(chinese.decode('国国海区上徐市徐汇'), '19901230');
  assert.equal(chinese.encode(19901230, 7), '海海国国中徐中海汇');
  assert.equal(chinese.decode('海海国国中徐中海汇', 7), '19901230');
});

test('agrees with an independent BigInt oracle for every radix through 62', () => {
  const base = new NumBase();
  const alphabet = base.BASE.join('');
  const values = ['0', '1', '-1', '10', '-10', '999999999999999', '1000000000000000', '9007199254740993', huge, '9876543210'.repeat(50)];
  for (let radix = 2; radix <= 62; radix++) {
    for (const decimal of values) {
      const encoded = referenceEncode(decimal, alphabet, radix);
      assert.equal(base.encode(decimal, radix), encoded, `${decimal.slice(0, 20)} radix ${radix}`);
      assert.equal(base.decode(encoded, radix), decimal);
    }
  }
});

test('round-trips deterministic varied decimal strings with custom alphabets', () => {
  let state = 0x12345678;
  function random() { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; }
  for (const alphabet of ['01', '0123456789abcdef', '中国上海市徐汇区', ' abcdefghijklmnopqrstuvwxyz!?']) {
    const base = new NumBase(alphabet);
    for (let i = 0; i < 80; i++) {
      let decimal = String(1 + random() % 9);
      const length = 1 + random() % 120;
      for (let j = 1; j < length; j++) decimal += random() % 10;
      if (i % 2) decimal = '-' + decimal;
      const radix = 2 + random() % (alphabet.length - 1);
      const encoded = referenceEncode(decimal, alphabet, radix);
      assert.equal(base.encode(decimal, radix), encoded);
      assert.equal(base.decode(encoded, radix), decimal);
    }
  }
});

test('preserves numeric/string inputs, negative zero, and leading-zero conventions', () => {
  const base = new NumBase();
  for (const number of [0, -0, 1, -1, 19901230, Number.MAX_SAFE_INTEGER]) {
    assert.equal(base.decode(base.encode(number)), String(number));
  }
  assert.equal(base.encode('-000'), '-0');
  assert.equal(base.encode('00010'), 'a');
  assert.equal(base.decode('000a'), '10');
  assert.equal(base.decode('-0'), '-0');
  assert.equal(base.encode(9007199254740993n), base.encode('9007199254740993'));
});

test('rejects invalid values and coercion instead of passing inputs through', () => {
  const base = new NumBase();
  for (const value of ['', '-', '1.5', '1e10', '12\n', null, undefined, true, {}, [], [12], Symbol('x')]) {
    assert.throws(() => base.encode(value), TypeError);
  }
  for (const value of [1.5, NaN, Infinity, -Infinity, 9007199254740993, 1e21, -1e21]) {
    assert.throws(() => base.encode(value), TypeError);
  }
  for (const radix of [null, 0, 1, -2, 63, 2.5, NaN, '2', '02', {}, true]) {
    assert.throws(() => base.encode('12', radix), RangeError);
    assert.throws(() => base.decode('12', radix), RangeError);
  }
});

test('constructor rejects invalid alphabets and defaults only when omitted', () => {
  assert.equal(new NumBase().MAX_BASE, 62);
  for (const alphabet of [null, '', false, 0, 'a', '001', '-01', '😀😁', true, 123, {}]) {
    assert.throws(() => new NumBase(alphabet), TypeError);
  }
});

test('published valid integer encodings remain compatible', () => {
  for (const alphabet of ['01', ' a!?', '0123456789', '中国上海市徐汇区']) {
    const base = new NumBase(alphabet), old = new Legacy(alphabet);
    for (const value of ['0', '-0', '123', '-123', huge]) {
      assert.equal(base.encode(value), old.encode(value));
      const encoded = old.encode(value);
      assert.equal(base.decode(encoded), old.decode(encoded));
    }
  }
});

test('supports a large unique BMP alphabet with exact arithmetic', () => {
  const alphabet = Array.from({ length: 4096 }, (_, i) => String.fromCharCode(0x1000 + i)).join('');
  const base = new NumBase(alphabet);
  const number = '1234567890'.repeat(30);
  const encoded = referenceEncode(number, alphabet, 4096);
  assert.equal(base.encode(number), encoded);
  assert.equal(base.decode(encoded), number);
});

for (const file of ['numbase.js', 'numbase.min.js']) {
  test(`${file}: browser global and AMD/CMD exports work`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../dist/', file), 'utf8');
    for (const sandbox of [{}, { window: {} }]) {
      vm.runInNewContext(source, sandbox);
      const Constructor = sandbox.window ? sandbox.window.NumBase : sandbox.NumBase;
      assert.equal(new Constructor().decode(new Constructor().encode(huge)), huge);
      const emoji = new Constructor('😀😁😂😃', { unicode: true });
      assert.equal(emoji.decode(emoji.encode('27')), '27');
      assert.equal(new Constructor('0123456789abcdef').convert('1b', emoji), '😁😂😃');
    }
    for (const loader of ['amd', 'cmd']) {
      let Constructor;
      const define = factory => { Constructor = factory(); };
      define[loader] = true;
      vm.runInNewContext(source, { define });
      assert.equal(new Constructor().encode(huge), encodedHuge);
      assert.equal(new Constructor('😀😁', { unicode: true }).decode('😁😁'), '3');
    }
  });
}

test('retains CommonJS/deep import shape and supplies opt-in native ESM', async () => {
  for (const file of ['numbase', 'numbase.min']) {
    assert.equal(new (require('../dist/' + file))().encode(huge), encodedHuge);
  }
  const { default: ESM } = await import(pathToFileURL(path.join(__dirname, '../dist/numbase.mjs')));
  assert.equal(new ESM().decode(encodedHuge), huge);
  // Exercise native Node's module cache, rather than Vitest's transformed imports.
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const require = createRequire(import.meta.url);
    const namespace = await import('./dist/numbase.min.js');
    assert.equal(namespace.default, require('./dist/numbase.min.js'));
  `], { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
});

test('legacy browser/CommonJS bundles retain ES5 syntax', () => {
  const { parse } = require('acorn');
  for (const file of ['numbase.js', 'numbase.min.js']) {
    parse(fs.readFileSync(path.join(__dirname, '../dist/', file), 'utf8'), { ecmaVersion: 5 });
  }
});

test('native arithmetic and no-BigInt bundles preserve exact results and sign/zero boundaries', () => {
  const constructors = [NumBase];
  for (const file of ['numbase.js', 'numbase.min.js']) {
    const sandbox = { BigInt: undefined };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/', file), 'utf8'), sandbox);
    constructors.push(sandbox.NumBase);
  }
  const values = ['0', '-0', '0'.repeat(40), '-' + '0'.repeat(40),
    '999999999999999', '1000000000000000', '9007199254740991',
    '9007199254740992', '9007199254740993', '-9007199254740993',
    '18446744073709551615', '340282366920938463463374607431768211455', huge];
  for (const Constructor of constructors) {
    const base = new Constructor();
    for (let radix = 2; radix <= 62; radix++) {
      for (const decimal of values) {
        const normalized = decimal[0] === '-' && BigInt(decimal) === 0n ? '-0' : BigInt(decimal).toString();
        const encoded = (decimal[0] === '-' && BigInt(decimal) === 0n ? '-' : '') + referenceEncode(decimal, base.BASE, radix);
        assert.equal(base.encode(decimal, radix), encoded);
        assert.equal(base.decode(encoded, radix), normalized);
      }
    }
    const emoji = new Constructor('😀😁😂😃', { unicode: true });
    const encoded = referenceEncode(huge, Array.from('😀😁😂😃'), 4);
    assert.equal(emoji.encode(huge), encoded);
    assert.equal(emoji.decode(encoded), huge);
  }
});

test('source fallback without BigInt matches exact native results for signed custom alphabets', () => {
  const vectors = [];
  for (const [alphabet, unicode] of [
    ['0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', false],
    ['中国上海市徐汇区', false],
    ['😀😁😂😃', true],
  ]) {
    for (const decimal of ['0', '-0', '00000123', '-00000123', '9007199254740993', huge]) {
      const base = new NumBase(alphabet, { unicode });
      vectors.push({ alphabet, unicode, decimal, encoded: base.encode(decimal), decoded: base.decode(base.encode(decimal)) });
    }
  }
  vi.stubGlobal('BigInt', undefined);
  for (const { alphabet, unicode, decimal, encoded, decoded } of vectors) {
    const base = new NumBase(alphabet, { unicode });
    assert.equal(base.encode(decimal), encoded);
    assert.equal(base.decode(encoded), decoded);
  }
});
