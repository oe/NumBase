/*! numbase v1.0.0 | MIT | Saiya */
(function (root, factory) {
  if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(function () { return factory(); });
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.NumBase = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {
  var module = { exports: {} };
//#region src/numbase.ts
/** Convert decimal integers and strings in a custom radix without Number rounding. */
var DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function divide(decimal, radix) {
	var quotient = [];
	var remainder = 0;
	for (var i = 0; i < decimal.length; i++) {
		var value = remainder * 10 + Number(decimal.charAt(i));
		quotient.push(String(Math.floor(value / radix)));
		remainder = value % radix;
	}
	return {
		times: quotient.join("").replace(/^0+/, ""),
		mod: remainder
	};
}
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
	return result.reverse().join("");
}
function unicodeSymbols(input) {
	var result = [];
	for (var i = 0; i < input.length; i++) {
		var first = input.charCodeAt(i);
		if (first >= 55296 && first <= 56319) {
			var second = input.charCodeAt(i + 1);
			if (!(second >= 56320 && second <= 57343)) throw new TypeError("unpaired Unicode surrogate");
			result.push(input.slice(i, i + 2));
			i++;
		} else {
			if (first >= 56320 && first <= 57343) throw new TypeError("unpaired Unicode surrogate");
			result.push(input.charAt(i));
		}
	}
	return result;
}
var NumBase = function() {
	function NumBase(charList, options) {
		if (options !== void 0) {
			if (options === null || typeof options !== "object") throw new TypeError("options must be an object");
			if (options.unicode !== void 0 && typeof options.unicode !== "boolean") throw new TypeError("unicode must be a boolean");
		}
		var unicode = (options === null || options === void 0 ? void 0 : options.unicode) === true;
		var characters = charList === void 0 ? DEFAULT_ALPHABET : charList;
		if (typeof characters !== "string") throw new TypeError("alphabet must be a string");
		var symbols = unicode ? unicodeSymbols(characters) : characters.split("");
		if (symbols.length < 2) throw new TypeError("alphabet requires at least two symbols");
		var digitIndexes = Object.create(null);
		for (var i = 0; i < symbols.length; i++) {
			var symbol = symbols[i];
			if (symbol === "-") throw new TypeError("alphabet must not contain the negative sign");
			if (digitIndexes[symbol] !== void 0) throw new TypeError("alphabet symbols must be unique");
			digitIndexes[symbol] = i;
		}
		var nativeRadixLimit = 0;
		while (nativeRadixLimit < Math.min(36, symbols.length) && symbols[nativeRadixLimit] === DEFAULT_ALPHABET.charAt(nativeRadixLimit)) nativeRadixLimit++;
		Object.defineProperties(this, {
			BASE: {
				value: Object.freeze(symbols),
				enumerable: true
			},
			MAX_BASE: {
				value: symbols.length,
				enumerable: true
			},
			unicode: { value: unicode },
			digitIndexes: { value: Object.freeze(digitIndexes) },
			nativeRadixLimit: { value: nativeRadixLimit }
		});
	}
	/** Encode an exact integer, rejecting unsafe Numbers and invalid input. */
	NumBase.prototype.encode = function(number, radix) {
		var base = this.validateRadix(radix);
		if (typeof number === "number") {
			if (Math.floor(number) !== number || Math.abs(number) > 9007199254740991) throw new TypeError("encode requires a safe integer Number; use a decimal string or bigint");
		} else if (typeof number === "string") {
			var match = /^-?[0-9]+$/.exec(number);
			if (!match || match[0] !== number) throw new TypeError("encode requires a decimal integer string");
		} else if (typeof number !== "bigint") throw new TypeError("encode requires a decimal string, safe integer Number, or bigint");
		var decimal = String(number);
		var sign = "";
		if (decimal.charAt(0) === "-") {
			sign = "-";
			decimal = decimal.slice(1);
		}
		var result = [];
		if (decimal.length <= 15) {
			var value = Number(decimal);
			do {
				result.push(this.BASE[value % base] + "");
				value = Math.floor(value / base);
			} while (value);
			return sign + result.reverse().join("");
		}
		if (typeof BigInt === "function") {
			var value = BigInt(decimal);
			if (base <= this.nativeRadixLimit) return sign + value.toString(base);
			var bigRadix = BigInt(base);
			do {
				result.push(this.BASE[Number(value % bigRadix)] + "");
				value /= bigRadix;
			} while (value);
			return sign + result.reverse().join("");
		}
		while (decimal) {
			var divided = divide(decimal, base);
			result.push(this.BASE[divided.mod] + "");
			decimal = divided.times;
		}
		return sign + result.reverse().join("");
	};
	/** Decode nonempty alphabet digits to an exact decimal string. */
	NumBase.prototype.decode = function(encoded, radix) {
		var base = this.validateRadix(radix);
		if (typeof encoded !== "string" || !encoded.length || encoded === "-") throw new TypeError("decode requires a nonempty encoded integer");
		var input = encoded;
		var sign = "";
		if (input.charAt(0) === "-") {
			sign = "-";
			input = input.slice(1);
		}
		var symbols = this.unicode ? unicodeSymbols(input) : input;
		var bigRadix = typeof BigInt === "function" ? BigInt(base) : void 0;
		var integer = 0;
		var large;
		var result = "0";
		for (var j = 0; j < symbols.length; j++) {
			var character = symbols[j];
			var digit = this.digitIndexes[character];
			if (digit === void 0) throw new TypeError("unexpected character <" + character + "> found");
			if (digit >= base) throw new TypeError("<" + character + "> is out of the base limit");
			if (bigRadix !== void 0) {
				if (large !== void 0) large = large * bigRadix + BigInt(digit);
				else {
					var next = integer * base + digit;
					if (next <= 9007199254740991) integer = next;
					else large = BigInt(integer) * bigRadix + BigInt(digit);
				}
			} else result = multiplyAdd(result, base, digit);
		}
		return sign + (bigRadix === void 0 ? result : large === void 0 ? String(integer) : String(large));
	};
	/** Convert between alphabets using exact decimal strings and strict validation. */
	NumBase.prototype.convert = function(value, target, options) {
		if (!target || typeof target.encode !== "function") throw new TypeError("conversion target must provide encode");
		if (options !== void 0 && (options === null || typeof options !== "object")) throw new TypeError("options must be an object");
		return target.encode(this.decode(value, options === null || options === void 0 ? void 0 : options.sourceRadix), options === null || options === void 0 ? void 0 : options.targetRadix);
	};
	NumBase.prototype.validateRadix = function(radix) {
		var base = radix === void 0 ? this.MAX_BASE : radix;
		if (typeof base !== "number" || Math.floor(base) !== base || base < 2 || base > this.MAX_BASE) throw new RangeError("radix must be an integer from 2 through MAX_BASE");
		return base;
	};
	return NumBase;
}();
//#endregion
module.exports = NumBase;

  return module.exports;
}));
