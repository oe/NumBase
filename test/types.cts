import NumBase = require('..');
const base = new NumBase('0123456789abcdef');
const encoded: string = base.encode('9007199254740993');
const decoded: string = base.decode(encoded);
const numeric: string | number = base.encode(42);
const bigint: string | bigint = base.encode(42n);
const invalid: string | { value: number } = base.encode({ value: 42 });
base.encode('10', '2');
base.decode('10', null);
base.BASE = ['0', '1'];
base.MAX_BASE = 2;
// @ts-expect-error alphabet must be a string
new NumBase(123);
// @ts-expect-error radix must be a number or string
base.encode('10', {});
// @ts-expect-error numeric input can pass through unchanged
const definite: string = base.encode(42);
