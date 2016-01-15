###*
 * @class convert an integer with any radix(base), represented with any character
###

class NumBase
  
  isNum = (n)->
    /^-?[\d]+$/.test "#{n}"

  # a big number to string will get a string 1e+29
  isBigNum = (n)->
    /e\+/.test String n

  constructor: (charList) ->
    defaultChartList = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    charList = (charList or defaultChartList).split('')
    for v, k in charList
      if k isnt charList.indexOf v
        throw new TypeError "duplicated character <#{v}> found"
    @BASE = charList
    # if the square of charList.length is a big number
    # then it can be impossible to decode a number with that big base
    if isBigNum Math.pow charList.length, 2
      throw new TypeError 'the base is super big, consider a small one'
    @MAX_BASE = @BASE.length

  # divide a any number(including big number) with b(small number)
  divide = (n, b)->
    times = ''
    mod = ''
    while n.length
      mod += n.substr 0, 1
      n = n.substr 1
      mod = +mod
      times += String Math.floor mod / b
      mod = String mod % b

    return {
      times: times.replace /^0+/, ''
      mod: mod
    }

  ###*
   * encode a number in decimalism
   * @param  {Number|String} n           number to encode, if a big number, pass a string
   * @param  {Number} b=@MAX_BASE        base size
   * @return {String}                    encoded string
  ###
  encode: (n, b=@MAX_BASE) ->
    if typeof n is 'number' and isBigNum n
      throw new TypeError 'number you wanna encode is super big, conside pass it as a string instead'
    return n unless isNum(n) and isNum(b) and b <= @MAX_BASE and b > 1

    n = String n
    sign = ''
    if n.charAt(0) is '-'
      sign = '-'
      n = n.substr 1

    result = ''
    ret = times: n
    while ret.times
      ret = divide ret.times, b
      result = @BASE[ +ret.mod ] + result
    
    sign + result
  
  ###*
   * multiply a big number(n) with b (small number)
   * @param  {Number|String} n a number or a big number in string
   * @param  {Number}        b a small number
   * @return {String}
  ###
  multiply = (n, b)->
    ret = ''
    n = String(n).split ''
    last = 0
    while s = n.pop()
      res = String(s * b + last)
      ret = res.substr(-1) + ret
      res = res.slice 0, -1
      last = if res then +res else 0
    if last
      ret = String(last) + ret
    ret

  ###*
   * add two big number
   * @param {Number|String} n
   * @param {Number|String} m
  ###
  add = (n, m)->
    ret = ''
    n = String(n).split ''
    m = String(m).split ''
    if n.length < m.length
      [n, m] = [m, n]

    last = 0
    while nl = n.pop()
      ml = m.pop() or 0
      res = (+nl) + (+ml) + last
      ret = String(res % 10) + ret
      last = Math.floor res / 10
    if last
      ret = last + ret
    ret

  ###*
   * decode a string
   * @param  {String} n           encoded number, should be a string
   * @param  {Number} b=@MAX_BASE base size
   * @return {String}             decoded number
  ###
  decode: (n, b=@MAX_BASE)->
    return n unless isNum(b) and b <= @MAX_BASE and b > 1

    n = "#{n}".split('').reverse()
    sign = ''
    # for negtive number
    if n[n.length - 1] is '-'
      sign = '-'
      n.pop()

    ret = '0'
    while m = n.pop()
      i = @BASE.indexOf m
      if i is -1
        throw new TypeError "unexpected character <#{m}> found"
      if i >= b
        throw new TypeError "<#{m}> is out of the base limit"

      ret = add multiply(ret, b), i

    sign + ret

