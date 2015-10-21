Template.mjChester.rendered = function() {
  let template = this;
  template.autorun(function() {
    let data = Template.currentData();
    template.$("div.jChester").jChester({
      solveTime: data.solveTime,
      editableSolveTimeFields: data.editableSolveTimeFields,
    });
  });
};
