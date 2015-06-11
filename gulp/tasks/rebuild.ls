require! <[ gulp run-sequence ]>

gulp.task \rebuild (cb) !-> run-sequence \clean, \build, cb
