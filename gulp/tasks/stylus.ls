require! <[ 
  gulp
  gulp-stylus
  gulp-minify-css
  gulp-sourcemaps
  gulp-rename

  ../config.ls
  ../util/handler.ls
]>

gulp.task \stylus:dev ->
  gulp.src "#{config.src.stylus}/*.styl"
    .pipe gulp-sourcemaps.init!
    .pipe gulp-stylus config.stylus.dev
    .on \error handler
    .pipe gulp-sourcemaps.write!
    .pipe gulp.dest config.dest.css

gulp.task \stylus:prod ->
  gulp.src "#{config.src.stylus}/*.styl"
    .pipe gulp-stylus config.stylus.prod
    .on \error handler
    .pipe gulp-minify-css config.minify-css
    .pipe gulp-rename extname: '.min.css'
    .pipe gulp.dest config.dest.css

gulp.task \stylus <[ stylus:dev stylus:prod ]>
