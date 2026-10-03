# Encoding fixtures

`integer-encodings.json` contains fixed decimal/string pairs for the two Base62 orders, Bitcoin-style Base58 digits, and Crockford-style Base32 digits. Expectations were generated independently with Python's arbitrary-precision `int` and `divmod`, not by NumBase. Negative zero preserves the input sign.

Lowercase-first vectors were checked against published NumBase 0.1.1. Nonnegative uppercase-first vectors were checked against `@sindresorhus/base62` 1.0.0. Nonnegative Base58 vectors were checked against `base-x` 5.0.1 using minimal unsigned bytes (one zero byte for integer zero); this agreement does not imply identical leading-zero-byte semantics.

These comparisons were performed when creating the fixtures. Competitors are not test or runtime dependencies. The tests consume committed expectations and verify both native and no-BigInt paths. Update expectations only after reviewing the encoding compatibility implications; do not regenerate them from the implementation under test.

`numbase-0.1.1.cjs` is the published MIT-licensed readable distribution retained as the legacy behavior reference.
