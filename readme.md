# NumBase

Precision-safe conversion between decimal integers and custom radix alphabets. Turn a large database ID into a compact Base62 code, recover its exact decimal value, or convert between alphabets. Zero runtime dependencies.

## Quick start

```sh
npm install numbase
# or pnpm add numbase
```

```js
const NumBase = require('numbase');
const base62 = new NumBase(); // digit order: 0–9, a–z, A–Z
const id = '18446744073709551615'; // keep database IDs as decimal strings
const code = base62.encode(id); // 'lYGhA16ahyf'
base62.decode(code); // '18446744073709551615'
```

Both methods return a string or throw. `encode()` accepts decimal strings, safe integer Numbers, and bigint. It rejects unsafe Numbers: the literal `9007199254740993` is already rounded before any library receives it. Pass `'9007199254740993'` or `9007199254740993n` instead.

## Examples

### Readable integer codes

```js
const readable = new NumBase('0123456789ABCDEFGHJKMNPQRSTVWXYZ');
readable.encode('18446744073709551615'); // 'FZZZZZZZZZZZZ'
readable.decode('FZZZZZZZZZZZZ'); // '18446744073709551615'
readable.encode(9007199254740993); // throws TypeError: unsafe Number
```

### Convert hexadecimal integers to Base62

```js
const hexadecimal = new NumBase('0123456789abcdef');
const base62 = new NumBase();
hexadecimal.convert('ff', base62); // '47'
hexadecimal.convert('1010', base62, { sourceRadix: 2, targetRadix: 8 }); // '12'
```

`convert()` composes decoding and encoding through an exact decimal string. Omitted radices use each instance's default. Negative signs are preserved and leading zeros normalized; CommonJS and ESM instances interoperate.

### Reuse instances for batches

```js
const base62 = new NumBase();
const hexadecimal = new NumBase('0123456789abcdef');
const ids = ['18446744073709551615', '340282366920938463463374607431768211455'];
const codes = ids.map(id => base62.encode(id));
const recovered = codes.map(code => base62.decode(code)); // original IDs
const hexCodes = codes.map(code => base62.convert(code, hexadecimal));
// ['ffffffffffffffff', 'ffffffffffffffffffffffffffffffff']
```

Create instances outside the loop to reuse configuration and validation snapshots. Operations are synchronous; `Promise.all` does not parallelize CPU work. Keep large integer IDs as strings in JSON as well.

## API

| API | Behavior |
| --- | --- |
| `new NumBase(alphabet?, { unicode? }?)` | Default alphabet is `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. An explicit alphabet must contain at least two distinct symbols, with no `-`. |
| `encode(decimal, radix?)` | Accept a decimal integer string, safe integer Number, or bigint. Return encoded digits as a string or throw. |
| `decode(encoded, radix?)` | Accept a nonempty encoded integer string. Return its exact decimal value as a string or throw. |
| `convert(encoded, target, { sourceRadix?, targetRadix? }?)` | Convert to another alphabet using the same validation on both sides. |
| `BASE` / `MAX_BASE` | Public alphabet array and default radix. Changes are checked before conversion. |

Omit the radix to use `MAX_BASE`. An explicit radix must be a numeric integer from 2 through `MAX_BASE` and selects the first `radix` symbols. `MAX_BASE` must be an integer from 2 through `BASE.length`.

Encoding rejects unsafe/fractional/non-finite Numbers, coercible objects, and malformed decimal strings (whitespace, `+`, decimals, exponents). Decoding rejects empty/sign-only input, nonstrings, unknown symbols, and digits outside the selected radix. Invalid input or alphabets throw `TypeError`; invalid radices or `MAX_BASE` throw `RangeError`. There is no input passthrough or automatic coercion.

Negative integers use a leading `-`. Leading zeros are accepted and normalized, and string negative zero stays signed: `encode('-000')` gives `'-0'`. Number `-0` and bigint zero encode as ordinary zero.

Each alphabet entry must be one symbol in the selected character mode. Calls compare `BASE` contents with a validated snapshot: replacements and in-place edits trigger full validation; unchanged alphabets avoid rebuilding the duplicate-check table. Content comparison remains proportional to alphabet length. Radices and `MAX_BASE` are checked every time.

## Alphabet recipes

NumBase uses **0–9, a–z, A–Z** for default Base62, matching its published versions. Digits are case-sensitive: `a` represents 10 and `A` represents 36. Valid encodings retain this order in 1.0.0.

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
| Exact decimal strings, custom alphabets, Base62, or signed conversion | NumBase. |
| Arithmetic beyond representation conversion | A general-purpose big-integer library. |
| Bytes or arbitrary text with leading-zero preservation | A byte codec or relevant standard encoding. |

NumBase converts integer representations. It does not generate IDs, encrypt values, or encode arbitrary text losslessly. Alphabet order determines output, leading zeros normalize, and `-` denotes a negative sign.

## Modules and TypeScript

The package root exports the CommonJS constructor. Native Node.js imports receive it as the default export. An explicit ESM entry and generated declarations are also available:

```ts
import NumBase from 'numbase/dist/numbase.mjs';
const base = new NumBase();
const code: string = base.encode('9007199254740993');
const small: string = base.encode(42);
```

CommonJS TypeScript consumers can use `import NumBase = require('numbase')`.

For browser scripts, `dist/numbase.min.js` exposes `window.NumBase`. AMD/CMD loaders and deep imports such as `numbase/dist/numbase` remain supported. Existing JavaScript entries retain ES5 syntax; BigInt is optional at runtime.

## Migrating from 0.x

1.0.0 deliberately replaces permissive conversion with one safe API. See [CHANGELOG.md](CHANGELOG.md) for the breaking changes.

- Replace numeric literals outside the safe integer range with decimal strings or bigint.
- Replace string/null radices with numbers, or omit the radix for the default.
- Validate or catch invalid input: methods now throw instead of returning it unchanged. `decode('')` and `decode('-')` no longer mean zero.
- Omit the alphabet for the default; empty/null, one-symbol, duplicate, and sign-conflicting alphabets now throw.
- `encodeStrict()` / `decodeStrict()` existed only in the unpublished maintenance branch. Use `encode()` / `decode()`; there is no separate strict mode.

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
