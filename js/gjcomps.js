Competitions = new Meteor.Collection("competitions");
People = new Meteor.Collection("people");
Rounds = new Meteor.Collection("rounds");
Results = new Meteor.Collection("results");
Groups = new Meteor.Collection("groups");

if(Meteor.isClient) {
  Template.compsTemplate.allComps = function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1
      }
    });
  };

  Template.compTemplate.events = function() {
    var events = Rounds.find(
      { competitionId: this._id }
    ).fetch();

    events = _.uniq(events, function(e) { return e.eventCode; });
    return events;
  };

  Template.compTemplate.rounds = function() {
    var rounds = Rounds.find(
      { competitionId: this.competitionId, eventCode: this.eventCode }
    );
    return rounds;
  };

  Template.roundTemplate.results = function() {
    var results = Results.find(
      { roundId: this.round._id },
      {}
    );
    return results;
  };
}
