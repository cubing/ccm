// Monkey patching a lame version of lodash's _.get method.
_.get = function(object, path) {
  path.split(".").forEach(part => {
    object = object[part];
  });
  return object;
}
