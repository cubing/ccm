Template.competition.helpers({
  events: function(){
    var rounds = Rounds.find(
      { competitionId: this._id }
    ).fetch();

    var events = _.uniq(rounds, function(e){ return e.eventCode; });
    return events;
  },

  rounds: function(){
    var rounds = Rounds.find(
      { competitionId: this.competitionId, eventCode: this.eventCode }
    );
    return rounds;
  }
});
