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

const strictEncoded: string = base.encodeStrict(42);
const strictBigint: string = base.encodeStrict(9007199254740993n);
const strictDecoded: string = base.decodeStrict('a');
const emoji = new NumBase('😀😁😂😃', { unicode: true });
const converted: string = base.convert('f', emoji, { sourceRadix: 16, targetRadix: 4 });
// @ts-expect-error strict decimal input cannot be an object
base.encodeStrict({ value: 42 });
// @ts-expect-error strict radix must be numeric
base.encodeStrict('10', '2');
// @ts-expect-error strict decoding requires an encoded string
base.decodeStrict(10);
// @ts-expect-error target must expose strict encoding
base.convert('f', {});
// @ts-expect-error conversion radix must be numeric
base.convert('f', emoji, { targetRadix: '4' });
// @ts-expect-error Unicode mode must be boolean
new NumBase('01', { unicode: 'true' });
