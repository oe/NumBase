/** Convert decimal integers and strings in a custom radix without Number rounding. */
const DEFAULT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function hasStandardDigits(alphabet: string[], radix: number): boolean {
  for (let i = 0; i < radix; i++) {
    if (alphabet[i] !== DEFAULT_ALPHABET.charAt(i)) return false;
  }
  return true;
}

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

function isUnicodeSymbol(symbol: string): boolean {
  const first = symbol.charCodeAt(0);
  if (symbol.length === 1) return first < 0xd800 || first > 0xdfff;
  const second = symbol.charCodeAt(1);
  return symbol.length === 2 && first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff;
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
  encodeStrict(value: string, radix?: number): string;
}

type Radix = number | string | null;

export default class NumBase {
  BASE: string[];
  MAX_BASE: number;
  private readonly unicode!: boolean;
  private validatedAlphabet!: string[];

  constructor(charList?: string | null, options?: NumBaseOptions) {
    if (options !== undefined) {
      if (options === null || typeof options !== 'object') throw new TypeError('options must be an object');
      if (options.unicode !== undefined && typeof options.unicode !== 'boolean') {
        throw new TypeError('unicode must be a boolean');
      }
    }
    // Keep one object layout for both modes without adding enumerable public state.
    Object.defineProperties(this, {
      unicode: { value: options?.unicode === true },
      validatedAlphabet: { value: [], writable: true },
    });
    const characters = charList || DEFAULT_ALPHABET;
    if (this.unicode && typeof characters !== 'string') throw new TypeError('Unicode alphabet must be a string');
    const alphabet = this.unicode ? unicodeSymbols(characters) : characters.split('');
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
    // No bigint literals: these entries must still parse in ES5 environments.
    // Keep unusual legacy coercions and oversized mutated radices on the old path.
    if (typeof BigInt === 'function' && base <= 4294967295 && !/[^0-9]/.test(decimal)) {
      let value = BigInt(decimal);
      if (base <= 36 && hasStandardDigits(this.BASE, base)) return sign + value.toString(base);
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
    const symbols = this.unicode ? unicodeSymbols(input) : input;
    // Rebuild per call: BASE is public and its legacy mutability is preserved.
    // For a few symbols, direct scans avoid the cost of building a full lookup.
    let indexes: Record<string, number | undefined> | undefined;
    if (symbols.length >= 32) {
      const lookup: Record<string, number | undefined> = Object.create(null);
      indexes = lookup;
      for (let i = 0; i < this.BASE.length; i++) {
        const symbol = this.BASE[i];
        if (typeof symbol === 'string' && (symbol.length === 1 || this.unicode) && lookup[symbol] === undefined) {
          lookup[symbol] = i;
        }
      }
    }
    const bigRadix = typeof BigInt === 'function' && base <= 4294967295 ? BigInt(base) : undefined;
    let integer = 0;
    let large: bigint | undefined;
    let result = '0';
    for (let j = 0; j < symbols.length; j++) {
      const character = symbols[j];
      const digit = indexes ? indexes[character] : this.BASE.indexOf(character);
      if (digit === undefined || digit === -1) throw new TypeError('unexpected character <' + character + '> found');
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

  /** Encode exact integer input, rejecting unsafe numbers and invalid configuration. */
  encodeStrict(value: string | number | bigint, radix?: number): string {
    const base = this.strictRadix(radix);
    if (typeof value === 'number') {
      if (Math.floor(value) !== value || Math.abs(value) > 9007199254740991) {
        throw new TypeError('encodeStrict requires a safe integer Number; use a decimal string or bigint');
      }
    } else if (typeof value === 'string') {
      const match = /^-?[0-9]+$/.exec(value);
      if (!match || match[0] !== value) throw new TypeError('encodeStrict requires a decimal integer string');
    } else if (typeof value !== 'bigint') {
      throw new TypeError('encodeStrict requires a decimal string, safe integer Number, or bigint');
    }
    return this.encode(String(value), base);
  }

  /** Decode nonempty digits with strict radix and alphabet validation. */
  decodeStrict(value: string, radix?: number): string {
    const base = this.strictRadix(radix);
    if (typeof value !== 'string' || !value.length || value === '-') {
      throw new TypeError('decodeStrict requires a nonempty encoded integer');
    }
    return this.decode(value, base);
  }

  /** Convert between alphabets using exact decimal strings and strict validation. */
  convert(value: string, target: ConversionTarget, options?: ConvertOptions): string {
    if (!target || typeof target.encodeStrict !== 'function') {
      throw new TypeError('conversion target must provide encodeStrict');
    }
    if (options !== undefined && (options === null || typeof options !== 'object')) {
      throw new TypeError('options must be an object');
    }
    return target.encodeStrict(this.decodeStrict(value, options?.sourceRadix), options?.targetRadix);
  }

  private strictRadix(radix?: number): number {
    if (!Array.isArray(this.BASE) || this.BASE.length < 2) {
      throw new TypeError('strict conversion requires at least two alphabet symbols');
    }
    // Compare contents, not array identity: callers may edit BASE in place.
    let unchanged = this.BASE.length === this.validatedAlphabet.length;
    for (let i = 0; unchanged && i < this.BASE.length; i++) {
      unchanged = this.BASE[i] === this.validatedAlphabet[i];
    }
    if (!unchanged) {
      const seen: Record<string, boolean | undefined> = Object.create(null);
      for (const symbol of this.BASE) {
        if (typeof symbol !== 'string' || (this.unicode ? !isUnicodeSymbol(symbol) : symbol.length !== 1)) {
          throw new TypeError('alphabet entries must each contain one symbol');
        }
        if (symbol === '-') throw new TypeError('alphabet must not contain the negative sign');
        if (seen[symbol]) throw new TypeError('alphabet symbols must be unique');
        seen[symbol] = true;
      }
      this.validatedAlphabet = this.BASE.slice();
    }
    const base = radix === undefined ? this.MAX_BASE : radix;
    if (typeof this.MAX_BASE !== 'number' || Math.floor(this.MAX_BASE) !== this.MAX_BASE || this.MAX_BASE < 2 || this.MAX_BASE > this.BASE.length) {
      throw new RangeError('MAX_BASE must be an integer within the alphabet');
    }
    if (typeof base !== 'number' || Math.floor(base) !== base || base < 2 || base > this.MAX_BASE) {
      throw new RangeError('radix must be an integer from 2 through MAX_BASE');
    }
    return base;
  }
}
