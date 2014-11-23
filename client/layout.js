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
});

var verificationSendSuccessReact = new ReactiveVar(null);

Template.layout.helpers({
  verificationSendSuccess: function() {
    return verificationSendSuccessReact.get();
  }
});

Template._loginButtonsLoggedInDropdown.events({
  'click #login-buttons-edit-profile': function(e) {
    Router.go('editProfile');
  },
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
