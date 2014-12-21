function getUserRegistration(userId, competitionId) {
  var hasRegistrationEntry = Registrations.findOne({
    userId: userId,
    competitionId: competitionId,
  });

  return hasRegistrationEntry;
}

function styleRegistrationInputButtonsOnChange() {
  // style buttons to demonstrate changes need to be submitted
  $("#changeRegistrationButton").removeClass("btn-default").addClass("btn-primary");
  $("#revertFormButton").prop('disabled', false);
  $("#changeRegistrationButton").prop('disabled', false);
}

Template.competitionRegistration.rendered = function() {
  var template = this;
  template.autorun(function() {

  });
};

Template.competitionRegistration.helpers({
  eventOptions: function() {
    var competitionId = this.competitionId;
    var events = getCompetitionEvents(competitionId);

    return events.map(function(c) {
      return {label: wca.eventByCode[c.eventCode].name, value: wca.eventByCode[c.eventCode].code};
    });
  },

  defaultRegistrationData: function() {
    var competitionId = this.competitionId;
    var userId = Meteor.userId();
    var registration = getUserRegistration(userId, competitionId);
    if(registration) {
      return registration;
    } else {
      // populate user / competition data if there is no registration for this person yet
      return {
        userId: userId,
        competitionId: competitionId,
      };
    }
  },

  userIsRegistered: function() {
    var competitionId = this.competitionId;
    var userId = Meteor.userId();
    return getUserRegistration(userId, competitionId);
  },

  registrationFormType: function() {
    var competitionId = this.competitionId;
    var userId = Meteor.userId();
    if(getUserRegistration(userId, competitionId)) {
      // update type if there is a registration
      return "update";
    } else {
      // insert type if no registration
      return "insert";
    }
  },

  cannotRegisterReasons: function() {
    var competitionId = this.competitionId;

    return getCannotRegisterReasons(competitionId);
  },

  registrationCloseMomentText: function() {
    var competitionId = this.competitionId;
    var close = getCompetitionRegistrationCloseMoment(competitionId);

    if(close) {
      return "Please note that registration closes on " + close.format("dddd, MMMM Do YYYY, h:mm:ss a");
    } else {
      // no close date specified.
      return "Registration is currently open.";
    }
  },

});

Template.competitionRegistration.events({
  'change form': function() {
    styleRegistrationInputButtonsOnChange();
  },
  'input': function() {
    styleRegistrationInputButtonsOnChange();
  },

  'click #unregisterButton': function(e, t) {
    e.preventDefault();
    // Need to re-implement unregister functionality.

    $('#modalConfirmDeregistration').modal('hide');
  },
});

AutoForm.addHooks('registrationForm', {
  onSuccess: function(operation, result, template) {
    // successful submission!
    FlashMessages.sendSuccess("Submission successful!", { autoHide: true, hideDelay: 5000 });
  },
  onError: function(operation, error, template) {
    // unsuccessful submission... display error message
    FlashMessages.sendError("Error submitting form!", { autoHide: true, hideDelay: 5000 });
  },
});
