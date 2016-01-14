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
    if isBigNum charList.length
      throw new TypeError 'the base is super big, consider a small one'
    @MAX_BASE = @BASE.length

  # divide a any number(including big number) with b
  divide = (n, b)->
    times = ''
    mod = ''
    while n.length
      while n.length and +mod < b
        mod += n.substr 0, 1
        n = n.substr 1
      mod = +mod
      times += String Math.floor mod / b
      mod = String mod % b

    return {
      times: times
      mod: mod
    }

  ###*
   * encode a number
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
    result = ''
    if n.charAt(0) is '-'
      sign = '-'
      n = n.substr 1

    ret = times: n
    while ret.times isnt '0'
      ret = divide ret.times, b
      result = @BASE[ +ret.mod ] + result
    
    sign + result
    

  decode: (n, b=@MAX_BASE)->
    return n unless isNum(b) and b <= @MAX_BASE and b > 1
    num = 0
    n = "#{n}".split ''
    # for negtive number
    if n[0] is '-'
      negtive = true
      n.shift()

    len = n.length
    for v, k in n
      i = @BASE.indexOf v
      if i is -1
        throw new TypeError "unexpected character <#{v}> found"
      num += i * Math.pow b, len - 1 - k
    num = -num if negtive
    num

