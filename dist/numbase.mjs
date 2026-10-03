/*! numbase v0.1.2 | MIT | Saiya */
/** Convert decimal integers and strings in a custom radix without Number rounding. */
var DEFAULT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function isInteger(value) {
  return /^-?\d+$/.test('' + value);
}

function isExponential(value) {
  return /e\+/.test(String(value));
}

function NumBase(charList) {
  var alphabet = (charList || DEFAULT_ALPHABET).split('');
  var seen = Object.create(null);
  for (var i = 0; i < alphabet.length; i++) {
    var symbol = alphabet[i];
    if (seen[symbol]) throw new TypeError('duplicated character <' + symbol + '> found');
    seen[symbol] = true;
  }
  this.BASE = alphabet;
  if (isExponential(Math.pow(alphabet.length, 2))) {
    throw new TypeError('the base is super big, consider a small one');
  }
  this.MAX_BASE = alphabet.length;
}

// Long division visits the decimal string by index instead of slicing its suffix.
function divide(decimal, radix) {
  var quotient = [];
  var remainder = 0;
  for (var i = 0; i < decimal.length; i++) {
    var character = decimal.charAt(i);
    var value = character >= '0' && character <= '9'
      ? remainder * 10 + Number(character)
      : Number(String(remainder) + character);
    quotient.push(String(Math.floor(value / radix)));
    remainder = value % radix;
  }
  return { times: quotient.join('').replace(/^0+/, ''), mod: remainder };
}

NumBase.prototype.encode = function (number, radix) {
  if (radix == null) radix = this.MAX_BASE;
  if (typeof number === 'number' && isExponential(number)) {
    throw new TypeError('number you wanna encode is super big, conside pass it as a string instead');
  }
  if (!(isInteger(number) && isInteger(radix) && radix <= this.MAX_BASE && radix > 1)) {
    return number;
  }
  var decimal = String(number);
  var sign = '';
  if (decimal.charAt(0) === '-') {
    sign = '-';
    decimal = decimal.slice(1);
  }
  var result = [];
  // At most 15 decimal digits fit exactly in Number; keep larger inputs as strings.
  if (decimal.length <= 15 && !/[^0-9]/.test(decimal)) {
    var value = Number(decimal);
    do {
      result.push(this.BASE[value % radix] + '');
      value = Math.floor(value / radix);
    } while (value);
    return sign + result.reverse().join('');
  }
  while (decimal) {
    var divided = divide(decimal, radix);
    result.push(this.BASE[divided.mod] + '');
    decimal = divided.times;
  }
  return sign + result.reverse().join('');
};

// One Horner step: decimal * radix + digit, with a single carry pass.
function multiplyAdd(decimal, radix, digit) {
  var result = [];
  var carry = digit;
  for (var i = decimal.length - 1; i >= 0; i--) {
    var value = Number(decimal.charAt(i)) * radix + carry;
    result.push(String(value % 10));
    carry = Math.floor(value / 10);
  }
  while (carry) {
    result.push(String(carry % 10));
    carry = Math.floor(carry / 10);
  }
  return result.reverse().join('');
}

NumBase.prototype.decode = function (encoded, radix) {
  if (radix == null) radix = this.MAX_BASE;
  if (!(isInteger(radix) && radix <= this.MAX_BASE && radix > 1)) return encoded;
  var input = '' + encoded;
  var sign = '';
  if (input.charAt(0) === '-') {
    sign = '-';
    input = input.slice(1);
  }
  // Rebuild per call: BASE is public and its legacy mutability is preserved.
  // For a few symbols, direct scans avoid the cost of building a full lookup.
  var indexes;
  if (input.length >= 8) {
    indexes = Object.create(null);
    for (var i = 0; i < this.BASE.length; i++) {
      var symbol = this.BASE[i];
      if (typeof symbol === 'string' && symbol.length === 1 && indexes[symbol] === undefined) {
        indexes[symbol] = i;
      }
    }
  }
  var result = '0';
  for (var j = 0; j < input.length; j++) {
    var character = input.charAt(j);
    var digit = indexes ? indexes[character] : this.BASE.indexOf(character);
    if (digit === undefined || digit === -1) throw new TypeError('unexpected character <' + character + '> found');
    if (digit >= radix) throw new TypeError('<' + character + '> is out of the base limit');
    result = multiplyAdd(result, radix, digit);
  }
  return sign + result;
};

export default NumBase;
