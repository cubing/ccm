// Dirty, probably broken workaround for
//  https://github.com/EventedMind/iron-router/issues/1088#issuecomment-67787532
// This doesn't handle the %%20 case. OH WELL.
var oldResolve = Iron.Url.prototype.resolve;
Iron.Url.prototype.resolve = function() {
  var resolved = oldResolve.apply(this, arguments);
  if(resolved) {
    resolved = resolved.replace("%20", "+");
  }
  return resolved;
};
