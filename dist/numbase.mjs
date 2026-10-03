/*! numbase v0.1.2 | MIT | Saiya */
//#region src/numbase.ts
/** Convert decimal integers and strings in a custom radix without Number rounding. */
var DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function hasStandardDigits(alphabet, radix) {
	for (var i = 0; i < radix; i++) if (alphabet[i] !== DEFAULT_ALPHABET.charAt(i)) return false;
	return true;
}
function isInteger(value) {
	return /^-?\d+$/.test("" + value);
}
function isExponential(value) {
	return /e\+/.test(String(value));
}
function divide(decimal, radix) {
	var quotient = [];
	var remainder = 0;
	for (var i = 0; i < decimal.length; i++) {
		var character = decimal.charAt(i);
		var value = character >= "0" && character <= "9" ? remainder * 10 + Number(character) : Number(String(remainder) + character);
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
function isUnicodeSymbol(symbol) {
	var first = symbol.charCodeAt(0);
	if (symbol.length === 1) return first < 55296 || first > 57343;
	var second = symbol.charCodeAt(1);
	return symbol.length === 2 && first >= 55296 && first <= 56319 && second >= 56320 && second <= 57343;
}
var NumBase = function() {
	function NumBase(charList, options) {
		if (options !== void 0) {
			if (options === null || typeof options !== "object") throw new TypeError("options must be an object");
			if (options.unicode !== void 0 && typeof options.unicode !== "boolean") throw new TypeError("unicode must be a boolean");
		}
		Object.defineProperties(this, {
			unicode: { value: (options === null || options === void 0 ? void 0 : options.unicode) === true },
			validatedAlphabet: {
				value: [],
				writable: true
			}
		});
		var characters = charList || DEFAULT_ALPHABET;
		if (this.unicode && typeof characters !== "string") throw new TypeError("Unicode alphabet must be a string");
		var alphabet = this.unicode ? unicodeSymbols(characters) : characters.split("");
		var seen = Object.create(null);
		for (var i = 0; i < alphabet.length; i++) {
			var symbol = alphabet[i];
			if (seen[symbol]) throw new TypeError("duplicated character <" + symbol + "> found");
			seen[symbol] = true;
		}
		this.BASE = alphabet;
		if (isExponential(Math.pow(alphabet.length, 2))) throw new TypeError("the base is super big, consider a small one");
		this.MAX_BASE = alphabet.length;
	}
	NumBase.prototype.encode = function(number, radix) {
		if (radix == null) radix = this.MAX_BASE;
		if (typeof number === "number" && isExponential(number)) throw new TypeError("number you wanna encode is super big, conside pass it as a string instead");
		if (!(isInteger(number) && isInteger(radix) && +radix <= this.MAX_BASE && +radix > 1)) return number;
		var base = +radix;
		var decimal = String(number);
		var sign = "";
		if (decimal.charAt(0) === "-") {
			sign = "-";
			decimal = decimal.slice(1);
		}
		var result = [];
		if (decimal.length <= 15 && !/[^0-9]/.test(decimal)) {
			var value = Number(decimal);
			do {
				result.push(this.BASE[value % base] + "");
				value = Math.floor(value / base);
			} while (value);
			return sign + result.reverse().join("");
		}
		if (typeof BigInt === "function" && base <= 4294967295 && !/[^0-9]/.test(decimal)) {
			var value = BigInt(decimal);
			if (base <= 36 && hasStandardDigits(this.BASE, base)) return sign + value.toString(base);
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
	NumBase.prototype.decode = function(encoded, radix) {
		if (radix == null) radix = this.MAX_BASE;
		if (!(isInteger(radix) && +radix <= this.MAX_BASE && +radix > 1)) return encoded;
		var base = +radix;
		var input = "" + encoded;
		var sign = "";
		if (input.charAt(0) === "-") {
			sign = "-";
			input = input.slice(1);
		}
		var symbols = this.unicode ? unicodeSymbols(input) : input;
		var indexes;
		if (symbols.length >= 32) {
			var lookup = Object.create(null);
			indexes = lookup;
			for (var i = 0; i < this.BASE.length; i++) {
				var symbol = this.BASE[i];
				if (typeof symbol === "string" && (symbol.length === 1 || this.unicode) && lookup[symbol] === void 0) lookup[symbol] = i;
			}
		}
		var bigRadix = typeof BigInt === "function" && base <= 4294967295 ? BigInt(base) : void 0;
		var integer = 0;
		var large;
		var result = "0";
		for (var j = 0; j < symbols.length; j++) {
			var character = symbols[j];
			var digit = indexes ? indexes[character] : this.BASE.indexOf(character);
			if (digit === void 0 || digit === -1) throw new TypeError("unexpected character <" + character + "> found");
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
	/** Encode exact integer input, rejecting unsafe numbers and invalid configuration. */
	NumBase.prototype.encodeStrict = function(value, radix) {
		var base = this.strictRadix(radix);
		if (typeof value === "number") {
			if (Math.floor(value) !== value || Math.abs(value) > 9007199254740991) throw new TypeError("encodeStrict requires a safe integer Number; use a decimal string or bigint");
		} else if (typeof value === "string") {
			var match = /^-?[0-9]+$/.exec(value);
			if (!match || match[0] !== value) throw new TypeError("encodeStrict requires a decimal integer string");
		} else if (typeof value !== "bigint") throw new TypeError("encodeStrict requires a decimal string, safe integer Number, or bigint");
		return this.encode(String(value), base);
	};
	/** Decode nonempty digits with strict radix and alphabet validation. */
	NumBase.prototype.decodeStrict = function(value, radix) {
		var base = this.strictRadix(radix);
		if (typeof value !== "string" || !value.length || value === "-") throw new TypeError("decodeStrict requires a nonempty encoded integer");
		return this.decode(value, base);
	};
	/** Convert between alphabets using exact decimal strings and strict validation. */
	NumBase.prototype.convert = function(value, target, options) {
		if (!target || typeof target.encodeStrict !== "function") throw new TypeError("conversion target must provide encodeStrict");
		if (options !== void 0 && (options === null || typeof options !== "object")) throw new TypeError("options must be an object");
		return target.encodeStrict(this.decodeStrict(value, options === null || options === void 0 ? void 0 : options.sourceRadix), options === null || options === void 0 ? void 0 : options.targetRadix);
	};
	NumBase.prototype.strictRadix = function(radix) {
		if (!Array.isArray(this.BASE) || this.BASE.length < 2) throw new TypeError("strict conversion requires at least two alphabet symbols");
		var unchanged = this.BASE.length === this.validatedAlphabet.length;
		for (var i = 0; unchanged && i < this.BASE.length; i++) unchanged = this.BASE[i] === this.validatedAlphabet[i];
		if (!unchanged) {
			var seen = Object.create(null);
			for (var _i = 0, _a = this.BASE; _i < _a.length; _i++) {
				var symbol = _a[_i];
				if (typeof symbol !== "string" || (this.unicode ? !isUnicodeSymbol(symbol) : symbol.length !== 1)) throw new TypeError("alphabet entries must each contain one symbol");
				if (symbol === "-") throw new TypeError("alphabet must not contain the negative sign");
				if (seen[symbol]) throw new TypeError("alphabet symbols must be unique");
				seen[symbol] = true;
			}
			this.validatedAlphabet = this.BASE.slice();
		}
		var base = radix === void 0 ? this.MAX_BASE : radix;
		if (typeof this.MAX_BASE !== "number" || Math.floor(this.MAX_BASE) !== this.MAX_BASE || this.MAX_BASE < 2 || this.MAX_BASE > this.BASE.length) throw new RangeError("MAX_BASE must be an integer within the alphabet");
		if (typeof base !== "number" || Math.floor(base) !== base || base < 2 || base > this.MAX_BASE) throw new RangeError("radix must be an integer from 2 through MAX_BASE");
		return base;
	};
	return NumBase;
}();
//#endregion
export { NumBase as default };
