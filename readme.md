# NumBase

Convert arbitrary-size decimal integers to and from a custom radix alphabet. NumBase keeps large integers as strings and uses an exact numeric fast path for inputs of at most 15 decimal digits. It has no runtime dependencies, and works with CommonJS, browser scripts, and AMD/CMD loaders.

> Maintenance preview: this branch adopts TypeScript development and Vite + pnpm builds, adds strict validation, alphabet-to-alphabet conversion, Unicode mode, and TypeScript/native ESM entries, and optimizes string arithmetic. npm currently contains version 0.1.1; the repository's existing version is 0.1.2. These changes have not been published.

## Quick start

```sh
npm install numbase
# or pnpm add numbase
```

```js
const NumBase = require('numbase');
const base = new NumBase(); // default alphabet: 0–9, a–z, A–Z (base62)

const decimal = '9999999999999999999999999999999999999999999999999999999999999999';
const encoded = base.encode(decimal);
console.log(encoded); // isFUl3RMFVGKeLAbPmHOAA86LLjpGwei1jXh
console.log(base.decode(encoded)); // original decimal string

const chinese = new NumBase('中国上海市徐汇区');
console.log(chinese.encode(19901230)); // 国国海区上徐市徐汇
console.log(chinese.decode('国国海区上徐市徐汇')); // '19901230'
console.log(chinese.encode(19901230, 7)); // 海海国国中徐中海汇
```

Always pass integers outside JavaScript's safe `Number` range as decimal strings. `9007199254740993` as a numeric literal is already rounded before NumBase receives it; `'9007199254740993'` remains exact. Numeric values formatted with positive exponential notation are rejected, but smaller unsafe numbers retain their historical acceptance in `encode()`. Use `encodeStrict()` to reject them. The API does not recover precision lost before the call.

## API and compatibility

