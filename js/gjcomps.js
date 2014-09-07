Competitions = new Meteor.Collection("competitions");
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

  Template.roundTemplate.competitorName = function() {
    var user = Meteor.users.findOne(
      { _id: this.userId },
      { fields: {"profile.name": 1} }
    );
    if(!user) {
      return null;
    }
    return user.profile.name;
  };

  Template.competitorTemplate.results = function() {
    var results = Results.find(
      { competitionId: this.competition._id, userId: this.user._id }
    );
    return results;
  };

  Template.organizerTemplate.myCompetitions = function() {
    var myCompetitions =  Competitions.find(
      { organizers: { $elemMatch: { $in: [ Meteor.userId() ] } } }
    );
    return myCompetitions;
  };

  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
  });
}

if(Meteor.isServer) {
  Meteor.publish('competitions', function() {
    return Competitions.find({}, { fields: { wcaCompetitionId: 1, organizers: 1 } });
  });

  Meteor.publish('competition', function(wcaCompetitionId) {
    var competition = Competitions.findOne({ wcaCompetitionId: wcaCompetitionId });
    if(!competition) {
      // TODO - what if the competition is created later? How will that data
      // get pushed out to users?
      return;
    }
    return [
      Competitions.find({ _id: competition._id }),
      Rounds.find({ competitionId: competition._id }),
      Results.find({ competitionId: competition._id }),
      Meteor.users.find(
        {_id: {$in: _.pluck(competition.competitors, "_id")}}, 
        {fields:{_id:1, "profile.name":1, "profile.wcaId":1, "profile.countryId":1, "profile.gender":1}}
      )
    ];
  });
}
