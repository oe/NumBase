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
  var isNum;

  isNum = function(n) {
    return /^-?[\d]+$/.test("" + n);
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
    this.MAX_BASE = this.BASE.length;
  }

  NumBase.prototype.encode = function(n, b) {
    var prefix, res;
    if (b == null) {
      b = this.MAX_BASE;
    }
    if (!(isNum(n) && isNum(b) && b <= this.MAX_BASE && b > 1)) {
      return n;
    }
    prefix = n < 0 ? '-' : '';
    n = Math.abs(n);
    res = [];
    while (true) {
      res.push(this.BASE[n % b]);
      n = Math.floor(n / b);
      if (!n) {
        break;
      }
    }
    return prefix + res.reverse().join('');
  };

  NumBase.prototype.decode = function(n, b) {
    var i, k, len, negtive, num, v, _i, _len;
    if (b == null) {
      b = this.MAX_BASE;
    }
    if (!(isNum(b) && b <= this.MAX_BASE && b > 1)) {
      return n;
    }
    num = 0;
    n = ("" + n).split('');
    if (n[0] === '-') {
      negtive = true;
      n.shift();
    }
    len = n.length;
    for (k = _i = 0, _len = n.length; _i < _len; k = ++_i) {
      v = n[k];
      i = this.BASE.indexOf(v);
      if (i === -1) {
        throw new TypeError("unexpected character <" + v + "> found");
      }
      num += i * Math.pow(b, len - 1 - k);
    }
    if (negtive) {
      num = -num;
    }
    return num;
  };

  return NumBase;

})();

return NumBase;

}));
