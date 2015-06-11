require! <[ gulp gulp-bump ]>

do-bump = (level) ->
  gulp.src './package.json'
    .pipe gulp-bump type: level
    .pipe gulp.dest './'

gulp.task \bump:major      -> do-bump \major
gulp.task \bump:minor      -> do-bump \minor
gulp.task \bump:patch      -> do-bump \patch
gulp.task \bump:prerelease -> do-bump \prerelease

gulp.task \bump <[ bump:patch ]>
