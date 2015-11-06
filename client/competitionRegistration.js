function getUserRegistration(userId, competitionId) {
  return Registrations.findOne({ userId, competitionId });
}

function styleRegistrationInputButtonsOnChange() {
  // style buttons to demonstrate changes need to be submitted
  $("#changeRegistrationButton").removeClass("btn-default").addClass("btn-primary");
  $("#revertFormButton").prop('disabled', false);
  $("#changeRegistrationButton").prop('disabled', false);
}

Template.competitionRegistration.helpers({
  eventOptions() {
    let competition = Competitions.findOne(this.competitionId);
    let events = competition.getEvents();

    return events.map(c => {
      return {
        label: wca.eventByCode[c.eventCode].name,
        value: wca.eventByCode[c.eventCode].code
      };
    });
  },

  defaultRegistrationData() {
    let competitionId = this.competitionId;
    let userId = Meteor.userId();
    let registration = getUserRegistration(userId, competitionId);
    if(registration) {
      return registration;
    } else {
      // populate user / competition data if there is no registration for this person yet
      return generateCompetitionRegistrationForUser(competitionId, Meteor.user());
    }
  },

  userIsRegistered() {
    let competitionId = this.competitionId;
    let userId = Meteor.userId();
    return getUserRegistration(userId, competitionId);
  },

  cannotRegisterReasons() {
    let competitionId = this.competitionId;
    return getCannotRegisterReasons(competitionId);
  },

  registrationCloseMoment() {
    let closeDate = Competitions.findOne(this.competitionId).registrationCloseDate;
    return closeDate ? moment(closeDate) : null;
  },

  needsUniqueName() {
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

  hasUniqueName() {
    let registration = getUserRegistration(Meteor.userId(), this.competitionId);
    return registration && registration.uniqueName != Meteor.user().profile.name;
  },

  registrationAskAboutGuests() {
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
    Meteor.call('deleteRegistration', registration._id, function(error) {
      if(error) {
        bootbox.alert(`Error deleting registration: ${error.reason}`);
      } else {
        $('#modalConfirmDeregistration').modal('hide');
      }
    });
  },
});

AutoForm.addHooks('registrationForm', {
  onSuccess(operation, result, template) {
    // successful submission!
    FlashMessages.sendSuccess("Submission successful!", { autoHide: true, hideDelay: 5000 });
  },

  onError(operation, error, template) {
    // unsuccessful submission... display error message
    FlashMessages.sendError("Error submitting form: " + error.message, { autoHide: true, hideDelay: 5000 });
  },
});
