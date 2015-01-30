Template.layout.events({
  "mouseover [data-toggle='tooltip']": function(e) {
    // Bootstrap's tooltips are opt in. Here we lazily enable it on all
    // elements with a data-toggle="tooltip" attribute.
    var $target = $(e.currentTarget);
    if(!$target.data("tooltip-applied")) {
      $target.tooltip('show');
      $target.data("tooltip-applied", "true");

      // When this DOM element is removed, we must remove the corresponding
      // tooltip element.
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if(!document.body.contains($target[0])) {
            // $target has been removed from the DOM
            var tipId = $target.attr('aria-describedby');
            var $tip = $('#' + tipId).remove();
            observer.disconnect();
          }
        });
      });
      observer.observe($target.parent()[0], { childList: true });
    }
  },
  'mouseover [data-toggle="popover"]': function(e) {
    var $target = $(e.currentTarget);
    if(!$target.data("popover-applied")) {
      $target.popover();
      $target.data("popover-applied", "true");
      // NOTE: we're not currently handling the case where a popup is showing
      // as the DOM element that triggered it goes away, as we are handling
      // for tooltips above.
    }
  },
  'shown.bs.modal .modal': function(e, template) {
    template.$('input[autofocus]').focus();
  }
});

Router.onBeforeAction(function() {
  // Workaround for https://github.com/EventedMind/iron-router/issues/96.
  $(window).scrollTop(0);

  // As the page changes, remove any leftover tooltips that might get
  // abandoned because they were set to data-container="body"
  $('.tooltip').remove();
  this.next();
});

var verificationSendSuccessReact = new ReactiveVar(null);

Template.layout.helpers({
  verificationSendSuccess: function() {
    return verificationSendSuccessReact.get();
  },
});

Template._loginButtonsLoggedInDropdown.events({
  'click #login-buttons-resend-emailverification': function(e) {
    verificationSendSuccessReact.set(false);
    Meteor.call('requestVerificationEmail', function(error, value) {
      verificationSendSuccessReact.set(!error);
      $('#modal-verificationsent').modal('show');
      if(error) {
        throw error;
      }
    });
  },
});

// Adopted from http://stackoverflow.com/a/21778615
$.fn.scrollToCenter = function(speed) {
  speed = speed || 200;
  var el = this;
  var elOffset = el.offset().top;
  var elHeight = el.height();
  var windowHeight = $(window).height();
  var offset;

  if(elHeight < windowHeight) {
    offset = elOffset - ((windowHeight / 2) - (elHeight / 2));
  } else {
    offset = elOffset;
  }
  $('html, body').animate({ scrollTop: offset }, speed);
};
