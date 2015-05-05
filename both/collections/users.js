Meteor.users.attachSchema(new SimpleSchema({
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
      countryId:_.extend({ optional: true }, CountryIdType),
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
}));

if(Meteor.isServer) {
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
}
