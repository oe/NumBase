import NumBase = require('..');
const base = new NumBase('0123456789abcdef');
const encoded: string = base.encode('9007199254740993');
const decoded: string = base.decode(encoded);
const numeric: string = base.encode(42);
const bigint: string = base.encode(42n);
const alphabet: readonly string[] = base.BASE;
const radix: number = base.MAX_BASE;
const emoji = new NumBase('😀😁😂😃', { unicode: true });
const converted: string = base.convert('f', emoji, { sourceRadix: 16, targetRadix: 4 });
// @ts-expect-error alphabet must be a string
new NumBase(123);
// @ts-expect-error alphabet cannot be null
new NumBase(null);
// @ts-expect-error decimal input cannot be an object
base.encode({ value: 42 });
// @ts-expect-error radix must be numeric
base.encode('10', '2');
// @ts-expect-error null no longer selects the default radix
base.decode('10', null);
// @ts-expect-error decoding requires an encoded string
base.decode(10);
// @ts-expect-error removed redundant API
base.encodeStrict(42);
// @ts-expect-error removed redundant API
base.decodeStrict('a');
// @ts-expect-error target must expose encoding
base.convert('f', {});
// @ts-expect-error conversion radix must be numeric
base.convert('f', emoji, { targetRadix: '4' });
// @ts-expect-error Unicode mode must be boolean
new NumBase('01', { unicode: 'true' });

// @ts-expect-error alphabet entries are readonly
base.BASE[0] = 'x';
// @ts-expect-error alphabet cannot be replaced
base.BASE = ['0', '1'];
// @ts-expect-error default radix is fixed by the alphabet
base.MAX_BASE = 2;
