var RE_GRADIENT_STOPS, RE_GRADIENT_VAL, RE_GRADIENT_TYPE, RE_TRANSFORM, RE_FILL_KEYWORD, DIRECTIONS, normalize, normalizeGradient, contains, before, after, plugin, slice$ = [].slice;
RE_GRADIENT_STOPS = /([\(\,]\s*)(-?(?:\d*\.)?\d+(?:%|px|em))(\s+)((hsl|rgb)a?\([^\)]+\)|#[^\)\,]+)/g;
RE_GRADIENT_VAL = /(\(\s*)(?:(-?(\d*\.)?\d+)deg|((to )?(top|bottom|left|right)( (top|bottom|left|right))?))/g;
RE_GRADIENT_TYPE = /((repeating-)?(linear|radial)-gradient\()/g;
RE_TRANSFORM = /\b(transform)\b/g;
RE_FILL_KEYWORD = /\s*\b(fill)\b\s*/g;
DIRECTIONS = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left'
};
normalize = function(property, value, prefix){
  var result;
  result = value.toString();
  if (~result.indexOf('gradient(')) {
    result = result.replace(RE_GRADIENT_STOPS, '$1$4$3$2');
    result = result.replace(RE_GRADIENT_VAL, function(){
      return normalizeGradient(slice$.call(arguments, 1), prefix);
    });
    if (prefix) {
      result = result.replace(RE_GRADIENT_TYPE, "-" + prefix + "-$1");
    }
  }
  if (prefix && (property === '\'transition\'' || property === '\'transition-property\'')) {
    result = result.replace(RE_TRANSFORM, "-" + prefix + "-$1");
  }
  if (prefix && (property === '\'border-image\'' || property === '\'border-image-slice\'')) {
    result = result.replace(RE_FILL_KEYWORD, ' ');
  }
  return result;
};
normalizeGradient = function(parts, prefix){
  var value;
  value = parts[0];
  if (parts[1]) {
    value += (prefix
      ? parseFloat((Math.abs(450 - parts[1]) % 360).toFixed(3))
      : parts[1]) + 'deg';
  }
  if (prefix && parts[4]) {
    if (parts[5]) {
      value += DIRECTIONS[parts[5]];
    }
    if (parts[6]) {
      value += " " + DIRECTIONS[parts[7]];
    }
  } else if (!prefix && !parts[4]) {
    if (parts[5]) {
      value += "to " + DIRECTIONS[parts[5]];
    }
    if (parts[6]) {
      value += " " + DIRECTIONS[parts[7]];
    }
  } else {
    if (parts[3]) {
      value += parts[3];
    }
  }
  return value;
};
contains = function(haystack, needle){
  return !!~haystack.string.indexOf(needle.string);
};
before = function(haystack, needle){
  var index;
  index = haystack.string.indexOf(needle.string);
  return haystack.string.substr(0, index);
};
after = function(haystack, needle){
  var index;
  index = haystack.string.lastIndexOf(needle.string);
  return haystack.string.substr(index + 1);
};
plugin = function(){
  return function(style){
    var nodes;
    nodes = this.nodes;
    style.define('normalize', function(property, value, prefix){
      return new nodes.Ident(normalize(property, value, prefix));
    });
    style.define('contains', function(haystack, needle){
      return new nodes.Boolean(contains(haystack, needle));
    });
    style.define('before', function(haystack, needle){
      return new nodes.String(before(haystack, needle));
    });
    style.define('after', function(haystack, needle){
      return new nodes.String(after(haystack, needle));
    });
  };
};
module.exports = plugin;