| API | Behavior |
| --- | --- |
| `new NumBase(alphabet?, options?)` | Default alphabet is `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. Duplicate characters throw `TypeError`; an empty or omitted alphabet selects the default. |
| `encode(decimal, radix?)` | Convert an integer to alphabet symbols. Defaults to the alphabet length. Valid integer strings return strings; invalid inputs or radices pass through unchanged. |
| `decode(encoded, radix?)` | Return a decimal string. Invalid radices pass the input through unchanged. Unknown symbols or digits outside the selected radix throw `TypeError`. |
| `encodeStrict(decimal, radix?)` | Encode a decimal string, safe integer Number, or bigint with strict validation; always return a string or throw. |
| `decodeStrict(encoded, radix?)` | Decode a nonempty encoded string with strict validation; always return a string or throw. |
| `convert(encoded, target, options?)` | Convert an encoded integer to another NumBase alphabet with strict checks on both ends. |
| `BASE` / `MAX_BASE` | Public alphabet array and default radix. Their existing mutability is retained; keep them consistent when changing them. |

The radix must be an integer from 2 through the alphabet length. Numeric strings such as `'16'` and null/undefined defaults keep their legacy behavior. A smaller radix uses the first `radix` symbols. Negative integers use a leading `-`; string negative zero remains `'-0'`. Decimal leading zeros are discarded by encoding, and leading zero symbols are discarded by decoding. Legacy `decode('')` returns `'0'` and `decode('-')` returns `'-0'`.

By default, the alphabet uses **UTF-16 code units**, preserving existing encodings. Chinese BMP characters work; emoji and other supplementary characters need the explicit Unicode mode below. Do not include `-` in a new alphabet: it conflicts with the negative sign. The legacy constructor still accepts it for compatibility. An alphabet with one symbol cannot perform conversion; its invalid radix causes input passthrough.

This is integer representation conversion. It is not encryption or a general lossless text codec: leading zero symbols are lost, and a leading `-` has special meaning. Store any required original length separately.

## Strict conversion — maintenance preview

```js
const hexadecimal = new NumBase('0123456789abcdef');
hexadecimal.encodeStrict('9007199254740993'); // exact decimal string
hexadecimal.encodeStrict(9007199254740993n); // exact bigint, in supporting runtimes
hexadecimal.decodeStrict('ff'); // '255'
hexadecimal.encodeStrict(9007199254740993); // throws: the Number is already unsafe
hexadecimal.decodeStrict(''); // throws: missing digits
hexadecimal.encodeStrict('10', '16'); // throws: strict radices must be numeric
```

The strict methods reject fractional, non-finite, or unsafe Numbers; malformed decimal strings (including whitespace, `+`, decimals, and exponents); and empty/sign-only encoded strings. Strict radices must be numeric integers from 2 through `MAX_BASE`; omit the radix to use the default. Unknown or out-of-range encoded symbols also throw. Leading zeros remain accepted and normalized, and string negative zero remains `'-0'`.

Strict calls revalidate the public configuration each time: `BASE` must contain at least two distinct symbols of the selected character mode, with no `-`; `MAX_BASE` must be an integer from 2 through `BASE.length`. It may select a smaller prefix of the alphabet. Invalid values/alphabets throw `TypeError`; invalid radices or `MAX_BASE` throw `RangeError`. This validation adds work proportional to the alphabet size, so it is opt-in. Existing `encode()` and `decode()` retain their passthrough behavior.

## Convert between alphabets — maintenance preview

```js
const hexadecimal = new NumBase('0123456789abcdef');
const base62 = new NumBase();
hexadecimal.convert('ff', base62); // '47' (255 in base62)
hexadecimal.convert('1010', base62, { sourceRadix: 2, targetRadix: 8 }); // '12'
```

`source.convert(encoded, target, { sourceRadix?, targetRadix? })` validates both sides strictly and always returns a string. It composes `decodeStrict()` and `encodeStrict()` using an exact decimal string between them; it does not convert large integers through Number and does not claim a faster conversion algorithm. Omitted radices use the respective instance defaults. Negative signs are preserved, and leading zero symbols are normalized. CommonJS and native ESM instances interoperate.

## Unicode mode — maintenance preview

```js
const emoji = new NumBase('😀😁😂😃', { unicode: true });
emoji.MAX_BASE; // 4, not 8 UTF-16 code units
emoji.encodeStrict('27'); // '😁😂😃'
emoji.decodeStrict('😁😂😃'); // '27'
new NumBase('0123456789abcdef').convert('1b', emoji); // '😁😂😃'
```

Unicode mode counts **code points**, preserves symbol order, and rejects unpaired surrogates. The mode is fixed at construction; options must be an object, and the Unicode alphabet must be a string. Each code point is one digit; this does not group grapheme clusters, normalize text, or treat a flag, skin-tone sequence, or ZWJ emoji as a single digit. For example, `🇨🇳` contains two code points. Duplicate code points still throw. UTF-16 mode remains the default, and existing BMP alphabets have identical encodings in both modes. Keep the mode alongside any persisted custom alphabet so another reader uses the same rules.

Unicode parsing uses an ES5-compatible surrogate scanner, with no iterator or `Array.from` polyfill. BigInt inputs are optional; the conversion algorithm does not require BigInt support.

## Browser and module usage

Include `dist/numbase.min.js` as a script to expose `window.NumBase`. The existing AMD/CMD loader and `require('numbase/dist/numbase')` paths remain available. Existing JavaScript entries remain ES5 syntax.

The maintenance branch adds an opt-in native ESM entry:

```js
import NumBase from 'numbase/dist/numbase.mjs';
const base = new NumBase();
```

The package root keeps its CommonJS constructor export; no restrictive `exports` map is added. Native Node.js imports of the root receive that constructor as the default export.

The maintenance branch also adds declarations for CommonJS and ESM:

```ts
import NumBase = require('numbase');
const base = new NumBase();
const encoded: string = base.encode('9007199254740993');
const decimal: string = base.decode(encoded);
// A numeric input can pass through unchanged, so the declared result is string | number.
const numeric: string | number = base.encode(42);
```

## Development

Use Node.js 22.12+ or 24 and pnpm 12.8.1, pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm check     # build/typecheck source, runtime tests, consumer types, and packed installation
pnpm typecheck # check source and generated consumer declarations without rebuilding
pnpm bench     # compare with the checked-in npm 0.1.1 reference
pnpm audit
```

Vite bundles the TypeScript source into the existing readable and minified UMD files, an additional `.mjs` entry, and declarations. The Vite distribution plugin preserves the historical AMD/CMD wrapper and ES5 syntax using TypeScript lowering and Terser minification. Declarations are generated from the implementation. Builds are deterministic and do not modify the package version. Tests compare conversions with an independent BigInt oracle and the published 0.1.1 implementation, including unusual legacy inputs. CI checks Node.js 22/24, packed consumers, and reproducible generated files. BigInt is used by tests as a reference and can be accepted as input by strict encoding, but the arithmetic implementation does not depend on it.

Arithmetic improvements remove repeated suffix slicing during division, combine decimal multiplication and addition into one carry pass, and replace repeated alphabet scans with a lookup table. The benchmark alternates baseline/candidate order over seven paired samples and prints timings for large/small legacy inputs, strict-validation overhead, the conversion pipeline, and Unicode parsing; results depend on the engine and workload. Conversion still requires work proportional to the input and output lengths and is unsuitable for unbounded untrusted inputs.

This PR does not publish a version. The strict methods and Unicode mode are explicit additions; the existing default behavior remains available.

## License

[MIT](LICENSE)
