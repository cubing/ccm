Template.editProfile.helpers({
  defaultProfileData: function() {
    var userId = Meteor.userId();
    var profile = Meteor.users.findOne(userId);
    if(profile) {
      return profile;
    } else {
      throw new Meteor.Error(404, "Person not found.");
    }
  },
});

AutoForm.addHooks('profileForm', {
  onSuccess: function(operation, result, template) {
    // successful submission!
    FlashMessages.sendSuccess("Submission successful!", { autoHide: true, hideDelay: 5000 });
  },
  onError: function(operation, error, template) {
    // unsuccessful submission... display error message
    FlashMessages.sendError("Error submitting form!", { autoHide: true, hideDelay: 5000 });
  },
});
