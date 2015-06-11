require! <[ gulp ../util/browserify ]>

gulp.task \ls:dev (cb) !-> browserify cb, true
gulp.task \ls:prod (cb) !-> browserify cb, false
gulp.task \ls <[ ls:dev ls:prod ]>
