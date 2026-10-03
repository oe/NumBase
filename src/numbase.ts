/** Convert decimal integers and strings in a custom radix without Number rounding. */
const DEFAULT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Long division visits the decimal string by index instead of slicing its suffix.
function divide(decimal: string, radix: number) {
  const quotient = [];
  let remainder = 0;
  for (let i = 0; i < decimal.length; i++) {
    const value = remainder * 10 + Number(decimal.charAt(i));
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

// Read code points without requiring Array.from, iterators, or a runtime polyfill.
function unicodeSymbols(input: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < input.length; i++) {
    const first = input.charCodeAt(i);
    if (first >= 0xd800 && first <= 0xdbff) {
      const second = input.charCodeAt(i + 1);
      if (!(second >= 0xdc00 && second <= 0xdfff)) throw new TypeError('unpaired Unicode surrogate');
      result.push(input.slice(i, i + 2));
      i++;
    } else {
      if (first >= 0xdc00 && first <= 0xdfff) throw new TypeError('unpaired Unicode surrogate');
      result.push(input.charAt(i));
    }
  }
  return result;
}

interface NumBaseOptions {
  /** Interpret each Unicode code point as one digit. Defaults to UTF-16 code units. */
  unicode?: boolean;
}

interface ConvertOptions {
  sourceRadix?: number;
  targetRadix?: number;
}

interface ConversionTarget {
  encode(value: string, radix?: number): string;
}

export default class NumBase {
  readonly BASE!: readonly string[];
  readonly MAX_BASE!: number;
  private readonly unicode!: boolean;
  private readonly digitIndexes!: Readonly<Record<string, number | undefined>>;
  private readonly nativeRadixLimit!: number;

  constructor(charList?: string, options?: NumBaseOptions) {
    if (options !== undefined) {
      if (options === null || typeof options !== 'object') throw new TypeError('options must be an object');
      if (options.unicode !== undefined && typeof options.unicode !== 'boolean') {
        throw new TypeError('unicode must be a boolean');
      }
    }
    const unicode = options?.unicode === true;
    const characters = charList === undefined ? DEFAULT_ALPHABET : charList;
    if (typeof characters !== 'string') throw new TypeError('alphabet must be a string');
    const symbols = unicode ? unicodeSymbols(characters) : characters.split('');
    if (symbols.length < 2) throw new TypeError('alphabet requires at least two symbols');
    const digitIndexes: Record<string, number | undefined> = Object.create(null);
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      if (symbol === '-') throw new TypeError('alphabet must not contain the negative sign');
      if (digitIndexes[symbol] !== undefined) throw new TypeError('alphabet symbols must be unique');
      digitIndexes[symbol] = i;
    }
    // BigInt.toString supports radices 2–36 with digits 0–9, a–z.
    // Only the matching prefix can use native formatting; other alphabets use mapping.
    let nativeRadixLimit = 0;
    while (nativeRadixLimit < Math.min(36, symbols.length) &&
      symbols[nativeRadixLimit] === DEFAULT_ALPHABET.charAt(nativeRadixLimit)) {
      nativeRadixLimit++;
    }
    Object.defineProperties(this, {
      BASE: { value: Object.freeze(symbols), enumerable: true },
      MAX_BASE: { value: symbols.length, enumerable: true },
      unicode: { value: unicode },
      digitIndexes: { value: Object.freeze(digitIndexes) },
      nativeRadixLimit: { value: nativeRadixLimit },
    });
  }

  /** Encode an exact integer, rejecting unsafe Numbers and invalid input. */
  encode(number: string | number | bigint, radix?: number): string {
    const base = this.validateRadix(radix);
    if (typeof number === 'number') {
      if (Math.floor(number) !== number || Math.abs(number) > 9007199254740991) {
        throw new TypeError('encode requires a safe integer Number; use a decimal string or bigint');
      }
    } else if (typeof number === 'string') {
      const match = /^-?[0-9]+$/.exec(number);
      if (!match || match[0] !== number) throw new TypeError('encode requires a decimal integer string');
    } else if (typeof number !== 'bigint') {
      throw new TypeError('encode requires a decimal string, safe integer Number, or bigint');
    }
    let decimal = String(number);
    let sign = '';
    if (decimal.charAt(0) === '-') {
      sign = '-';
      decimal = decimal.slice(1);
    }
    const result = [];
    // At most 15 decimal digits fit exactly in Number; keep larger inputs as strings.
    if (decimal.length <= 15) {
      let value = Number(decimal);
      do {
        result.push(this.BASE[value % base] + '');
        value = Math.floor(value / base);
      } while (value);
      return sign + result.reverse().join('');
    }
    // No bigint literals: these entries must still parse in ES5 environments.
    if (typeof BigInt === 'function') {
      let value = BigInt(decimal);
      if (base <= this.nativeRadixLimit) return sign + value.toString(base);
      const bigRadix = BigInt(base);
      do {
        result.push(this.BASE[Number(value % bigRadix)] + '');
        value /= bigRadix;
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

  /** Decode nonempty alphabet digits to an exact decimal string. */
  decode(encoded: string, radix?: number): string {
    const base = this.validateRadix(radix);
    if (typeof encoded !== 'string' || !encoded.length || encoded === '-') {
      throw new TypeError('decode requires a nonempty encoded integer');
    }
    let input = encoded;
    let sign = '';
    if (input.charAt(0) === '-') {
      sign = '-';
      input = input.slice(1);
    }
    const symbols = this.unicode ? unicodeSymbols(input) : input;
    const bigRadix = typeof BigInt === 'function' ? BigInt(base) : undefined;
    let integer = 0;
    let large: bigint | undefined;
    let result = '0';
    for (let j = 0; j < symbols.length; j++) {
      const character = symbols[j];
      const digit = this.digitIndexes[character];
      if (digit === undefined) throw new TypeError('unexpected character <' + character + '> found');
      if (digit >= base) throw new TypeError('<' + character + '> is out of the base limit');
      if (bigRadix !== undefined) {
        if (large !== undefined) {
          large = large * bigRadix + BigInt(digit);
        } else {
          const next = integer * base + digit;
          if (next <= 9007199254740991) integer = next;
          else large = BigInt(integer) * bigRadix + BigInt(digit);
        }
      } else {
        result = multiplyAdd(result, base, digit);
      }
    }
    return sign + (bigRadix === undefined ? result : large === undefined ? String(integer) : String(large));
  }

  /** Convert between alphabets using exact decimal strings and strict validation. */
  convert(value: string, target: ConversionTarget, options?: ConvertOptions): string {
    if (!target || typeof target.encode !== 'function') {
      throw new TypeError('conversion target must provide encode');
    }
    if (options !== undefined && (options === null || typeof options !== 'object')) {
      throw new TypeError('options must be an object');
    }
    return target.encode(this.decode(value, options?.sourceRadix), options?.targetRadix);
  }

  private validateRadix(radix?: number): number {
    const base = radix === undefined ? this.MAX_BASE : radix;
    if (typeof base !== 'number' || Math.floor(base) !== base || base < 2 || base > this.MAX_BASE) {
      throw new RangeError('radix must be an integer from 2 through MAX_BASE');
    }
    return base;
  }
}
