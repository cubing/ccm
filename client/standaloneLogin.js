Template.standaloneLogin.events({
});

Template.standaloneLogin.rendered = function() {
  var template = this;
  template.autorun(function() {
    if(Meteor.userId() && typeof(AndroidFunction) !== "undefined") {
      AndroidFunction.jsSetToken(Accounts._storedLoginToken());
    }
  });
};
