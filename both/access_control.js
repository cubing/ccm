getCannotManageCompetitionReason = function(userId, competitionId) {
  if(!userId) {
    return new Meteor.Error(401, "Must log in");
  }
  var competition = Competitions.findOne({
    _id: competitionId,
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!competition) {
    return new Meteor.Error(404, "Competition does not exist");
  }

  var siteAdmin = getUserAttribute(userId, 'profile.siteAdmin');
  if(!siteAdmin) {
    // If the user is not a siteAdmin, then they must be an organizer
    // in order to organize =)
    competition = Competitions.findOne({
      _id: competitionId,
      organizers: userId,
    }, {
      fields: {
        _id: 1,
      }
    });
    if(!competition) {
      return new Meteor.Error(403, "Not an organizer for this competition");
    }
  }

  return false;
};

getCannotRegisterReasons = function(competitionId) {
  var reasons = [];

  var open = getCompetitionRegistrationOpenMoment(competitionId);
  var close = getCompetitionRegistrationCloseMoment(competitionId);

  if(!open || !close) {
    // open / close dates not yet set
    reasons.push("Competition registration is not open.");
  } else {
    var now = moment();
    if(now.isAfter(close)) {
      reasons.push("Competition registration is now closed!");
    } else if(now.isBefore(open)) {
      var reasonText = "Competition registration is not yet open!";
      reasonText += " Registration is set to open " + open.calendar() + ".";
      reasons.push(reasonText);
    }
  }

  // could be closed due to hitting capacity
  // if()...
  // reasons.push("Hit Total (guests + competitors) Capacity");
  // reasons.push("Hit Competitor Capacity");

  if(reasons.length > 0) {
    return reasons;
  }

  return false;
};

throwIfCannotManageCompetition = function(userId, competitionId) {
  var cannotManageReason = getCannotManageCompetitionReason(userId, competitionId);
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
        _id: round.competitionId,
      }, {
        fields: {
          _id: 1,
        }
      });
      if(getCannotManageCompetitionReason(userId, competition._id)) {
        return false;
      }

      var allowedFields = [
        'formatCode',
        'softCutoff',
        'hardCutoff',
        'size',

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
    fetch: [ 'competitionId' ],
  });

  Results.allow({
    update: function(userId, result, fields, modifier) {
      var competition = Competitions.findOne({
        _id: result.competitionId,
      }, {
        fields: {
          _id: 1,
        }
      });
      if(getCannotManageCompetitionReason(userId, competition._id)) {
        return false;
      }

      var allowedFields = [
        'solves',
      ];

      if(_.difference(fields, allowedFields).length > 0) {
        return false;
      }
      return true;
    },
    fetch: [ 'competitionId' ],
  });

  Registrations.allow({
    insert: function(userId, registration) {
      if(getCannotRegisterReasons(registration.competitionId)) {
        return false;
      }
      // can only edit entries with their user id
      return registration.userId == userId;
    },
    update: function(userId, registration, fields, modifier) {
      if(getCannotRegisterReasons(registration.competitionId)) {
        return false;
      }
      // can only edit entries with their user id
      return registration.userId == userId;
    },
  });

}
