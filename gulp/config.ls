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
      linenos: yes
    prod:
      compress: yes
      linenos: no
    bundles:
      * src: "#{src.stylus}/main.styl"
        dest: dest.css
        output:
          dev: \selectplus.css
          prod: \selectplus.min.css
      ...

  ls =
    dev:
      bare: yes
    prod:
      bare: yes
    bundles:
      * src: "#{src.ls}/main.ls"
        dest: dest.js
        output:
          dev: \selectplus.js
          prod: \selectplus.min.js
      ...

  uglify = {}
  minify-css = {}
  concat-css =
    rebase-urls: no
