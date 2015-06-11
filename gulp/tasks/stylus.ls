require! <[ gulp ../util/stylus ]>

gulp.task \stylus:dev (cb) !-> stylus cb, true
gulp.task \stylus:prod (cb) !-> stylus cb, false
gulp.task \stylus <[ stylus:dev stylus:prod ]>
