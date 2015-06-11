require! <[ gulp del ../config ]>

gulp.task \clean:js (cb) !-> del [ "#{config.dest.js}/**" ], cb
gulp.task \clean:css (cb) !-> del [ "#{config.dest.css}/**" ], cb
gulp.task \clean <[ clean:js clean:css ]>
