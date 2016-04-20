Schema.user = new SimpleSchema({
  emails: {
    type: [Object],
  },
  "emails.$.address": {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
  },
  "emails.$.verified": {
    type: Boolean,
  },
  siteAdmin: {
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  createdAt: {
    type: Date
  },
  profile: {
    type: new SimpleSchema({
      name: {
        label: "Name",
        type: String,
        optional: true,
      },
      wcaId: _.extend({ optional: true }, WcaIdType),
      countryId: _.extend({ optional: true }, CountryIdType),
      gender: _.extend({ optional: true }, GenderType),
      dob: _.extend({ optional: true }, DobType),
    }),
    optional: true,
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true,
  },
});

Meteor.users.attachSchema(Schema.user);

if(Meteor.isServer) {
  // Do not allow users with duplicate WCA ids.
  Meteor.users._ensureIndex({
    'profile.wcaId': 1,
  }, {
    unique: 1,
    sparse: 1,
  });

  Accounts.onCreateUser(function(options, user) {
    // Transform to match our users schema
    if(options.profile.email) {
      user.emails = [{
        address: options.profile.email,
        verified: true,
      }];
      delete options.profile.email;
    }
    if(options.profile) {
      user.profile = options.profile;
    }
    return user;
  });

  // Dirty hack to update user account emails when people sign in with WCA.
  // Meteor's OAuth code doesn't do this for us. We'll be able to clean this up
  // a little if we ever get the onUpdateUser hook mentioned here:
  // https://github.com/meteor/meteor/blob/53cc021064a1dabc02ea811e2a8c2d9977d34c4a/packages/accounts-base/accounts_server.js#L1359-L1360
  //let old = AccountsServer.prototype.updateOrCreateUserFromExternalService;
  //AccountsServer.prototype.updateOrCreateUserFromExternalService = function(serviceName, serviceData, options) {
  //  let result = old.apply(this, arguments);
  //  this.users.update(result.userId, {
  //    $set: {
  //      emails: [{
  //        address: serviceData.email,
  //        verified: true,
  //      }]
  //    }
  //  });
  //  return result;
  //};

  copyUserWcaDataToProfile = function(user) {
    let wca = user.services.worldcubeassociation;
    if(wca) {
      Meteor.users.update(user._id, {
        $set: {
          'profile.name': wca.name,
          'profile.wcaId': wca.wca_id,
          'profile.countryId': wca.country_iso2,
          'profile.gender': wca.gender,
          'profile.dob': wca.dob,
        }
      });
    }
  };
  Accounts.onLogin(function(user_wrapper) {
    let user = user_wrapper.user;
    copyUserWcaDataToProfile(user);
  });
}
