// Copied from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
RegExp.escape = function(string) {
  return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
};

String.isNonNegInt = function(s) {
  return !!s.match(/^\d+$/);
};
