# NumBase

Precision-safe integer conversion in any radix from 2 upward, using custom digit alphabets. Encode exact decimal integers, decode them back, or convert between alphabets and radices. Zero runtime dependencies.

**Base62 is the default alphabet.** The default instance supports radices 2–62; supply a longer alphabet to use higher radices. Each radix needs that many distinct symbols, listed in digit-value order.

## Quick start

```sh
npm install numbase
# or pnpm add numbase
```

```js
import NumBase from 'numbase';

const base = new NumBase(); // default alphabet: 0–9, a–z, A–Z
base.encode(255, 2); // '11111111'
base.encode(255, 16); // 'ff'
base.decode('ff', 16); // '255'

const id = '18446744073709551615'; // keep database IDs as decimal strings
const code = base.encode(id); // 'lYGhA16ahyf'; omitted radix uses all 62 symbols
base.decode(code); // '18446744073709551615'
```

Both methods return a string or throw. `encode()` accepts decimal strings, safe integer Numbers, and bigint. It rejects unsafe Numbers: the literal `9007199254740993` is already rounded before any library receives it. Pass `'9007199254740993'` or `9007199254740993n` instead.

## Examples

### Radices above 62

A custom alphabet defines its own maximum radix. For example, 100 distinct Chinese characters provide a Base100 alphabet:

```js
import NumBase from 'numbase';

const alphabet = Array.from({ length: 100 }, (_, i) =>
  String.fromCharCode(0x4e00 + i)
).join('');
const base100 = new NumBase(alphabet);
base100.MAX_BASE; // 100
const code = base100.encode('18446744073709551615');
base100.decode(code); // '18446744073709551615'
```

Radices are integers from 2 through the chosen alphabet's length. Omit the radix to use the whole alphabet, or pass a smaller radix to use its first symbols.

### Readable integer codes

```js
import NumBase from 'numbase';

const readable = new NumBase('0123456789ABCDEFGHJKMNPQRSTVWXYZ');
readable.encode('18446744073709551615'); // 'FZZZZZZZZZZZZ'
readable.decode('FZZZZZZZZZZZZ'); // '18446744073709551615'
readable.encode(9007199254740993); // throws TypeError: unsafe Number
```

### Convert between alphabets and radices

```js
import NumBase from 'numbase';

const hexadecimal = new NumBase('0123456789abcdef');
const base62 = new NumBase();
hexadecimal.convert('ff', base62); // '47'
hexadecimal.convert('1010', base62, { sourceRadix: 2, targetRadix: 8 }); // '12'
```

`convert()` composes decoding and encoding through an exact decimal string. Omitted radices use each instance's default. Negative signs are preserved and leading zeros normalized; CommonJS and ESM instances interoperate.

### Reuse instances for batches

```js
import NumBase from 'numbase';

const base62 = new NumBase();
const hexadecimal = new NumBase('0123456789abcdef');
const ids = ['18446744073709551615', '340282366920938463463374607431768211455'];
const codes = ids.map(id => base62.encode(id));
const recovered = codes.map(code => base62.decode(code)); // original IDs
const hexCodes = codes.map(code => base62.convert(code, hexadecimal));
// ['ffffffffffffffff', 'ffffffffffffffffffffffffffffffff']
```

Create instances outside the loop to reuse configuration and the symbol-to-digit lookup. Operations are synchronous; `Promise.all` does not parallelize CPU work. Keep large integer IDs as strings in JSON as well.

## API

