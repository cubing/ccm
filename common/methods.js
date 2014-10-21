function checkIsOrganizer(userId, competitionId){
  if(!userId){
    throw new Meteor.Error(401, "Must log in");
  }

  var competition = Competitions.findOne({ _id: competitionId });
  if(!competition){
    throw new Meteor.Error(404, "Competition does not exist");
  }
  if(competition.organizers.indexOf(userId) == -1){
    throw new Meteor.Error(403, "Not an organizer for this competition");
  }
}

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
    checkIsOrganizer(this.userId, competitionId);

    Competitions.remove({ _id: competitionId });
    Rounds.remove({ competitionId: competitionId });
    Results.remove({ competitionId: competitionId });
    Groups.remove({ competitionId: competitionId });
  },
  addRound: function(competitionId, eventCode){
    check(competitionId, String);
    checkIsOrganizer(this.userId, competitionId);

    if(!wca.eventByCode[eventCode]){
      throw new Meteor.Error(404, "Unrecognized event code");
    }

    console.log(competitionId, eventCode);//<<<
    Rounds.insert({
      competitionId: competitionId,
      eventCode: eventCode,
      roundCode: "2",//<<<
      formatCode: "a"//<<<
    });
  },
  removeRound: function(roundId){
    check(roundId, String);
    var round = Rounds.findOne({ _id: roundId });
    if(!round){
      throw new Meteor.Error(404, "Unrecognized round id");
    }
    checkIsOrganizer(this.userId, round.competitionId);

    // TODO - only let people delete the last round, and when it has
    // no results entered yet.
    Rounds.remove({
      _id: roundId
    });
  }
});
