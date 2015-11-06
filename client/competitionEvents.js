Template.competitionEvents.helpers({
  competition: function() {
    return Competitions.findOne(this.competitionId);
  },

  rounds: function() {
    let data = Template.parentData(1);
    let eventCode = this.toString();
    let rounds = Rounds.find({
      competitionId: data.competitionId,
      eventCode: eventCode,
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },
});
