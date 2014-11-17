DEVEL_ACCOUNT_EMAIL = 'gjcomps';
DEVEL_ACCOUNT_PASSWORD = 'gjcomps';

if(Meteor.isServer) {
  Meteor.startup(function() {
    if(!process.env.GJCOMPS_DEVEL) {
      return;
    }

    // Create devel account
    var develUser = Meteor.users.findOne({ 'emails.address': DEVEL_ACCOUNT_EMAIL });
    if(!develUser) {
      Accounts.createUser({
        password: DEVEL_ACCOUNT_PASSWORD,
        email: DEVEL_ACCOUNT_EMAIL,
        profile: {
          name: 'gjcomps devel account',
        }
      });
      develUser = Meteor.users.findOne({ 'emails.address': DEVEL_ACCOUNT_EMAIL });
      assert(develUser);
      // Mark email as verified.
      Meteor.users.update({
        _id: develUser._id,
      }, {
        $set: {
          "emails.0.verified": true,
        }
      });
    }
  });
}

if(Meteor.isClient) {
  // Hack to allow "gjcomps" as an email address.
  var oldValidateEmail = Accounts._loginButtons.validateEmail;
  Accounts._loginButtons.validateEmail = function(email) {
    if(email == DEVEL_ACCOUNT_EMAIL) {
      return true;
    }
    return oldValidateEmail(email);
  };
}
