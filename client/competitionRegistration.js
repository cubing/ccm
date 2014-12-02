function getUserRegistration(userId, competitionId) {
  var hasRegistrationEntry = Registrations.findOne({
    userId: userId,
    competitionId: competitionId,
  });

  return hasRegistrationEntry;
}

Template.competitionRegistration.rendered = function() {
  var template = this;
  template.autorun(function() {

  });
};

Template.competitionRegistration.helpers({
  eventOptions: function () {
    var competitionId = this.competitionId;
    var events = getCompetitionEvents(competitionId);

    return events.map(function (c) {
      return {label: wca.eventByCode[c.eventCode].name, value: wca.eventByCode[c.eventCode].code};
    });
  },

  defaultRegistrationData: function () {
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

  registrationFormType: function () {
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

  registrationIsOpen: function() {
    var competitionId = this.competitionId;

    var open = getCompetitionRegistrationOpenMoment(competitionId);
    var close = getCompetitionRegistrationCloseMoment(competitionId);
    var now = moment();
    if(now.isAfter(close)) {
      throw new Meteor.Error(403,
            'Competition registration is now closed!');
      return false;
    }
    if(now.isBefore(open)) {
      throw new Meteor.Error(403,
            'Competition registration is not yet open!');
      return false;
    }
    return true;
  },

  registrationCloseMomentText: function() {
    var competitionId = this.competitionId;

    var close = getCompetitionRegistrationCloseMoment(competitionId);

    return close.format("dddd, MMMM Do YYYY, h:mm:ss a");
  },

});

Template.competitionRegistration.events({

});
