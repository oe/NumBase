# Changelog

## Unreleased

- Encode results by prepending complete alphabet symbols, avoiding the temporary digit array and reverse/join pass.
- Extract multiple digits per BigInt division, then expand the exact remainder with Number arithmetic. Preserve zero padding between groups, signed zero, custom alphabets and Unicode symbols.
- Use native formatting for radices 2–36, translating digit values for DIY alphabets when needed. Keep the no-BigInt fallback. No API or encoding-format changes.

## 1.1.0

### Fixed configuration

- `BASE` is a frozen readonly array, and `MAX_BASE` is its fixed length. Neither property can be reassigned. This changes both 0.x and 1.0.0 behavior: create a new instance to change alphabets, or supply a radix per operation.

### Simplification and performance

- Validate the alphabet and build its digit lookup once at construction. Remove mutable configuration snapshots, per-operation alphabet scans, and input-length-dependent lookup rebuilding.
- Determine native radix-formatting compatibility once from the alphabet prefix. Keep exact BigInt acceleration and the no-BigInt fallback.
- Prefer modern import syntax throughout README examples.

## 1.0.0

### Breaking changes

- `encode()` and `decode()` always return strings or throw. Invalid inputs and radices no longer pass through unchanged, and coercible objects are rejected.
- `encode()` rejects unsafe, fractional, and non-finite Numbers. Pass large integers as exact decimal strings or bigint. Lost Number precision cannot be recovered.
- Radices must be numeric integers. String and null radices are rejected; omit the argument to use the default.
- `decode()` requires a nonempty string with digits. Empty and sign-only values are rejected rather than treated as zero.
- An explicit constructor alphabet must be a string with at least two unique symbols and no negative sign. Empty/null and one-symbol alphabets no longer select a default or pass through conversion.
- Public `BASE` and `MAX_BASE` changes are validated before conversion.
- The unpublished `encodeStrict()` and `decodeStrict()` methods are removed; their checks are now the default behavior.

### Improvements

- Native BigInt acceleration with an exact decimal-string fallback for older runtimes.
- Exact alphabet-to-alphabet conversion and opt-in Unicode code-point alphabets.
- Generated TypeScript declarations and native ESM entry, preserving CommonJS, browser globals, AMD/CMD, deep imports, and ES5 syntax.
- TypeScript development, Vite + pnpm builds, Vitest/V8 coverage gates, reproducible builds, and Node 22/24 CI.
- Documented database-ID batches, alphabet recipes, and fixed encoding compatibility vectors.

Default Base62 remains `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`. Valid integer encodings, UTF-16 defaults, negative signs, string negative zero, and leading-zero normalization are preserved.
