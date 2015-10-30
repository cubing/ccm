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

// Bootstrap modals have to do some magic to prevent page shifting
// when the scrollbar comes and goes. This is implemented by setting a padding-right
// on the document body. Unfortunately, this doesn't affect our elements with css
// position fixed. Here we hook into the setScrollbar and update the css right
// of our fixed elements.
// Modifed from https://github.com/twbs/bootstrap/blob/f5bb168a79d7a218484d7a5d2cdbdc57cc14ba66/js/modal.js#L267-L271
let oldSetScrollbar = $.fn.modal.Constructor.prototype.setScrollbar;
$.fn.modal.Constructor.prototype.setScrollbar = function() {
  oldSetScrollbar.apply(this, arguments);

  let $extraButtons = $('.extraButtons');
  this.originalExtraButtonsPadding = $extraButtons.css('right');
  if(this.bodyIsOverflowing) {
    $('.extraButtons').css('right', parseInt((this.originalExtraButtonsPadding || 0), 10) + this.scrollbarWidth);
  }
};

let oldResetScrollbar = $.fn.modal.Constructor.prototype.resetScrollbar;
$.fn.modal.Constructor.prototype.resetScrollbar = function() {
  oldResetScrollbar.apply(this, arguments);

  $('.extraButtons').css('right', this.originalExtraButtonsPadding);
};
