# NumBase

Convert arbitrary-size decimal integers to and from a custom radix alphabet. NumBase keeps large integers as strings and uses an exact numeric fast path for inputs of at most 15 decimal digits. It has no runtime dependencies, and works with CommonJS, browser scripts, and AMD/CMD loaders.

> Maintenance preview: this branch modernizes the build, adds TypeScript declarations and an opt-in native ESM entry, and optimizes string arithmetic. npm currently contains version 0.1.1; the repository's existing version is 0.1.2. These changes have not been published.

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

Always pass integers outside JavaScript's safe `Number` range as decimal strings. `9007199254740993` as a numeric literal is already rounded before NumBase receives it; `'9007199254740993'` remains exact. Numeric values formatted with positive exponential notation are rejected, but smaller unsafe numbers retain their historical acceptance. The API does not recover precision lost before the call.

## API and compatibility

| API | Behavior |
| --- | --- |
| `new NumBase(alphabet?)` | Default alphabet is `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. Duplicate characters throw `TypeError`; an empty or omitted alphabet selects the default. |
| `encode(decimal, radix?)` | Convert an integer to alphabet symbols. Defaults to the alphabet length. Valid integer strings return strings; invalid inputs or radices pass through unchanged. |
| `decode(encoded, radix?)` | Return a decimal string. Invalid radices pass the input through unchanged. Unknown symbols or digits outside the selected radix throw `TypeError`. |
| `BASE` / `MAX_BASE` | Public alphabet array and default radix. Their existing mutability is retained; keep them consistent when changing them. |

The radix must be an integer from 2 through the alphabet length. Numeric strings such as `'16'` and null/undefined defaults keep their legacy behavior. A smaller radix uses the first `radix` symbols. Negative integers use a leading `-`; string negative zero remains `'-0'`. Decimal leading zeros are discarded by encoding, and leading zero symbols are discarded by decoding. Legacy `decode('')` returns `'0'` and `decode('-')` returns `'-0'`.

The alphabet uses **UTF-16 code units**, preserving existing encodings. Chinese BMP characters work; emoji and other supplementary characters are not supported as individual symbols. Do not include `-` in a new alphabet: it conflicts with the negative sign. The legacy constructor still accepts it for compatibility. An alphabet with one symbol cannot perform conversion; its invalid radix causes input passthrough.

This is integer representation conversion. It is not encryption or a general lossless text codec: leading zero symbols are lost, and a leading `-` has special meaning. Store any required original length separately.

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

Use Node.js 22 or 24 and pnpm 12.8.1, pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm check     # build, runtime/compatibility tests, type fixtures, and packed installation
pnpm bench     # compare with the checked-in npm 0.1.1 reference
pnpm audit
```

The JavaScript source builds into the existing readable and minified UMD files, an additional `.mjs` entry, and declarations. Builds are deterministic and do not modify the package version. Tests compare conversions with an independent BigInt oracle and the published 0.1.1 implementation, including unusual legacy inputs. CI checks Node.js 22/24, packed consumers, and reproducible generated files. BigInt is used by tests as a reference, not by the runtime implementation.

Arithmetic improvements remove repeated suffix slicing during division, combine decimal multiplication and addition into one carry pass, and replace repeated alphabet scans with a lookup table. The benchmark prints timings for large and small inputs; results depend on the engine and workload. Conversion still requires work proportional to the input and output lengths and is unsuitable for unbounded untrusted inputs.

This PR does not publish a version. Stricter rejection of unsafe numbers or invalid alphabets, Unicode code-point alphabets, and canonical validation would need explicit compatibility decisions in a later release.

## License

[MIT](LICENSE)
