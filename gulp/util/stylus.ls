require! <[
  gulp
  gulp-if
  gulp-rename
  gulp-stylus
  gulp-concat-css
  gulp-minify-css

  ../config
  ./logger
  ./handler
]>

module.exports = (callback, dev) !->
  queue = config.stylus.bundles.length

  do-stylus = (cfg) ->
    output = cfg.output[if dev then \dev else \prod]

    finish = !->
      logger.end output
      callback! if queue and (--queue is 0)

    bundle = ->
      logger.start output
      gulp.src cfg.src
        .on \error handler
        .pipe gulp-stylus config.stylus[ if dev then \dev else \prod ]
        .pipe gulp-rename extname: '.css'
        .pipe gulp-concat-css output, config.concat-css
        .pipe gulp-if (not dev), gulp-minify-css config.minify-css
        .pipe gulp.dest cfg.dest
        .on \end finish

    bundle!

  config.stylus.bundles.for-each do-stylus
