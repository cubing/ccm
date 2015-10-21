function getUserRegistration(userId, competitionId) {
  let hasRegistrationEntry = Registrations.findOne({
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

Template.competitionRegistration.helpers({
  eventOptions: function() {
    let competitionId = this.competitionId;
    let events = getCompetitionEvents(competitionId);

    return events.map(function(c) {
      return {label: wca.eventByCode[c.eventCode].name, value: wca.eventByCode[c.eventCode].code};
    });
  },

  defaultRegistrationData: function() {
    let competitionId = this.competitionId;
    let userId = Meteor.userId();
    let registration = getUserRegistration(userId, competitionId);
    if(registration) {
      return registration;
    } else {
      // populate user / competition data if there is no registration for this person yet
      let profile = Meteor.user().profile;
      return {
        userId: userId,
        competitionId: competitionId,
        uniqueName: profile.name,
        wcaId: profile.wcaId,
        countryId: profile.countryId,
        dob: profile.dob,
        gender: profile.gender,
      };
    }
  },

  userIsRegistered: function() {
    let competitionId = this.competitionId;
    let userId = Meteor.userId();
    return getUserRegistration(userId, competitionId);
  },

  registrationFormType: function() {
    let competitionId = this.competitionId;
    let userId = Meteor.userId();
    if(getUserRegistration(userId, competitionId)) {
      // update type if there is a registration
      return "update";
    } else {
      // insert type if no registration
      return "insert";
    }
  },

  cannotRegisterReasons: function() {
    let competitionId = this.competitionId;
    return getCannotRegisterReasons(competitionId);
  },

  registrationCloseMoment: function() {
    let closeDate = Competitions.findOne(this.competitionId).registrationCloseDate;
    return closeDate ? moment(closeDate) : null;
  },

  needsUniqueName: function() {
    let competitionId = this.competitionId;
    if(getUserRegistration(Meteor.userId(), competitionId)) {
      // If we're already registered, then we don't need a unique name
      return false;
    }
    let userName = Meteor.user().profile.name;
    // See if someone already has this name?
    let registrationWithUniqueName = Registrations.findOne({
      uniqueName: userName,
      competitionId: competitionId
    }, {
      fields: { userId: 1 }
    });
    if(!registrationWithUniqueName) {
      return false;
    }
    // If the person with this name is ourselves, then we don't need a uniqueName
    if(registrationWithUniqueName.userId == Meteor.userId()) {
      return false;
    }
    return true;
  },

  hasUniqueName: function() {
    let registration = getUserRegistration(Meteor.userId(), this.competitionId);
    return registration && registration.uniqueName != Meteor.user().profile.name;
  },

  registrationAskAboutGuests: function() {
    let competitionId = this.competitionId;
    let competition = Competitions.findOne(competitionId, { fields: { registrationAskAboutGuests: 1 } });
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

    let competitionId = this.competitionId;
    let userId = Meteor.userId();
    let registration = getUserRegistration(userId, competitionId);
    Registrations.remove(registration._id);

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
    FlashMessages.sendError("Error submitting form: " + error.message, { autoHide: true, hideDelay: 5000 });
  },
});
