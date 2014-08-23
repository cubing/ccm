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
    var rounds = Rounds.find(
      { competitionId: this._id }
    ).fetch();

    var events = _.uniq(rounds, function(e) { return e.eventCode; });
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
      { competitionId: this.competition._id, roundId: this.round._id }
    );
    return results;
  };

  Template.roundTemplate.personName = function() {
    var person = People.findOne(
      { _id: this.personId },
      { fields: {name: 1} }
    );
    if(!person) {
      return null;
    }
    return person.name;
  };

  Template.personTemplate.results = function() {
    var results = Results.find(
      { competitionId: this.competition._id, personId: this.person._id }
    );
    return results;
  };
}

if(Meteor.isServer) {
  Meteor.publish('competitions', function() {
    return Competitions.find({}, { fields: { wcaCompetitionId: 1 } });
  });

  Meteor.publish('competition', function(wcaCompetitionId) {
    var competition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
    return [
      Competitions.find({ _id: competition._id }),
      Rounds.find({ competitionId: competition._id }),
      Results.find({ competitionId: competition._id }),
      People.find({_id: {$in: _.pluck(competition.people, "_id")}}, {fields:{_id:1, name:1, wcaId:1, countryId:1, gender:1}})
    ];
  });
}