| API | Behavior |
| --- | --- |
| `new NumBase(alphabet?, { unicode? }?)` | Default alphabet is `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. An explicit alphabet must contain at least two distinct symbols, with no `-`. |
| `encode(decimal, radix?)` | Accept a decimal integer string, safe integer Number, or bigint. Return encoded digits as a string or throw. |
| `decode(encoded, radix?)` | Accept a nonempty encoded integer string. Return its exact decimal value as a string or throw. |
| `convert(encoded, target, { sourceRadix?, targetRadix? }?)` | Convert to another alphabet using the same validation on both sides. |
| `BASE` / `MAX_BASE` | Readonly alphabet array and its length. Fixed at construction. |

There is no fixed Base62 limit: `MAX_BASE` is the length of the selected alphabet. Omit the radix to use the full alphabet. An explicit radix must be a numeric integer from 2 through `MAX_BASE` and selects the first `radix` symbols. To use a smaller radix, pass it to the operation; to change the alphabet, create a new instance.

Encoding rejects unsafe/fractional/non-finite Numbers, coercible objects, and malformed decimal strings (whitespace, `+`, decimals, exponents). Decoding rejects empty/sign-only input, nonstrings, unknown symbols, and digits outside the selected radix. Invalid input or alphabets throw `TypeError`; invalid radices throw `RangeError`. There is no input passthrough or automatic coercion.

Negative integers use a leading `-`. Leading zeros are accepted and normalized, and string negative zero stays signed: `encode('-000')` gives `'-0'`. Number `-0` and bigint zero encode as ordinary zero.

The alphabet is validated once at construction, then frozen. `BASE` and `MAX_BASE` cannot be replaced or modified. A fixed symbol-to-digit lookup is reused by decoding; conversions do not scan or revalidate the alphabet.

## Alphabet recipes

NumBase uses **0–9, a–z, A–Z** for default Base62, matching its published versions. Digits are case-sensitive: `a` represents 10 and `A` represents 36. The default digit order remains stable across versions.

| Integer representation | Alphabet, in digit-value order |
| --- | --- |
| Base62 (**default**) | `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ` |
| Base58, Bitcoin-style digits | `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz` |
| Base32, Crockford-style digits | `0123456789ABCDEFGHJKMNPQRSTVWXYZ` |

Pass a custom alphabet to the constructor. Store the alphabet, radix, and Unicode mode with persisted custom encodings so readers use the same configuration.

These are integer-digit recipes, not complete byte/text codecs. Base58 integer conversion normalizes leading zeros and does not preserve leading zero bytes or implement Base58Check. The Base32 recipe does not add case folding, ambiguous-character aliases, grouping, or check symbols; it is not RFC 4648 Base32. Fixed input/output fixtures guard persisted encoding compatibility in both native and no-BigInt environments.

## Unicode alphabets

By default, alphabets use UTF-16 code units, preserving existing encodings. Chinese BMP characters work directly. Opt in to code points for emoji or other supplementary characters:

```js
import NumBase from 'numbase';

const emoji = new NumBase('😀😁😂😃', { unicode: true });
emoji.MAX_BASE; // 4
emoji.encode('27'); // '😁😂😃'
emoji.decode('😁😂😃'); // '27'
```

The mode is fixed at construction. Unicode mode rejects unpaired surrogates and counts code points; it does not normalize text or group grapheme clusters, flags, skin-tone sequences, or ZWJ emoji. `🇨🇳` contains two digits. Its ES5-compatible scanner needs no iterator or `Array.from` polyfill.

## When to use NumBase

| Need | Suitable choice |
| --- | --- |
| Standard radix 2–36 output in a modern runtime | Native `BigInt(value).toString(radix)` usually suffices. |
| Exact decimal strings, custom alphabets, radices above 36, or signed conversion | NumBase. |
| Arithmetic beyond representation conversion | A general-purpose big-integer library. |
| Bytes or arbitrary text with leading-zero preservation | A byte codec or relevant standard encoding. |

NumBase converts integer representations. It does not generate IDs, encrypt values, or encode arbitrary text losslessly. Alphabet order determines output, leading zeros normalize, and `-` denotes a negative sign.

## Modules and TypeScript

Use a default import in modern JavaScript. Node.js ES modules receive the package root's CommonJS constructor as the default export:

```js
import NumBase from 'numbase';

