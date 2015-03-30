var competitorReact = new ReactiveVar(null);
Template.participantResults.created = function() {
  competitorReact.set(null);
};

Template.participantResults.helpers({
  competitorName: function() {
    competitorReact.set(this);
    return this.registration.uniqueName;
  },
  competitorRounds: function() {
    return this.registration.checkedInEvents;
  },
  eventName: function(eventCode) {
    //return Meteor.call('eventName', {"eventCode": eventCode});
    return wca.eventByCode[eventCode].name;
  },
  roundsByEventCode: function() {
    var eventCode = this.toString();
    var rounds = Rounds.find(
      {eventCode: eventCode},
      {sort: {nthRound: 1} });
    return rounds;
  },
  resultsOfRound: function() {
    var registrationId = competitorReact.get().registration._id;
    var results = Results.findOne({
      roundId: this._id,
      registrationId: registrationId
    });
    if(results) {
      return results.solves;
    }
    return;
  },
});
