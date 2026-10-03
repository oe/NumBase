import NumBase from '../dist/numbase.mjs';
const base = new NumBase();
const value: string = base.decode(base.encode('12345678901234567890'));
// @ts-expect-error alphabet must be a string
new NumBase(42);
