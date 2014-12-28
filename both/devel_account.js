DEVEL_ACCOUNT_EMAIL = 'gjcomps@gjcomps.com';
DEVEL_ACCOUNT_PASSWORD = 'gjcomps';

if(Meteor.isServer) {
  Meteor.startup(function() {
    // Only create devel account if no accounts exist. I think this is an
    // acceptable zero day exploit. People should delete or remove the devel
    // account on their live servers.
    var userCount = Meteor.users.find().count();
    if(userCount === 0) {
      var develUserId = Accounts.createUser({
        password: DEVEL_ACCOUNT_PASSWORD,
        email: DEVEL_ACCOUNT_EMAIL,
        siteAdmin: true,
        profile: {
          name: "gjcomps devel account",
          countryId: "US",
          gender: "o",
          dob: new Date(),
        }
      });
      var develUser = Meteor.users.findOne({ _id: develUserId });
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
