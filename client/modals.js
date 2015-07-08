Template.cmSaveButton.helpers({
  btn_success: function(saveable) {
    // treat saveable as true by default (not passed in)
    return (saveable || _.isUndefined(saveable)) ? "btn-success" : "";
  },
  disable: function(saveable) {
    return !(saveable || _.isUndefined(saveable));
  },
});
