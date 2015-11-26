module.exports = (grunt)->
  # 发布目录地址
  DIST_PATH = 'dist'


  pkg = grunt.file.readJSON 'package.json'

  # 增加版本号
  increaseVersion = (pkg)->
    version = pkg.version
    max = 800
    vs = version.split('.').map (i)-> +i
    len = vs.length
    while len--
      break if (++vs[ len ]) < max
      vs[ len ] = 0
    pkg.version = vs.join '.'

  increaseVersion pkg

  grunt.initConfig
    pkg: pkg
    # 清理文件夹
    clean:
      options:
        # 强制清理
        force: true
      main: DIST_PATH

    
    
    # 编译coffee
    coffee:
      main:
        options:
          bare: true
          sourceMap: false
        src: 'src/numbase.coffee'
        dest: DIST_PATH + '/numbase.js'

    # umd包装
    umd:
      main:
        template: 'umd-template.hbs'
        src: DIST_PATH + '/numbase.js'
        dest: DIST_PATH + '/numbase.js'
        # 要导出的变量
        objectToExport: 'NumBase'
    # 压缩JS代码
    uglify:
      options:
        banner: '/*!\n'+
          ' * <%= pkg.name %> v<%= pkg.version %>\n' +
          ' * Author <%= pkg.author.developer %>\n' +
          ' * Copyright© <%= (new Date).getFullYear() %> <%= pkg.author.company %>\n' +
          ' */\n'
      min:
        options:
          sourceMap: false
          sourceMapIn: DIST_PATH + '/numbase.js.map'
        src: DIST_PATH + '/numbase.js'
        dest: DIST_PATH + '/numbase.min.js'

  grunt.loadNpmTasks 'grunt-umd'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-clean'

  # 更新package.json 用于保存新版本
  grunt.registerTask 'update-pkg-file', ->
    grunt.file.write 'package.json', JSON.stringify(pkg, null, 2), 'utf8'
    return

  grunt.registerTask 'default', [
    'clean'
    'coffee'
    'umd'
    'uglify'
    'update-pkg-file'
  ]
