Meteor.methods({
  createCompetition: function(competitionName){
    check(competitionName, String);
    if(competitionName.trim().length === 0){
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }

    if(!this.userId){
      throw new Meteor.Error(401, "Must log in");
    }

    Competitions.insert({
      competitionName: competitionName,
      organizers: [ this.userId ]
    });
  },
  deleteCompetition: function(competitionId){
    check(competitionId, String);

    if(!this.userId){
      throw new Meteor.Error(401, "Must log in");
    }

    var competition = Competitions.findOne({ _id: competitionId });
    if(!competition){
      throw new Meteor.Error(404, "Competition does not exist");
    }
    if(competition.organizers.indexOf(this.userId) == -1){
      throw new Meteor.Error(403, "Not an organizer for this competition");
    }

    Competitions.remove({ _id: competitionId });
    Rounds.remove({ competitionId: competitionId });
    Results.remove({ competitionId: competitionId });
    Groups.remove({ competitionId: competitionId });
  }
});
