(function (root, factory) {
  if (typeof define === 'function' && (define.amd || define.cmd) ) {
    // for amd & cmd loader
    define(function () {
      return factory(root);
    });
  } else if (typeof exports === 'object') {
    // for Nodejs
    module.exports = factory(root);
  } else {
    root['NumBase'] = factory(root);
  }
}(typeof window !== 'undefined' ? window : this, function (root) {

/**
 * @class convert an integer with any radix(base), represented with any character
*/

var NumBase;

NumBase = (function() {
  var add, divide, isBigNum, isNum, multiply;

  isNum = function(n) {
    return /^-?[\d]+$/.test("" + n);
  };

  isBigNum = function(n) {
    return /e\+/.test(String(n));
  };

  function NumBase(charList) {
    var defaultChartList, k, v, _i, _len;
    defaultChartList = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    charList = (charList || defaultChartList).split('');
    for (k = _i = 0, _len = charList.length; _i < _len; k = ++_i) {
      v = charList[k];
      if (k !== charList.indexOf(v)) {
        throw new TypeError("duplicated character <" + v + "> found");
      }
    }
    this.BASE = charList;
    if (isBigNum(Math.pow(charList.length, 2))) {
      throw new TypeError('the base is super big, consider a small one');
    }
    this.MAX_BASE = this.BASE.length;
  }

  divide = function(n, b) {
    var mod, times;
    times = '';
    mod = '';
    while (n.length) {
      mod += n.substr(0, 1);
      n = n.substr(1);
      mod = +mod;
      times += String(Math.floor(mod / b));
      mod = String(mod % b);
    }
    return {
      times: times.replace(/^0+/, ''),
      mod: mod
    };
  };

  /**
   * encode a number in decimalism
   * @param  {Number|String} n           number to encode, if a big number, pass a string
   * @param  {Number} b=@MAX_BASE        base size
   * @return {String}                    encoded string
  */


  NumBase.prototype.encode = function(n, b) {
    var result, ret, sign;
    if (b == null) {
      b = this.MAX_BASE;
    }
    if (typeof n === 'number' && isBigNum(n)) {
      throw new TypeError('number you wanna encode is super big, conside pass it as a string instead');
    }
    if (!(isNum(n) && isNum(b) && b <= this.MAX_BASE && b > 1)) {
      return n;
    }
    n = String(n);
    sign = '';
    if (n.charAt(0) === '-') {
      sign = '-';
      n = n.substr(1);
    }
    result = '';
    ret = {
      times: n
    };
    while (ret.times) {
      ret = divide(ret.times, b);
      result = this.BASE[+ret.mod] + result;
    }
    return sign + result;
  };

  /**
   * multiply a big number(n) with b (small number)
   * @param  {Number|String} n a number or a big number in string
   * @param  {Number}        b a small number
   * @return {String}
  */


  multiply = function(n, b) {
    var last, res, ret, s;
    ret = '';
    n = String(n).split('');
    last = 0;
    while (s = n.pop()) {
      res = String(s * b + last);
      ret = res.substr(-1) + ret;
      res = res.slice(0, -1);
      last = res ? +res : 0;
    }
    if (last) {
      ret = String(last) + ret;
    }
    return ret;
  };

  /**
   * add two big number
   * @param {Number|String} n
   * @param {Number|String} m
  */


  add = function(n, m) {
    var last, ml, nl, res, ret, _ref;
    ret = '';
    n = String(n).split('');
    m = String(m).split('');
    if (n.length < m.length) {
      _ref = [m, n], n = _ref[0], m = _ref[1];
    }
    last = 0;
    while (nl = n.pop()) {
      ml = m.pop() || 0;
      res = (+nl) + (+ml) + last;
      ret = String(res % 10) + ret;
      last = Math.floor(res / 10);
    }
    if (last) {
      ret = last + ret;
    }
    return ret;
  };

  /**
   * decode a string
   * @param  {String} n           encoded number, should be a string
   * @param  {Number} b=@MAX_BASE base size
   * @return {String}             decoded number
  */


  NumBase.prototype.decode = function(n, b) {
    var i, m, ret, sign;
    if (b == null) {
      b = this.MAX_BASE;
    }
    if (!(isNum(b) && b <= this.MAX_BASE && b > 1)) {
      return n;
    }
    n = ("" + n).split('').reverse();
    sign = '';
    if (n[n.length - 1] === '-') {
      sign = '-';
      n.pop();
    }
    ret = '0';
    while (m = n.pop()) {
      i = this.BASE.indexOf(m);
      if (i === -1) {
        throw new TypeError("unexpected character <" + m + "> found");
      }
      if (i >= b) {
        throw new TypeError("<" + m + "> is out of the base limit");
      }
      ret = add(multiply(ret, b), i);
    }
    return sign + ret;
  };

  return NumBase;

})();

return NumBase;

}));
