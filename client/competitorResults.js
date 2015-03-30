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
  roundsByEventCode: function() {

    var eventCode = this.toString();
    var rounds = Rounds.find(
      {eventCode: eventCode}, 
      {sort: {nthRound: 1} });
    return rounds;
  },
  resultsOfRound: function() {
    console.log(this);
    var registrationId = competitorReact.get().registration._id;
    var results = Results.findOne({
      roundId: this._id,
      registrationId: registrationId
    });
    //console.log(results);
    return results.solves;
  }, 
});
