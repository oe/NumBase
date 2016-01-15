# NumBase
Convert an integer with any base(radix), represented with any character

**You can conver a big number! Yeah, can be super big!**

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
npm install numbase
```

then require it:

```js
var Numbase = require('numbase');
```


### for browsers
You can include the script with `script` tag, or with amd/cmd(such as requirejs, commonjs ) loaders

### examples

```js
// Setup an instance with default base string
var base = new NumBase();
// encode a super big number(you must pass it as a string) with default radix 62
base.encode('9999999999999999999999999999999999999999999999999999999999999999');
// returns 'isFUl3RMFVGKeLAbPmHOAA86LLjpGwei1jXh'
// then decode it with default radix 62
base.decode('isFUl3RMFVGKeLAbPmHOAA86LLjpGwei1jXh');
// returns '9999999999999999999999999999999999999999999999999999999999999999'



// Setup an instance with custom base string
base = new NumBase('中国上海市徐汇区');
// Encode an integer, use default radix 8
base.encode(19901230); // returns '国国海区上徐市徐汇'
// Decode a string, with default radix 8
base.decode('国国海区上徐市徐汇'); // returns 19901230

// Encode an integer, with radix 7
base.encode(19901230, 7); // returns '海海国国中徐中海汇'
// Decode a string, with radix 7
base.decode('海海国国中徐中海汇', 7); // returns 19901230



// And there is some thing else!
// setup an instance with common letters used in articles
base = new NumBase('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ?_+= %&*()#@!$\',;.');
// then encode your words(like lover letters), encode it into numbers!
// you should use decode to encode your words, strange?
base.decode('The furthest distance in the world, is not between life and death. But when I stand in front of you,Yet you don\'t know that I love you!');
// returns '57031381561275606392394756616992749156901193715383571159265195685821406415964188213571176381421833854362042612855929981904540567614578869806954870724353288627661399322034962143689960167076321231141725990698446223883841721866243690267975268687767453140124074'
// and when decode the numbers, people will see the truth
// use encode to decode numbers to words
base.encode('57031381561275606392394756616992749156901193715383571159265195685821406415964188213571176381421833854362042612855929981904540567614578869806954870724353288627661399322034962143689960167076321231141725990698446223883841721866243690267975268687767453140124074');
// returns "The furthest distance in the world, is not between life and death. But when I stand in front of you,Yet you don't know that I love you!"
```