// Workaround for https://github.com/jfly/ccm/issues/148

assert = function(condition, msg) {
  if(!condition) {
    var message = "Assertion error";
    if(msg) {
      message += ": " + msg;
    }
    throw new Error(message);
  }
};

assert.equal = function(expected, actual) {
  assert(expected == actual, "expected " + expected + " to equal " + actual);
};
