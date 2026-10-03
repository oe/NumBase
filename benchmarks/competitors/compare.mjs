import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import NumBase from 'numbase/dist/numbase.mjs';
import Candidate from '../../dist/numbase.mjs';
import { Base62 } from '@sindresorhus/base62';
import bigInt from 'big-integer';
import baseX from 'base-x';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const hexAlphabet = alphabet.slice(0, 16);
const base62 = new NumBase();
const hexadecimal = new NumBase(hexAlphabet);
const competitor62 = new Base62({ alphabet });
const samples = 15;
const includeCandidate = process.argv.includes('--candidate');
const materialize = process.argv.includes('--materialize');
const candidateBase62 = new Candidate();
const candidateHexadecimal = new Candidate(hexAlphabet);
const consume = materialize ? value => Buffer.from(value).length : value => value.length;
let state = 0x243f6a88;
function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state;
}
function integers(bits) {
  return Array.from({ length: 16 }, () => {
    let value = 0n;
    for (let i = 0; i < bits / 32; i++) value = (value << 32n) | BigInt(random());
    return (value | (1n << BigInt(bits - 1))).toString();
  });
}
const datasets = [
  { name: '64-bit', values: integers(64), iterations: 8192 },
  { name: '128-bit', values: integers(128), iterations: 4096 },
  { name: '1000-decimal-digits', values: Array.from({ length: 16 }, () => {
    let value = String(1 + random() % 9);
    for (let i = 1; i < 1000; i++) value += random() % 10;
    return value;
  }), iterations: 128 },
];

// A small-input control guards the paths that should not need BigInt arithmetic.
if (includeCandidate) datasets.push({
  name: 'small-safe-integers',
  values: Array.from({ length: 16 }, (_, i) => String(19901230 + i * 7919)),
  iterations: 65536,
});

// These assertions back the feature comparison, not byte/integer speed comparisons.
const custom100 = Array.from({ length: 100 }, (_, i) => String.fromCharCode(0x4e00 + i)).join('');
const base100 = new NumBase(custom100);
assert.equal(base100.encode(100), custom100[1] + custom100[0]);
assert.equal(bigInt('100').toString(100, custom100), base100.encode(100));
assert.equal(bigInt(base100.encode(100), 100, custom100, true).toString(), '100');
assert.throws(() => new Base62({ alphabet: '01' }));
assert.throws(() => baseX(custom100));
const symbols254 = Array.from({ length: 254 }, (_, i) => String.fromCharCode(i)).join('');
assert.equal(typeof baseX(symbols254).encode, 'function');
assert.throws(() => baseX(symbols254 + String.fromCharCode(254)));
const byteCodec = baseX(alphabet);
assert.deepEqual(byteCodec.decode(byteCodec.encode(Uint8Array.of(0, 0, 255))), Uint8Array.of(0, 0, 255));
assert.equal(base62.decode('000f'), '15');
assert.equal(base62.decode(base62.encode('-15')), '-15');
assert.equal(bigInt('-15').toString(62, alphabet), base62.encode('-15'));
assert.throws(() => competitor62.encodeBigInt(-15n));
const emoji = new NumBase('😀😁😂😃', { unicode: true });
assert.equal(emoji.decode(emoji.encode('27')), '27');
assert.notEqual(bigInt('27').toString(4, '😀😁😂😃'), emoji.encode('27'));
assert.throws(() => new Base62({ alphabet: alphabet.slice(0, 61) + '😀' }));
assert.throws(() => base62.encode(Number.MAX_SAFE_INTEGER + 1));
assert.doesNotThrow(() => competitor62.encodeInteger(Number.MAX_SAFE_INTEGER + 1));
assert.doesNotThrow(() => bigInt(Number.MAX_SAFE_INTEGER + 1));

