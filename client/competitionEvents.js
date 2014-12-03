Template.competitionEvents.helpers({
  roundsInCompetition: function() {
    var mostAdvancedRound = Rounds.findOne({
      competitionId: this.competitionId,
    }, {
      sort: {
        nthRound: -1,
      },
      fields: {
        nthRound: 1,
      }
    });
    return _.range(0, mostAdvancedRound.nthRound + 1);
  },
  events: function() {
    return getCompetitionEvents(this.competitionId);
  },
  rounds: function() {
    var rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
    }, {
      sort: {
        nthRound: 1,
      }
    });
    return rounds;
  },
});
