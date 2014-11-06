Template.competition.helpers({
  events: function(){
    var rounds = Rounds.find({
      competitionId: this.competitionId
    }, {
      fields: {
        eventCode: 1,
        competitionId: 1,
      }
    }).fetch();

    var events = _.uniq(rounds, function(e){ return e.eventCode; });
    return events;
  },

  rounds: function(){
    var rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode
    }, {
      fields: {
        roundCode: 1,
        eventCode: 1,
      }
    });
    return rounds;
  }
});
