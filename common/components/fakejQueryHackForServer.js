if(Meteor.isServer) {
  if(typeof jQuery === 'undefined') {
    jQuery = {};
  }
  if(typeof $ === 'undefined') {
    $ = jQuery;
  }

  jQuery.fn = {};
  jQuery.extend = function() {
    var target, objects;
    if(arguments.length === 1) {
      target = jQuery;
      objects = arguments;
    } else {
      target = arguments[0];
      objects = Array.prototype.slice.call(arguments, 1);
    }
    for(var i = 0; i < objects.length; i++) {
      var object = objects[i];
      Object.keys(object).forEach(function(key) {
        target[key] = object[key];
      });
    }
    return target;
  };
}
