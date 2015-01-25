assert = function(condition) {
  if(!condition) {
    throw new Meteor.Error(500);//<<<
  }
};

assert.equal = function(expected, actual) {
  assert(expected == actual);//<<<
};
