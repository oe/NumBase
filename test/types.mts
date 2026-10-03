import NumBase from '../dist/numbase.mjs';
const base = new NumBase();
const value: string = base.decode(base.encode('12345678901234567890'));
// @ts-expect-error alphabet must be a string
new NumBase(42);

import Legacy = require('..');
const emoji = new NumBase('😀😁😂😃', { unicode: true });
const hexadecimal = new Legacy('0123456789abcdef');
const converted: string = hexadecimal.convert('ff', emoji);
const reverse: string = emoji.convert(converted, hexadecimal);
const strict: string = emoji.encode(42);
// @ts-expect-error strict Unicode decoding requires a string
emoji.decode(42);

// @ts-expect-error alphabet entries are readonly
base.BASE[0] = 'x';
// @ts-expect-error alphabet cannot be replaced
base.BASE = ['0', '1'];
// @ts-expect-error default radix is fixed by the alphabet
base.MAX_BASE = 2;
