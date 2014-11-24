getCannotManageCompetitionReason = function(userId, competitionUrlId) {
  if(!userId) {
    return new Meteor.Error(401, "Must log in");
  }
  var competition = Competitions.findOne({
    $or: [
      { _id: competitionUrlId },
      { wcaCompetitionId: competitionUrlId }
    ]
  }, {
    fields: {
      organizers: 1,
    }
  });
  if(!competition) {
    return new Meteor.Error(404, "Competition does not exist");
  }

  var siteAdmin = getUserAttribute(userId, 'profile.siteAdmin');
  if(!siteAdmin && competition.organizers.indexOf(userId) == -1) {
    return new Meteor.Error(403, "Not an organizer for this competition");
  }
  return false;
};

throwIfCannotManageCompetition = function(userId, competitionUrlId) {
  var cannotManageReason = getCannotManageCompetitionReason(userId, competitionUrlId);
  if(cannotManageReason) {
    throw cannotManageReason;
  }
};

canRemoveRound = function(userId, roundId) {
  check(roundId, String);
  var round = Rounds.findOne({
    _id: roundId
  }, {
    fields: {
      competitionId: 1,
      eventCode: 1,
    }
  });
  if(!round) {
    throw new Meteor.Error(404, "Unrecognized round id");
  }
  throwIfCannotManageCompetition(userId, round.competitionId);
  if(!round.eventCode) {
    // Rounds that don't correspond to a wca event are always
    // available to be deleted, no warnings.
    return true;
  }

  var lastRoundId = getLastRoundIdForEvent(round.competitionId, round.eventCode);
  var isLastRound = lastRoundId == roundId;
  // Only let the user remove the last round for an event.
  return isLastRound;
};

canAddRound = function(userId, competitionId, eventCode) {
  if(!competitionId) {
    return false;
  }
  check(competitionId, String);
  throwIfCannotManageCompetition(userId, competitionId);
  if(!wca.eventByCode[eventCode]) {
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
  return nthRound < wca.MAX_ROUNDS_PER_EVENT;
};

if(Meteor.isServer) {

  Competitions.allow({
    update: function(userId, competition, fields, modifier) {
      if(getCannotManageCompetitionReason(userId, competition._id)) {
        return false;
      }
      var allowedFields = [
        'competitionName',
        'organizers',
        'staff',

        'startDate',
        'numberOfDays',
        'calendarStartMinutes',
        'calendarEndMinutes',
        'registrationOpenDate',
        'registrationCloseDate',
      ];

      var siteAdmin = getUserAttribute(userId, 'profile.siteAdmin');
      if(siteAdmin) {
        allowedFields.push("listed");
        allowedFields.push('wcaCompetitionId');
      }

      if(_.difference(fields, allowedFields).length > 0) {
        return false;
      }
      return true;
    },
  });

  Rounds.allow({
    update: function(userId, round, fields, modifier) {
      var competition = Competitions.findOne({
        _id: round.competitionId
      }, {
        fields: {
          _id: 1
        }
      });
      if(getCannotManageCompetitionReason(userId, competition._id)) {
        return false;
      }

      var allowedFields = [
        'formatCode',

        'nthDay',
        'startMinutes',
        'durationMinutes',
        'title',
        'status',
      ];

      if(_.difference(fields, allowedFields).length > 0) {
        return false;
      }
      return true;
    },
    fetch: [ 'competitionId' ]
  });


  Registrations.allow({
    insert: function(userId, registration) {
      // can only edit entries with their user id
      if(registration.userId == userId) {
        return true;
      } else {
        return false;
      }
    },
    update: function(userId, registration, fields, modifier) {
      // can only edit entries with their user id
      if(registration.userId == userId) {
        return true;
      } else {
        return false;
      }
    },
  });

}
