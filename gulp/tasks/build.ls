require! <[ gulp run-sequence ]>

gulp.task \build:dev <[ ls:dev stylus:dev ]>
gulp.task \build:prod (cb) -> run-sequence  <[ ls:prod stylus:prod ]>, \bump, cb
gulp.task \build <[ build:dev build:prod ]>
