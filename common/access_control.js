throwUnlessOrganizer = function(userId, competitionUrlId){
  if(!userId){
    throw new Meteor.Error(401, "Must log in");
  }

  var competition = Competitions.findOne({
    $or: [
      { _id: competitionUrlId },
      { wcaCompetitionId: competitionUrlId }
    ]
  });
  if(!competition){
    throw new Meteor.Error(404, "Competition does not exist");
  }
  if(competition.organizers.indexOf(userId) == -1){
    throw new Meteor.Error(403, "Not an organizer for this competition");
  }
};

canRemoveRound = function(userId, roundId){
  check(roundId, String);
  var round = Rounds.findOne({ _id: roundId });
  if(!round){
    throw new Meteor.Error(404, "Unrecognized round id");
  }
  throwUnlessOrganizer(userId, round.competitionId);

  var lastRound = Rounds.findOne({
    competitionId: round.competitionId,
    eventCode: round.eventCode
  }, {
    sort: {
      "nthRound": -1
    }
  });
  var isLastRound = lastRound._id == roundId;
  var noResults = true; // TODO - actually compute this<<<
  return isLastRound && noResults;
};

canAddRound = function(userId, competitionId, eventCode){
  if(!competitionId){
    return false;
  }
  check(competitionId, String);
  throwUnlessOrganizer(userId, competitionId);
  if(!wca.eventByCode[eventCode]){
    throw new Meteor.Error(404, "Unrecognized event code");
  }

  var rounds = Rounds.find({
    competitionId: competitionId,
    eventCode: eventCode
  }, {
    fields: {
      _id: 1
    }
  });
  var nthRound = rounds.count();
  return nthRound < wca.maxRoundsPerEvent;
};

if(Meteor.isServer) {

  Competitions.allow({
    update: function(userId, competition, fields, modifier){
      if(competition.organizers.indexOf(userId) == -1){
        return false;
      }
      var allowedFields = [
        'competitionName',
        'wcaCompetitionId',
        'organizers',
        'staff',

        'startDate',
        'numberOfDays',
        'calendarStartMinutes',
        'calendarEndMinutes',
      ];

      // TODO - see https://github.com/jfly/gjcomps/issues/10
      allowedFields.push("listed");

      if(_.difference(fields, allowedFields).length > 0){
        return false;
      }
      return true;
    },
    fetch: [ 'organizers' ]
  });

  Rounds.allow({
    update: function(userId, round, fields, modifier){
      var competition = Competitions.findOne({
        _id: round.competitionId
      });
      if(competition.organizers.indexOf(userId) == -1){
        return false;
      }

      var allowedFields = [
        'formatCode',

        'nthDay',
        'startMinutes',
        'durationMinutes',
        'title',
      ];

      if(_.difference(fields, allowedFields).length > 0){
        return false;
      }
      return true;
    },
    fetch: []
  });

}
