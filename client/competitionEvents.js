Template.competitionEvents.helpers({
  roundsInCompetition: function() {
    let mostAdvancedRound = Rounds.findOne({
      competitionId: this.competitionId,
    }, {
      sort: { nthRound: -1 },
      fields: { nthRound: 1 }
    });
    return _.range(1, mostAdvancedRound.nthRound + 1);
  },
  events: function() {
    return getCompetitionEvents(this.competitionId);
  },
  rounds: function() {
    let rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
    },
      { sort: { nthRound: 1 } }
    );
    return rounds;
  },
});
