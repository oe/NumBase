/** Convert decimal integers and strings in a custom radix without Number rounding. */
const DEFAULT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function isInteger(value: unknown) {
  // Keep legacy string coercion, including its TypeError for Symbols.
  return /^-?\d+$/.test('' + (value as string));
}

function isExponential(value: unknown) {
  return /e\+/.test(String(value));
}

// Long division visits the decimal string by index instead of slicing its suffix.
function divide(decimal: string, radix: number) {
  const quotient = [];
  let remainder = 0;
  for (let i = 0; i < decimal.length; i++) {
    const character = decimal.charAt(i);
    const value = character >= '0' && character <= '9'
      ? remainder * 10 + Number(character)
      : Number(String(remainder) + character);
    quotient.push(String(Math.floor(value / radix)));
    remainder = value % radix;
  }
  return { times: quotient.join('').replace(/^0+/, ''), mod: remainder };
}

// One Horner step: decimal * radix + digit, with a single carry pass.
function multiplyAdd(decimal: string, radix: number, digit: number) {
  const result = [];
  let carry = digit;
  for (let i = decimal.length - 1; i >= 0; i--) {
    const value = Number(decimal.charAt(i)) * radix + carry;
    result.push(String(value % 10));
    carry = Math.floor(value / 10);
  }
  while (carry) {
    result.push(String(carry % 10));
    carry = Math.floor(carry / 10);
  }
  return result.reverse().join('');
}

type Radix = number | string | null;

export default class NumBase {
  BASE: string[];
  MAX_BASE: number;

  constructor(charList?: string | null) {
    const alphabet = (charList || DEFAULT_ALPHABET).split('');
    const seen: Record<string, boolean | undefined> = Object.create(null);
    for (let i = 0; i < alphabet.length; i++) {
      const symbol = alphabet[i];
      if (seen[symbol]) throw new TypeError('duplicated character <' + symbol + '> found');
      seen[symbol] = true;
    }
    this.BASE = alphabet;
    if (isExponential(Math.pow(alphabet.length, 2))) {
      throw new TypeError('the base is super big, consider a small one');
    }
    this.MAX_BASE = alphabet.length;
  }

  encode(value: string, radix?: Radix): string;
  encode(value: number, radix?: Radix): string | number;
  encode(value: bigint, radix?: Radix): string | bigint;
  encode<T>(value: T, radix?: Radix): string | T;
  encode(number: unknown, radix?: Radix): unknown {
    if (radix == null) radix = this.MAX_BASE;
    if (typeof number === 'number' && isExponential(number)) {
      throw new TypeError('number you wanna encode is super big, conside pass it as a string instead');
    }
    if (!(isInteger(number) && isInteger(radix) && +radix <= this.MAX_BASE && +radix > 1)) {
      return number;
    }
    const base = +radix;
    let decimal = String(number);
    let sign = '';
    if (decimal.charAt(0) === '-') {
      sign = '-';
      decimal = decimal.slice(1);
    }
    const result = [];
    // At most 15 decimal digits fit exactly in Number; keep larger inputs as strings.
    if (decimal.length <= 15 && !/[^0-9]/.test(decimal)) {
      let value = Number(decimal);
      do {
        result.push(this.BASE[value % base] + '');
        value = Math.floor(value / base);
      } while (value);
      return sign + result.reverse().join('');
    }
    while (decimal) {
      const divided = divide(decimal, base);
      result.push(this.BASE[divided.mod] + '');
      decimal = divided.times;
    }
    return sign + result.reverse().join('');
  }

  decode(value: string, radix?: Radix): string;
  decode<T>(value: T, radix?: Radix): string | T;
  decode(encoded: unknown, radix?: Radix): unknown {
    if (radix == null) radix = this.MAX_BASE;
    if (!(isInteger(radix) && +radix <= this.MAX_BASE && +radix > 1)) return encoded;
    const base = +radix;
    let input = '' + (encoded as string);
    let sign = '';
    if (input.charAt(0) === '-') {
      sign = '-';
      input = input.slice(1);
    }
    // Rebuild per call: BASE is public and its legacy mutability is preserved.
    // For a few symbols, direct scans avoid the cost of building a full lookup.
    let indexes: Record<string, number | undefined> | undefined;
    if (input.length >= 8) {
      const lookup: Record<string, number | undefined> = Object.create(null);
      indexes = lookup;
      for (let i = 0; i < this.BASE.length; i++) {
        const symbol = this.BASE[i];
        if (typeof symbol === 'string' && symbol.length === 1 && lookup[symbol] === undefined) {
          lookup[symbol] = i;
        }
      }
    }
    let result = '0';
    for (let j = 0; j < input.length; j++) {
      const character = input.charAt(j);
      const digit = indexes ? indexes[character] : this.BASE.indexOf(character);
      if (digit === undefined || digit === -1) throw new TypeError('unexpected character <' + character + '> found');
      if (digit >= base) throw new TypeError('<' + character + '> is out of the base limit');
      result = multiplyAdd(result, base, digit);
    }
    return sign + result;
  }
}
