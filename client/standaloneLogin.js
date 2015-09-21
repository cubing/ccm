Template.standaloneLogin.events({
  'click #login-with-redirect': function() {
    Meteor.loginWithWorldcubeassociation({ loginStyle: "redirect" });
  },
});

Template.standaloneLogin.rendered = function() {
  var template = this;
  template.autorun(function() {
    if(Meteor.userId() && typeof(AndroidFunction) !== "undefined") {
      AndroidFunction.jsSetToken(Accounts._storedLoginToken());
    }
  });
  // Dirty hack to style things differently on this page.
  $('html').attr('data-mobile-login', 'true');
};
