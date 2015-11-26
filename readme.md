# NumBase
Convert an integer with any base(radix), represented with any character


## Methods

```js
// constructor, by default base string will be all alphanumerics (base62)
NumBase(baseString='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
// encode, default base will be the baseString's length
NumBase::encode(number, base=baseString.length);
// decode, default base will be the baseString's length
NumBase::decode(encodedNumber, base=baseString.length);
```

## Usage

## for nodejs
install it with npm:

```
npm install Numbase
```

then require it:

```js
var Numbase = require('NumBase');
```


### for browsers
You can include the script with `script` tag, or with amd/cmd(such as requirejs, commonjs ) loaders

### examples

```js
// The base string.
var baseString = '中国上海市徐汇区';
// Setup the NumBase instance
base = new NumBase(baseString);
// Encode an integer, use default base 8
base.encode(19901230); // returns '国国海区上徐市徐汇'
// Decode a string, with default base 8
base.decode('国国海区上徐市徐汇'); // returns 19901230

// Encode an integer, with base 7
base.encode(19901230, 7); // returns '海海国国中徐中海汇'
// Decode a string, with base 7
base.decode('海海国国中徐中海汇', 7); // returns 19901230
```