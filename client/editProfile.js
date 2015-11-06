Template.editProfile.events({
  'click #logout-button': function() {
    Meteor.logout();
  },
});

Template.editProfile.helpers({
  birthdate() {
    return moment(Meteor.user().profile.dob).utc().format("LL");
  },
  gender() {
    return wca.genderByValue(Meteor.user().profile.gender);
  },
  countryId() {
    return Meteor.user().profile.countryId.toLowerCase();
  },
});
