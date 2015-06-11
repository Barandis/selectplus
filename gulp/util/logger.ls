require! {
  'gulp-util': gutil
  'pretty-hrtime': pretty
}

var start

export
  
  start = (path) !->
    start := process.hrtime!
    gutil.log "Compiling #{gutil.colors.green path}..."

  end = (path) !->
    time = process.hrtime start
    gutil.log "Compiled #{gutil.colors.green path} in #{gutil.colors.magenta pretty time}"
