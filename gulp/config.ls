export

  src =
    ls: './src/ls'
    stylus: './src/stylus'

  dest =
    js: './lib/js'
    css: './lib/css'

  stylus =
    dev:
      compress: no
      linenos: no
    prod:
      compress: yes
      linenos: no

  ls =
    dev:
      bare: yes
    prod:
      bare: yes

  uglify = {}
  minify-css = {}
