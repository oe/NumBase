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
const strict: string = emoji.encodeStrict(42);
// @ts-expect-error strict Unicode decoding requires a string
emoji.decodeStrict(42);
