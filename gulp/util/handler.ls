require! <[ gulp-notify ]>

module.exports = (...args) !->
  gulp-notify.on-error title: 'Compile Error', message: '<%= error %>' .apply this, args
  @emit \end
