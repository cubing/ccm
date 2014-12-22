Template.mjChester.rendered = function() {
  var template = this;
  template.autorun(function() {
    var data = Template.currentData();
    template.$("div.jChester").jChester({
      solveTime: data.solveTime,
      editableSolveTimeFields: data.editableSolveTimeFields,
    });
  });
};
