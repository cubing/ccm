if(Meteor.isClient) {
  Accounts.ui.config({
    passwordSignupFields: 'EMAIL_ONLY',
  });
}

if(Meteor.isServer) {
  var MANDRILL_USERNAME = process.env.MANDRILL_USERNAME;
  var MANDRILL_APIKEY = process.env.MANDRILL_APIKEY;
  if(!MANDRILL_USERNAME || !MANDRILL_APIKEY) {
    console.warn("Could not find either MANDRILL_USERNAME or MANDRILL_APIKEY" +
                 " environment variables. Emailing is disabled");
  } else {
    Meteor.startup(function() {
      Meteor.Mandrill.config({
        username: MANDRILL_USERNAME,
        key: MANDRILL_APIKEY,
      });

      // nasty hack to set port 2525 because wylio/meteor-mandrill is silly
      Meteor.Mandrill.options.port = "2525"; // grr google compute engine - http://stackoverflow.com/a/26392279
      process.env.MAIL_URL = "smtp://" + Meteor.Mandrill.options.username + ":" + Meteor.Mandrill.options.key + "@" + Meteor.Mandrill.options.host + ":" + Meteor.Mandrill.options.port + "/";

    });
  }

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
});
