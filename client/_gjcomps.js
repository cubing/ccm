Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});

Meteor.startup(function(){
  Session.set("visibleModal", null);
});
