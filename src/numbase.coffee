###*
 * @class convert an integer with any radix(base), represented with any character
###

class NumBase
  isNum = (n)->
    /^-?[\d]+$/.test "#{n}"

  constructor: (charList) ->
    defaultChartList = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    charList = (charList or defaultChartList).split('')
    for v, k in charList
      if k isnt charList.indexOf v
        throw new TypeError "duplicated character <#{v}> found"
    @BASE = charList
    @MAX_BASE = @BASE.length


  encode: (n, b=@MAX_BASE) ->
    return n unless isNum(n) and isNum(b) and b <= @MAX_BASE and b > 1
    # for negtive number
    prefix = if n < 0 then '-' else ''
    n = Math.abs n
    res = []
    loop
      res.push @BASE[n % b]
      n = Math.floor n / b
      break unless n
    prefix + res.reverse().join('')

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

