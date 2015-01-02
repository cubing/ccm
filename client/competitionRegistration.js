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
      var defaultUniqueName = Meteor.user().profile.name;
      return {
        userId: userId,
        competitionId: competitionId,
        uniqueName: defaultUniqueName,
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

  registrationCloseMoment: function() {
    var competitionId = this.competitionId;
    return getCompetitionRegistrationCloseMoment(competitionId);
  },

  needsUniqueName: function() {
    var competitionId = this.competitionId;
    var userName = Meteor.user().profile.name;
    // See if someone already has this name?
    return Registrations.findOne({
      uniqueName: userName,
      competitionId: competitionId
    }, {
      _id: 1,
    });
  },

  registrationAskAboutGuests: function() {
    var competitionId = this.competitionId;
    competition = Competitions.findOne({
      _id: competitionId,
    }, {
      registrationAskAboutGuests: 1,
    });
    return competition.registrationAskAboutGuests;
  }
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
