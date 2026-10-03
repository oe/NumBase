# NumBase

Precision-safe conversion between decimal integers and custom radix alphabets. Turn a large database ID into a compact Base62 code, recover its exact decimal value, or convert between alphabets. Zero runtime dependencies.

> Maintenance preview: npm currently ships 0.1.1. This unpublished branch adds strict APIs, TypeScript declarations, native ESM, Unicode mode, and faster arithmetic. Its repository version remains 0.1.2.

## Quick start

```sh
npm install numbase
# or pnpm add numbase
```

```js
const NumBase = require('numbase');
const base62 = new NumBase(); // 0–9, a–z, A–Z

// Keep a database's 64-bit integer ID as a decimal string.
const id = '18446744073709551615';
const code = base62.encode(id); // 'lYGhA16ahyf'
base62.decode(code); // '18446744073709551615', without Number rounding
```

Use decimal strings for large integers: the numeric literal `9007199254740993` is rounded before any library receives it. For new integrations with this maintenance version, prefer `encodeStrict()` and `decodeStrict()`: they return a string or throw, and reject unsafe Numbers instead of accepting a rounded value.

## Practical examples — maintenance APIs

### Encode IDs with an alphabet that avoids ambiguous letters

```js
const readable = new NumBase('0123456789ABCDEFGHJKMNPQRSTVWXYZ');
readable.encodeStrict('18446744073709551615'); // 'FZZZZZZZZZZZZ'
readable.decodeStrict('FZZZZZZZZZZZZ'); // '18446744073709551615'
readable.encodeStrict(9007199254740993); // throws: unsafe Number
readable.encodeStrict(9007199254740993n); // exact, in BigInt-capable runtimes
```

### Convert hexadecimal integers to Base62

```js
const hexadecimal = new NumBase('0123456789abcdef');
const base62 = new NumBase();
hexadecimal.convert('ff', base62); // '47'
hexadecimal.convert('1010', base62, { sourceRadix: 2, targetRadix: 8 }); // '12'
```

`convert()` composes strict decoding and encoding through an exact decimal string. Omitted radices use each instance's default. It preserves negative signs and normalizes leading zeros; CommonJS and ESM instances interoperate.

### Batch conversion: reuse instances

```js
const base62 = new NumBase();
const ids = ['18446744073709551615', '340282366920938463463374607431768211455'];
const codes = ids.map(id => base62.encodeStrict(id));
const recovered = codes.map(code => base62.decodeStrict(code)); // original IDs

const hexadecimal = new NumBase('0123456789abcdef');
const hexCodes = codes.map(code => base62.convert(code, hexadecimal));
// ['ffffffffffffffff', 'ffffffffffffffffffffffffffffffff']
```

Create instances outside the loop to reuse configuration and validation snapshots. Each operation is synchronous; `Promise.all` does not parallelize CPU work. Keep database IDs as strings, including in JSON, so they are not rounded before conversion.

## Alphabet recipes

NumBase's default Base62 order is **0–9, a–z, A–Z**, matching its published versions. Digits are case-sensitive: `a` represents 10 and `A` represents 36. This order remains stable for existing encodings.

| Integer representation | Alphabet, in digit-value order |
| --- | --- |
| Base62 (**default**) | `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ` |
| Base58, Bitcoin-style digits | `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz` |
| Base32, Crockford-style digits | `0123456789ABCDEFGHJKMNPQRSTVWXYZ` |

Pass a custom alphabet to the existing constructor. Store the alphabet, radix, and Unicode mode with persisted custom encodings so readers use the same configuration.

These recipes specify **integer digits**, not complete byte/text codecs. The Base58 recipe normalizes integer leading zeros and does not implement Base58Check or preserve leading zero bytes. The Base32 recipe does not add case folding, ambiguous-character aliases, hyphen grouping, or Crockford check symbols. It is not RFC 4648 Base32. Interoperability requires matching both alphabet order and conversion semantics.

For supported integer inputs, a fixed alphabet, radix, and character mode define a stable encoding across NumBase releases. Fixed input/output fixtures test both native arithmetic and the no-BigInt fallback, separately from round-trip tests, to protect persisted data compatibility. Leading zeros continue to normalize and string negative zero remains signed.

## When to use NumBase

| Need | Suitable choice |
| --- | --- |
| Standard radix 2–36 output in a modern runtime | Native `BigInt(value).toString(radix)` usually suffices. |
| Exact decimal strings, custom alphabets, Base62, or signed integer conversion | NumBase keeps these operations behind one small API. |
| Arithmetic beyond representation conversion | A general-purpose big-integer library. |
| Encode bytes or arbitrary text, preserving leading zeros | A byte codec such as `base-x`, or the relevant standard encoding. |

NumBase converts integer representations. It does not generate IDs, encrypt values, or encode arbitrary text losslessly. Leading zeros are normalized and `-` denotes a negative sign. Alphabet order determines the output. Store the alphabet and character mode alongside persisted encodings.

## API

