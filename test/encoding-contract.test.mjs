import { afterEach, expect, test, vi } from 'vitest';
import NumBase from '../src/numbase.ts';
import fixtures from './fixtures/integer-encodings.json';

afterEach(() => vi.unstubAllGlobals());

test.each(['native', 'without BigInt'])('fixed encodings remain stable: %s', mode => {
  if (mode === 'without BigInt') vi.stubGlobal('BigInt', undefined);
  const defaultBase = new NumBase();
  for (const { decimal, ...encodings } of fixtures.vectors) {
    expect(defaultBase.encode(decimal)).toBe(encodings.base62);
    expect(defaultBase.encodeStrict(decimal)).toBe(encodings.base62);
    expect(defaultBase.decode(encodings.base62)).toBe(decimal);
    for (const [name, alphabet] of Object.entries(fixtures.alphabets)) {
      const base = new NumBase(alphabet);
      expect(base.encode(decimal), `${name}: ${decimal}`).toBe(encodings[name]);
      expect(base.encodeStrict(decimal)).toBe(encodings[name]);
      expect(base.decode(encodings[name])).toBe(decimal);
      expect(base.decodeStrict(encodings[name])).toBe(decimal);
    }
  }
});

test('documented batch conversion reuses instances and retains exact database IDs', () => {
  const base62 = new NumBase();
  const hexadecimal = new NumBase('0123456789abcdef');
  const ids = ['18446744073709551615', '340282366920938463463374607431768211455'];
  const codes = ids.map(id => base62.encodeStrict(id));
  expect(codes).toEqual(['lYGhA16ahyf', '7N42dgm5tFLK9N8MT7fHC7']);
  expect(codes.map(code => base62.decodeStrict(code))).toEqual(ids);
  expect(codes.map(code => base62.convert(code, hexadecimal)))
    .toEqual(['ffffffffffffffff', 'ffffffffffffffffffffffffffffffff']);
});

test('alphabet recipes expose integer semantics rather than full byte/text codecs', () => {
  const base58 = new NumBase(fixtures.alphabets.base58);
  expect(base58.encodeStrict('0')).toBe('1');
  expect(base58.decodeStrict('1112')).toBe('1');
  const base32 = new NumBase(fixtures.alphabets.base32);
  expect(base32.encodeStrict('10')).toBe('A');
  for (const unsupported of ['a', 'O', 'I', 'L', 'U', 'A-B', '*']) {
    expect(() => base32.decodeStrict(unsupported)).toThrow(TypeError);
  }
});
