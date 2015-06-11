require! <[
  gulp
  gulp-if
  gulp-uglify
  gulp-rename

  browserify
  through2

  ../config
  ./logger
  ./handler
]>

module.exports = (callback, dev) !->
  queue = config.ls.bundles.length

  do-browserify = (cfg) ->
    cfg.debug = true if dev
    output = cfg.output[if dev then \dev else \prod]

    browserified = through2.obj (file, enc, next) !->
      browserify file.path
        .transform \lsify
        .bundle (err, res) !->
          file.contents = res
          next null, file

    finish = !->
      logger.end output
      callback! if queue and (--queue is 0)

    bundle = ->
      logger.start output
      gulp.src cfg.src
        .pipe browserified
        .on \error handler
        .pipe gulp-if (not dev), gulp-uglify config.uglify
        .pipe gulp-rename output
        .pipe gulp.dest cfg.dest
        .on \end finish

    b.require cfg.require if cfg.require
    b.external cfg.external if cfg.external

    bundle!

  config.ls.bundles.for-each do-browserify
