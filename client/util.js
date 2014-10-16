Template.registerHelper("Titlecase", function(str) {
  // Copied from http://stackoverflow.com/a/5574446
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
});
