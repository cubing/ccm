if(Meteor.isClient) {
  Accounts.ui.config({
    requestPermissions: {
      worldcubeassociation: ['public', 'email', 'dob'],
    },
    passwordSignupFields: 'EMAIL_ONLY',
  });
}

if(Meteor.isServer) {
  // http://docs.meteor.com/#/full/accounts_emailtemplates
  Accounts.emailTemplates.siteName = "live.cubing.net";
  Accounts.emailTemplates.from = "live.cubing.net accounts <no-reply@live.cubing.net>";
  Accounts.emailTemplates.verifyEmail.subject = function(user) {
    return "Welcome to live.cubing.net";
  };
  Accounts.emailTemplates.verifyEmail.text = function(user, url) {
    return "To verify your email, simply click the link below:\n\n" + url;
  };
}

Accounts.config({
  sendVerificationEmail: true,

  // We don't want to let users create accounts, they should be using
  // WCA OAuth instead. (this isn't the best filename for this setting)
  forbidClientAccountCreation: true,
});
