Template.standaloneLogin.events({
  'click #login-with-redirect': function() {
    Meteor.loginWithWorldcubeassociation({ loginStyle: "redirect" }, function(error) {
      console.error(error);
    });
  },
});

Template.standaloneLogin.rendered = function() {
  let template = this;
  template.autorun(function() {
    if(Meteor.userId() && typeof(AndroidFunction) !== "undefined") {
      AndroidFunction.jsSetToken(Accounts._storedLoginToken());
    }
  });
  // Dirty hack to style things differently on this page.
  $('html').attr('data-mobile-login', 'true');
};
