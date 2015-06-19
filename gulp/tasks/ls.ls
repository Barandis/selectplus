require! <[
  gulp
  gulp-livescript
  gulp-uglify
  gulp-sourcemaps
  gulp-rename

  ../config.ls
  ../util/handler.ls
]>

gulp.task \ls:dev ->
  gulp.src "#{config.src.ls}/**/*.ls"
    .pipe gulp-sourcemaps.init!
    .pipe gulp-livescript config.ls.dev
    .on \error handler
    .pipe gulp-sourcemaps.write!
    .pipe gulp.dest config.dest.js

gulp.task \ls:prod ->
  gulp.src "#{config.src.ls}/**/*.ls"
    .pipe gulp-livescript config.ls.prod
    .on \error handler
    .pipe gulp-uglify config.uglify
    .pipe gulp-rename extname: '.min.js'
    .pipe gulp.dest config.dest.js

gulp.task \ls <[ ls:dev ls:prod ]>
