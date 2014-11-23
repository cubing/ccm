DEVEL_ACCOUNT_EMAIL = 'gjcomps@gjcomps.com';
DEVEL_ACCOUNT_PASSWORD = 'gjcomps';

if(Meteor.isServer) {
  Meteor.startup(function() {
    if(!process.env.GJCOMPS_DEVEL) {
      return;
    }

    // Only create devel account if it doesn't exist. That way we don't log
    // out someone who may have been logged in with the devel account already.
    var develUser = Meteor.users.findOne({ 'emails.address': DEVEL_ACCOUNT_EMAIL });
    if(!develUser) {
      var develUserId = Accounts.createUser({
        password: DEVEL_ACCOUNT_PASSWORD,
        email: DEVEL_ACCOUNT_EMAIL,
        profile: {
          name: "gjcomps devel account",
          siteAdmin: true,
          countryId: "US",
          gender: "o",
          dob: new Date(),
        }
      });
      develUser = Meteor.users.findOne({ _id: develUserId });
    }
    assert(develUser);
    // Mark email as verified.
    Meteor.users.update({
      _id: develUser._id,
    }, {
      $set: {
        "emails.0.verified": true,
      }
    });
  });
}
