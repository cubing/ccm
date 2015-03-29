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
    var registrationId = competitorReact.get().registration._id;
    var eventCode = this.toString();
    var rounds = Rounds.find(
      {eventCode: eventCode}, 
      {sort: {nthRound: 1} });
    return rounds;
  },
  results: function() {
    var results = [];
    var r = Results.find({
      roundId: this._id,
      registrationId: registrationId
    }).fetch();
    results = results.concat(r);
    return [1,2,3];
  }, 
});
