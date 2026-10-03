# Competitor comparison

The feature comparison in the main README describes the installed versions: NumBase 1.1.0, @sindresorhus/base62 1.0.0, big-integer 1.6.52, and base-x 5.0.1. It is based on their shipped README/source and the feature assertions in [compare.mjs](compare.mjs).

- [@sindresorhus/base62 1.0.0](https://www.npmjs.com/package/@sindresorhus/base62/v/1.0.0): custom alphabets must have exactly 62 unique characters. Integer/bigint methods accept non-negative values; separate methods encode bytes and text. Its default alphabet puts uppercase before lowercase, so we configure NumBase's lowercase-first alphabet for equal outputs.
- [big-integer 1.6.52](https://www.npmjs.com/package/big-integer/v/1.6.52): arbitrary-precision arithmetic plus custom alphabets and arbitrary radices, including zero/unary/negative bases and `<digit>` notation. Custom alphabet indexing uses UTF-16 code units. Its radix parser is case-insensitive by default; our Base62 decode adapter explicitly sets `caseSensitive = true`.
- [base-x 5.0.1](https://www.npmjs.com/package/base-x/v/5.0.1): byte-array encoding with custom alphabets of fewer than 255 symbols and byte-range character codes. Leading zero bytes are preserved. NumBase converts integers and normalizes leading zeros; these are different contracts. base-x is covered by feature checks, and is excluded from integer timing tables.

DIY digit alphabets are not unique to NumBase. NumBase focuses on exact integer representation conversion with a three-method API, caller-defined symbols/radices, signed decimal strings and opt-in Unicode code points. Use an arithmetic library for arithmetic, and a byte codec for bytes/text.

## Reproduce

From the repository root:

```sh
pnpm build
pnpm --dir benchmarks/competitors install --frozen-lockfile --ignore-scripts
node benchmarks/competitors/compare.mjs > /tmp/numbase-comparison.json
# Optional second runtime:
npx --yes node@22 benchmarks/competitors/compare.mjs > /tmp/numbase-comparison-node22.json
```

The default run imports the pinned, published NumBase 1.1.0, so it remains a stable baseline when local source changes. Competitor dependencies are pinned in this private project's own lockfile. They are not NumBase runtime dependencies and are not included in the npm package. Timing assertions check equivalent output before measurement; feature assertions check the selected documented differences.

## Method

- NumBase uses the published native ESM entry; `--candidate` adds the local distributed native ESM entry. Native BigInt is available to all packages; this report does not measure fallback runtimes, browsers, import time, bundle size, or memory usage.
- Encoding starts with a decimal string and returns an encoded string. Decoding starts with encoded digits and returns a decimal string. Required adapter parsing/formatting is inside the timed operation: `encodeBigInt(BigInt(decimal))`, `decodeBigInt(encoded).toString()`, and big-integer parsing/formatting.
- All functions use the same digit-value order. Only positive integers are timed, so all integer libraries support the workload. Input-validation contracts differ; these valid-input timings do not imply equivalent error handling.
- Each dataset contains 16 deterministic inputs. The 64-/128-bit inputs have their high bit set; the long inputs have exactly 1,000 decimal digits. The generator seed and input hashes are recorded in JSON. Zero, negative values, invalid inputs, and pre-parsed bigint inputs are not timed.
- Instances, alphabets and inputs are constructed outside the timed region. Reuse matters: these numbers do not include per-operation constructor cost.
- Each function warms up for `min(iterations, 512)` calls. Each of 15 samples uses 8,192, 4,096, or 128 operations for the respective datasets. Library order rotates and reverses between samples. Returned string lengths are consumed.
- Tables show median microseconds per operation (lower is faster), rounded to three decimals. Raw samples, runtime versions, CPU and architecture are retained. This is one Linux x64 container on an Intel Xeon Platinum 8573C; host scheduling and GC can affect results. It is not a universal ranking or an application throughput guarantee.

## v24.19.0

[Raw samples and metadata](results-node24.json).

### Base62

| Input | Operation | NumBase | @sindresorhus/base62 | big-integer |
| --- | --- | ---: | ---: | ---: |
| 64-bit integers | encode | 1.532 | 1.134 | 3.670 |
| 64-bit integers | decode | 0.334 | 0.985 | 5.444 |
| 128-bit integers | encode | 3.124 | 2.293 | 6.458 |
| 128-bit integers | decode | 1.475 | 2.324 | 7.558 |
| 1,000 decimal digits | encode | 280.843 | 260.558 | 351.803 |
| 1,000 decimal digits | decode | 114.769 | 119.386 | 196.794 |

### Standard hexadecimal

| Input | Operation | NumBase | native BigInt | big-integer |
| --- | --- | ---: | ---: | ---: |
| 64-bit integers | encode | 0.228 | 0.125 | 4.724 |
| 64-bit integers | decode | 0.564 | 0.165 | 3.174 |
| 128-bit integers | encode | 0.261 | 0.195 | 9.298 |
| 128-bit integers | decode | 2.380 | 0.275 | 6.492 |
| 1,000 decimal digits | encode | 5.317 | 5.029 | 509.495 |
| 1,000 decimal digits | decode | 173.339 | 20.671 | 300.386 |

## v22.23.3

[Raw samples and metadata](results-node22.json).

### Base62

| Input | Operation | NumBase | @sindresorhus/base62 | big-integer |
| --- | --- | ---: | ---: | ---: |
| 64-bit integers | encode | 1.625 | 1.143 | 3.425 |
| 64-bit integers | decode | 0.367 | 1.152 | 5.349 |
| 128-bit integers | encode | 2.787 | 2.062 | 6.277 |
| 128-bit integers | decode | 1.464 | 2.529 | 7.443 |
| 1,000 decimal digits | encode | 214.381 | 206.618 | 299.058 |
| 1,000 decimal digits | decode | 113.123 | 124.923 | 196.435 |

### Standard hexadecimal

| Input | Operation | NumBase | native BigInt | big-integer |
| --- | --- | ---: | ---: | ---: |
| 64-bit integers | encode | 0.198 | 0.143 | 5.070 |
| 64-bit integers | decode | 0.641 | 0.156 | 3.380 |
| 128-bit integers | encode | 0.278 | 0.166 | 9.217 |
| 128-bit integers | decode | 2.347 | 0.278 | 6.426 |
| 1,000 decimal digits | encode | 5.598 | 4.316 | 431.858 |
| 1,000 decimal digits | decode | 164.823 | 19.295 | 265.062 |

## What the published 1.1.0 measurements support

NumBase decoded the sampled 64-/128-bit Base62 values faster than both integer competitors in these runs. @sindresorhus/base62 encoded all three Base62 datasets faster than NumBase. Their 1,000-digit decoding times were close enough that this report makes no broad claim about a long-input speed advantage.

NumBase beat big-integer on the selected conversion workloads, but big-integer provides a much broader arithmetic API. Native BigInt beat NumBase for standard hexadecimal encoding and decoding, especially long hexadecimal decoding; if standard radices and native input/output are sufficient, native BigInt is a good choice.

The reason to choose NumBase is the combination of configurable radix/digit symbols, exact decimal-string conversion and a small focused API. The benchmarks support specific performance statements, not a claim that NumBase is always fastest.

## Unreleased conversion optimization

The working-tree candidate keeps the API, validation and digit formats unchanged. It borrows the direct string-prepending approach used by @sindresorhus/base62, avoiding an intermediate array and reverse/join. Its larger improvement comes from extracting several digits per BigInt division: Base62 extracts eight digits at a time. Each remainder is bounded by Number.MAX_SAFE_INTEGER and expanded with exact Number arithmetic; the whole integer remains BigInt. Interior groups retain their zero padding. Radices 2–36 use native formatting with digit-symbol translation for DIY alphabets, including Unicode code points. For decoding, binary/octal/hexadecimal inputs longer than 15 symbols use native prefixed BigInt parsing after every digit is validated. Custom symbols are translated into standard digits; signs stay outside native parsing so signed zero is preserved. Short inputs and other radices keep the existing accumulation path. The decimal-string fallback remains available.

Reproduce the candidate comparison after building:

```sh
node benchmarks/competitors/compare.mjs --candidate > /tmp/numbase-candidate-node24.json
npx --yes node@22 benchmarks/competitors/compare.mjs --candidate > /tmp/numbase-candidate-node22.json
node benchmarks/competitors/compare.mjs --candidate --materialize > /tmp/numbase-candidate-materialized.json
```

The following Base62 encoding tables use the same method and inputs as above, timing the published baseline and candidate together. Units are median microseconds per operation. Candidate metadata records the SHA-256 of the measured distribution; its package version is still 1.1.0 because it is **unreleased**. Full JSON also retains decoding, hexadecimal and big-integer results.

### Node 24.19.0

[Raw samples and metadata](results-candidate-node24.json).

| Input | Published 1.1.0 | Unreleased candidate | @sindresorhus/base62 1.0.0 |
| --- | ---: | ---: | ---: |
| 64-bit integers | 1.398 | 0.673 | 1.035 |
| 128-bit integers | 2.947 | 1.163 | 2.183 |
| 1,000 decimal digits | 253.272 | 44.948 | 245.844 |

### Node 22.23.3

[Raw samples and metadata](results-candidate-node22.json).

| Input | Published 1.1.0 | Unreleased candidate | @sindresorhus/base62 1.0.0 |
| --- | ---: | ---: | ---: |
| 64-bit integers | 1.503 | 0.658 | 1.120 |
| 128-bit integers | 2.646 | 0.992 | 2.026 |
| 1,000 decimal digits | 190.587 | 42.163 | 189.073 |

### Node 24.19.0, materialized output

[Raw samples and metadata](results-candidate-materialized-node24.json).

| Input | Published 1.1.0 | Unreleased candidate | @sindresorhus/base62 1.0.0 |
| --- | ---: | ---: | ---: |
| 64-bit integers | 1.523 | 0.806 | 1.207 |
| 128-bit integers | 2.611 | 1.307 | 2.347 |
| 1,000 decimal digits | 250.701 | 47.852 | 250.391 |

The candidate encoded these Base62 datasets faster than both the published baseline and @sindresorhus/base62 in both Node versions. The materialized run includes UTF-8 Buffer allocation for every result, so the benefit survives consuming the actual output bytes rather than only the string length. This extra allocation is specific to that experiment, not part of NumBase's API.

These results support an encoding improvement for the measured workloads. Base62 decoding uses the same accumulation algorithm as published 1.1.0; timing differences are not evidence of a decoding optimization there. They do not establish optimal performance for every radix, alphabet, input type, engine or input length. Native BigInt remains useful for standard radices. No memory or application-wide speedup claim is made.

The candidate passes 36 Vitest tests with 100% statements, branches, functions and lines, plus consumer-type and packed-distribution checks. Independent integer oracles cover all radices 2–62 with standard/reversed alphabets, large radix powers and zero-filled groups, negative values and emoji. Additional radix 63–1024 cases check exact large integers in both native and no-BigInt environments. The minified bundle grows from 4,162 to 4,696 bytes (gzip: 1,707 to 1,918 bytes), with no new runtime dependency or per-instance cache.

### Native hexadecimal decoding

The same fresh runs compare decimal-string output after hexadecimal parsing. NumBase validates its configured alphabet before native parsing; the bare BigInt reference has no NumBase validation layer. Units are median microseconds per operation.

| Runtime | Input | Published 1.1.0 | Unreleased candidate | Native BigInt |
| --- | --- | ---: | ---: | ---: |
| Node 24 | 64-bit integers | 0.564 | 0.519 | 0.165 |
| Node 24 | 128-bit integers | 2.124 | 0.942 | 0.246 |
| Node 24 | 1,000 decimal digits | 150.400 | 40.691 | 18.815 |
| Node 22 | 64-bit integers | 0.622 | 0.524 | 0.151 |
| Node 22 | 128-bit integers | 2.213 | 0.975 | 0.244 |
| Node 22 | 1,000 decimal digits | 180.020 | 41.823 | 19.506 |

For these 1,000-digit values, hexadecimal decoding is approximately 3.7–4.3× faster than published 1.1.0. Bare native BigInt is still approximately 2.1–2.2× faster than the candidate, reflecting the cost of strict alphabet validation and API handling. This is not a claim of zero overhead or equivalent validation contracts.
