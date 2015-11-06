Template.competitionEvents.helpers({
  competition: function() {
    return Competitions.findOne(this.competitionId);
  },

  rounds: function() {
    let rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },
});