const base62 = new NumBase();
base62.encode('9007199254740993'); // 'FfGNdXsE9'
```

For a native ESM entry, including TypeScript with NodeNext module resolution, use the `.mjs` entry. It has matching generated declarations:

```ts
import NumBase from 'numbase/dist/numbase.mjs';

const base = new NumBase();
const code: string = base.encode('9007199254740993');
const small: string = base.encode(42);
```

For existing CommonJS projects, `const NumBase = require('numbase')` remains supported. CommonJS TypeScript consumers can use `import NumBase = require('numbase')`.

For browser scripts, `dist/numbase.min.js` exposes `window.NumBase`. AMD/CMD loaders and deep imports such as `numbase/dist/numbase` remain supported. Existing JavaScript entries retain ES5 syntax; BigInt is optional at runtime.

## Migrating from 0.x

Version 1.1.0 uses fixed instance configuration. The safe conversion behavior introduced in 1.0.0 remains. See [CHANGELOG.md](CHANGELOG.md) for the breaking changes.

From either **0.x or 1.0.0**, stop modifying `BASE` or `MAX_BASE`. Create a new instance for a different alphabet; pass a radix to `encode()` / `decode()` or conversion options for a smaller base. Read access remains available.

```js
import NumBase from 'numbase';

const base62 = new NumBase();
base62.encode('10', 4); // '22'; no MAX_BASE assignment needed
const hexadecimal = new NumBase('0123456789abcdef'); // a separate alphabet
```

For **0.x** users, the input-validation changes introduced in 1.0.0 also apply:

- Replace numeric literals outside the safe integer range with decimal strings or bigint.
- Replace string/null radices with numbers, or omit the radix for the default.
- Validate or catch invalid input: methods now throw instead of returning it unchanged. `decode('')` and `decode('-')` no longer mean zero.
- Omit the alphabet for the default; empty/null, one-symbol, duplicate, and sign-conflicting alphabets now throw.

`encodeStrict()` / `decodeStrict()` existed only in the unpublished maintenance branch. Use `encode()` / `decode()`; there is no separate strict mode.

Valid integer encodings, default Base62 order, UTF-16 mode, signs, string negative zero, and leading-zero normalization remain stable.

## Performance and development

Small encodes use exact Number arithmetic. Larger integers use native BigInt where available, including native formatting for standard digit alphabets through radix 36. Decoding promotes from Number to BigInt before exceeding the safe integer range. Older runtimes retain decimal-string division and fused multiply/add; the fallback has roughly quadratic cost in digit count at a fixed radix. Choose input limits appropriate to your application.

Use Node.js 22.12+ or 24 and pnpm 12.8.1:

```sh
pnpm install --frozen-lockfile
pnpm check          # build, coverage gates, consumer types, packed installation
pnpm test           # Vitest once
pnpm test:watch
pnpm test:coverage  # HTML and LCOV reports
pnpm bench          # published baseline and minimal native BigInt reference
```

Vite builds strict TypeScript into readable/minified UMD, native ESM, and generated declarations. Builds do not change the version. Vitest tests the source against independent integer-reference vectors and valid published encodings; distribution checks cover native Node, browsers, loaders, ES5 parsing, and no-BigInt environments.

V8 coverage includes every `src/**/*.ts` file. CI and prepublish checks enforce 100% statements, branches, functions, and lines per file. Node 22/24 CI saves HTML/LCOV artifacts and checks reproducible builds. Open `coverage/index.html` after `pnpm test:coverage`.

Benchmarks assert identical positive outputs, alternate order across seven paired samples, and report median milliseconds per operation. The native reference excludes API validation and compatibility handling. Results depend on engine/workload and do not measure application-level speedups. A previous bundle can be supplied with `pnpm bench /absolute/path/to/previous-numbase.cjs`.

## License

[MIT](LICENSE)
