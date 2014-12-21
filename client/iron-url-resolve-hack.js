// Dirty, probably broken workaround for
//  https://github.com/EventedMind/iron-router/issues/1088#issuecomment-67787532
var oldResolve = Iron.Url.prototype.resolve;
Iron.Url.prototype.resolve = function() {
  var resolved = oldResolve.apply(this, arguments);
  if(resolved) {
    // Note that we're careful to *not* replace %%20 with %+
    resolved = resolved.replace(/([^%])%20/g, "$1+");
  }
  return resolved;
};