| API | Behavior |
| --- | --- |
| `new NumBase(alphabet?, { unicode? }?)` | Default alphabet is `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. Duplicates throw; an omitted or empty alphabet selects the default. |
| `encode(decimal, radix?)` | Encode an integer. Invalid inputs or radices pass through unchanged for legacy compatibility. |
| `decode(encoded, radix?)` | Return a decimal string. Invalid radices pass through; unknown or out-of-range symbols throw. |
| `encodeStrict(decimal, radix?)` | Accept a decimal string, safe integer Number, or bigint; return a string or throw. |
| `decodeStrict(encoded, radix?)` | Require a nonempty encoded integer; return a decimal string or throw. |
| `convert(encoded, target, { sourceRadix?, targetRadix? }?)` | Convert to another alphabet with strict checks on both ends. |
| `BASE` / `MAX_BASE` | Public, mutable alphabet array and default radix, retained for compatibility. |

A radix selects the first `radix` symbols and must be an integer from 2 through `MAX_BASE`. Strict radices must be numbers. Strict methods reject unsafe/fractional/non-finite Numbers, malformed decimal strings (whitespace, `+`, decimals, exponents), and empty/sign-only encoded input. Leading zeros are accepted and normalized; string negative zero stays `'-0'`.

Strict alphabets must contain at least two distinct symbols, each a single character in the selected mode, with no `-`. `MAX_BASE` must be an integer from 2 through `BASE.length`. Invalid input or alphabets throw `TypeError`; invalid radices or `MAX_BASE` throw `RangeError`.

Strict calls compare alphabet contents with a validated snapshot. Changes, including in-place edits, trigger full validation; unchanged alphabets avoid rebuilding the duplicate-check table. Radices and `MAX_BASE` are checked on every call. The content comparison remains proportional to alphabet length. Reuse instances for repeated conversions.

### Legacy behavior

The existing `encode()` and `decode()` keep coercion and passthrough rules, numeric-string radices such as `'16'`, and null/undefined defaults. Unsafe Numbers below positive exponential notation remain accepted by `encode()`; strict encoding rejects them. `decode('')` returns `'0'`, `decode('-')` returns `'-0'`, and string negative zero is preserved. A one-symbol alphabet cannot convert; the legacy constructor still accepts `-`, which conflicts with the negative sign.

## Unicode alphabets

By default, alphabets use UTF-16 code units, preserving historical encodings. Chinese BMP characters work directly. Opt in to code points for emoji or other supplementary characters:

```js
const emoji = new NumBase('😀😁😂😃', { unicode: true });
emoji.MAX_BASE; // 4
emoji.encodeStrict('27'); // '😁😂😃'
emoji.decodeStrict('😁😂😃'); // '27'
```

The mode is fixed at construction. Unicode mode rejects unpaired surrogates and counts code points; it does not normalize text or group grapheme clusters, flags, skin-tone sequences, or ZWJ emoji. For example, `🇨🇳` contains two digits. Its ES5-compatible scanner needs no iterator or `Array.from` polyfill.

## Modules and TypeScript

The package root exports the CommonJS constructor. Native Node.js imports also receive it as the default export. This branch adds an explicit ESM entry and generated declarations:

```ts
import NumBase from 'numbase/dist/numbase.mjs';
const base = new NumBase();
const code: string = base.encodeStrict('9007199254740993');
```

CommonJS TypeScript consumers can use `import NumBase = require('numbase')`. Legacy encoding of a Number has type `string | number`, reflecting passthrough behavior.

For browser scripts, `dist/numbase.min.js` exposes `window.NumBase`. AMD/CMD loaders and existing deep imports such as `numbase/dist/numbase` remain supported. Existing JavaScript entries retain ES5 syntax, including in environments without BigInt.

## Performance and development

Small encodes use exact Number arithmetic. In BigInt-capable runtimes, larger canonical integers use native arithmetic; standard alphabets also use native radix formatting where possible. Decoding switches from exact Number accumulation to BigInt before exceeding the safe integer range. Without BigInt, decimal-string division and fused multiply/add remain available. Signs, zero normalization, errors, and legacy coercions are covered across both paths.

The string fallback has roughly quadratic cost in digit count at a fixed radix. Native arithmetic improves throughput but does not make input size unlimited; choose input limits appropriate to your application.

Use Node.js 22.12+ or 24 and pnpm 12.8.1:

```sh
pnpm install --frozen-lockfile
pnpm check     # build, coverage gates, consumer types, packed installation
pnpm test      # run Vitest once
pnpm test:watch # rerun tests while editing
pnpm test:coverage # V8 coverage with HTML and LCOV reports
pnpm bench     # published baseline, strict overhead, ID workloads, native reference
# Compare against a previous build:
pnpm bench /absolute/path/to/previous-numbase.cjs
```

Vite builds strict TypeScript into readable/minified UMD, native ESM, and generated declarations. A small distribution plugin preserves ES5 syntax and the historical loader wrapper. Builds do not change the version. Vitest tests the TypeScript source against an independent BigInt oracle and the published 0.1.1 implementation; separate checks exercise the distribution bundles, including with BigInt disabled.

V8 coverage includes every `src/**/*.ts` file and requires at least 95% statements, branches, and lines and 100% functions **per file**. Both Node 22/24 CI and prepublish checks enforce these gates; CI also saves HTML/LCOV coverage reports as artifacts. Run `pnpm test:coverage` and open `coverage/index.html` locally. Coverage is a regression guard, not proof that every behavior is correct. The historical oversized-alphabet error remains uncovered: a unique code-unit/code-point alphabet cannot reach that bound; tests do not mock arithmetic just to exercise it.

Benchmarks assert equal outputs, alternate comparison order over seven paired samples, and report median milliseconds per operation. The native reference covers positive Base62 integers with the same alphabet, without NumBase's input validation or compatibility behavior. Results depend on the engine and workload, and do not measure application-level speedups.

## License

[MIT](LICENSE)
