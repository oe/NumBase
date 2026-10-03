const assert = require('node:assert/strict');
const { test } = require('node:test');
const NumBase = require('..');
const Legacy = require('./fixtures/numbase-0.1.1.cjs');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

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
function outcome(callback) {
  try { return { value: callback() }; }
  catch (error) { return { type: error.name, message: error.message }; }
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

test('retains legacy invalid-input passthrough and exception behavior', () => {
  const base = new NumBase();
  const old = new Legacy();
  const values = ['', '-', '1.5', '1e10', '12\n', '12\r', '12\u2028', '12\u2029', 1.5, NaN, Infinity, -Infinity, null, undefined, true, {}, [], [12], Symbol('x'), 10n];
  const radices = [undefined, null, 0, 1, -2, 63, 2.5, NaN, '2', '02', '2\n', {}, true];
  for (const radix of radices) {
    for (const value of values) {
      assert.deepEqual(outcome(() => base.encode(value, radix)), outcome(() => old.encode(value, radix)));
      assert.deepEqual(outcome(() => base.decode(value, radix)), outcome(() => old.decode(value, radix)));
    }
  }
  assert.throws(() => base.encode(1e21), /super big/);
  assert.throws(() => base.encode(-1e21), /super big/);
});

test('retains alphabet validation and default selection', () => {
  for (const alphabet of [undefined, null, '', false, 0, 'a', '001', '😀😁', '0123456789', '中国上海市徐汇区', true, 123, {}]) {
    const current = outcome(() => new NumBase(alphabet).BASE);
    const legacy = outcome(() => new Legacy(alphabet).BASE);
    if (alphabet && typeof alphabet !== 'string') assert.equal(current.type, legacy.type);
    else assert.deepEqual(current, legacy);
  }
  assert.throws(() => new NumBase('001'), /duplicated character <0>/);
  assert.equal(new NumBase('').MAX_BASE, 62);
  assert.equal(new NumBase('a').encode('123'), '123');
});

test('preserves malformed decode errors, unusual alphabets, and mutable BASE', () => {
  for (const alphabet of ['01', '-01', ' a!?', '__proto__', '0123456789']) {
    const result = outcome(() => new NumBase(alphabet));
    if (!result.value) continue;
    const base = result.value;
    const old = new Legacy(alphabet);
    for (const value of ['', '-', '--', '0', ' 0', 'a', '!?', 'z', '-010']) {
      assert.deepEqual(outcome(() => base.decode(value)), outcome(() => old.decode(value)));
    }
  }
  const base = new NumBase('0123456789');
  const old = new Legacy('0123456789');
  for (const alphabet of [['x', 'x', 'z'], ['a', undefined, 'c'], ['a', 1, 'c'], ['a', 'bc', 'c']]) {
    base.BASE = old.BASE = alphabet;
    base.MAX_BASE = old.MAX_BASE = alphabet.length;
    for (const value of ['0', '1', '2', '10']) {
      assert.deepEqual(outcome(() => base.encode(value)), outcome(() => old.encode(value)));
    }
    for (const value of ['x', 'z', '1', 'a', 'c', 'bc', 'xxxxxxxx', 'cccccccc', 'zzzzzzzz']) {
      assert.deepEqual(outcome(() => base.decode(value)), outcome(() => old.decode(value)));
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
      assert.equal(emoji.decodeStrict(emoji.encodeStrict('27')), '27');
      assert.equal(new Constructor('0123456789abcdef').convert('1b', emoji), '😁😂😃');
    }
    for (const loader of ['amd', 'cmd']) {
      let Constructor;
      const define = factory => { Constructor = factory(); };
      define[loader] = true;
      vm.runInNewContext(source, { define });
      assert.equal(new Constructor().encode(huge), encodedHuge);
      assert.equal(new Constructor('😀😁', { unicode: true }).decodeStrict('😁😁'), '3');
    }
  });
}

test('retains CommonJS/deep import shape and supplies opt-in native ESM', async () => {
  for (const file of ['numbase', 'numbase.min']) {
    assert.equal(new (require('../dist/' + file))().encode(huge), encodedHuge);
  }
  const { default: ESM } = await import(pathToFileURL(path.join(__dirname, '../dist/numbase.mjs')));
  assert.equal(new ESM().decode(encodedHuge), huge);
  const namespace = await import(pathToFileURL(path.join(__dirname, '../dist/numbase.min.js')));
  assert.equal(namespace.default, NumBase);
});

test('legacy browser/CommonJS bundles retain ES5 syntax', () => {
  const { parse } = require('acorn');
  for (const file of ['numbase.js', 'numbase.min.js']) {
    parse(fs.readFileSync(path.join(__dirname, '../dist/', file), 'utf8'), { ecmaVersion: 5 });
  }
});
