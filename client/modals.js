Template.ccmSaveButton.helpers({
  btn_success: function() {
    // Treat saveable as true by default (not passed in).
    return this.saveable || _.isUndefined(this.saveable) ? "btn-success" : "";
  },
  disabled: function() {
    // Treat saveable as true by default (not passed in).
    return !(this.saveable || _.isUndefined(this.saveable));
  },
  text: function() {
    return this.text || "Save";
  },
});