let consumed = 0;
function measure(functions, values, iterations) {
  const timings = functions.map(() => []);
  for (const { run } of functions) {
    for (let i = 0; i < Math.min(iterations, 512); i++) consumed ^= consume(run(values[i % values.length]));
  }
  for (let sample = 0; sample < samples; sample++) {
    let order = functions.map((_, i) => (i + sample) % functions.length);
    if (sample % 2) order = order.reverse();
    for (const index of order) {
      const run = functions[index].run;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) consumed ^= consume(run(values[i % values.length]));
      timings[index].push((performance.now() - start) * 1000 / iterations);
    }
  }
  return functions.map(({ name }, index) => {
    const sorted = [...timings[index]].sort((a, b) => a - b);
    return { library: name, medianMicroseconds: sorted[(samples - 1) / 2], samplesMicroseconds: timings[index] };
  });
}
const results = [];
for (const radix of [62, 16]) {
  const codec = radix === 62 ? base62 : hexadecimal;
  const digits = radix === 62 ? alphabet : hexAlphabet;
  const candidate = radix === 62 ? candidateBase62 : candidateHexadecimal;
  for (const { name, values, iterations } of datasets) {
    const encoded = values.map(value => codec.encode(value));
    const encode = [
      { name: 'NumBase', run: value => codec.encode(value) },
      { name: 'big-integer', run: value => bigInt(value).toString(radix, digits) },
      radix === 62
        ? { name: '@sindresorhus/base62', run: value => competitor62.encodeBigInt(BigInt(value)) }
        : { name: 'native BigInt', run: value => BigInt(value).toString(16) },
    ];
    const decode = [
      { name: 'NumBase', run: value => codec.decode(value) },
      { name: 'big-integer', run: value => bigInt(value, radix, digits, true).toString() },
      radix === 62
        ? { name: '@sindresorhus/base62', run: value => competitor62.decodeBigInt(value).toString() }
        : { name: 'native BigInt', run: value => BigInt('0x' + value).toString() },
    ];
    if (includeCandidate) {
      encode.push({ name: 'NumBase (candidate)', run: value => candidate.encode(value) });
      decode.push({ name: 'NumBase (candidate)', run: value => candidate.decode(value) });
    }
    for (let i = 0; i < values.length; i++) {
      for (const { run } of encode) assert.equal(run(values[i]), encoded[i]);
      for (const { run } of decode) assert.equal(run(encoded[i]), values[i]);
    }
    results.push({ radix, dataset: name, operation: 'encode', iterations, timings: measure(encode, values, iterations) });
    results.push({ radix, dataset: name, operation: 'decode', iterations, timings: measure(decode, encoded, iterations) });
  }
}
function version(file) { return JSON.parse(readFileSync(new URL(file, import.meta.url))).version; }
process.stdout.write(JSON.stringify({
  timestampUTC: new Date().toISOString(),
  environment: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length },
  versions: { numbase: version('node_modules/numbase/package.json'), '@sindresorhus/base62': version('node_modules/@sindresorhus/base62/package.json'), 'big-integer': version('node_modules/big-integer/package.json'), 'base-x': version('node_modules/base-x/package.json') },
  candidate: includeCandidate ? { packageVersion: version('../../package.json'), entrySHA256: createHash('sha256').update(readFileSync(new URL('../../dist/numbase.mjs', import.meta.url))).digest('hex'), status: 'unreleased working-tree implementation' } : null,
  methodology: { samples, consumption: materialize ? 'UTF-8 Buffer allocation (materialized output)' : 'returned string length', vectorsPerDataset: 16, seed: '0x243f6a88', units: 'microseconds per operation', inputOutput: 'encode: decimal string -> encoded string; decode: encoded string -> decimal string', construction: 'instances reused; construction/import excluded', order: 'rotated and reversed between samples', bigint: 'native BigInt available', scope: 'positive integers; identical case-sensitive alphabets; base-x feature checks only', consumed },
  inputs: datasets.map(({ name, values }) => ({ dataset: name, count: values.length, minDecimalDigits: Math.min(...values.map(value => value.length)), maxDecimalDigits: Math.max(...values.map(value => value.length)), sha256: createHash('sha256').update(JSON.stringify(values)).digest('hex') })),
  results,
}, null, 2) + '\n');
