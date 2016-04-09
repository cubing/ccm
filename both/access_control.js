getCannotManageCompetitionReason = function(userId, competitionId, role) {
  if(!userId) {
    return new Meteor.Error(401, "Must log in");
  }
  let user = Meteor.users.findOne(userId, { fields: { siteAdmin: 1 } });
  if(!user) {
    return new Meteor.Error(401, "User " + userId + " not found");
  }
  let competition = Competitions.findOne(competitionId, { fields: { _id: 1 } });
  if(!competition) {
    return new Meteor.Error(404, "Competition does not exist");
  }

  if(!competition.userHasRole(userId, role)) {
    return new Meteor.Error(403, `You are not allowed to ${role} for this competition`);
  }

  return false;
};

throwIfCannotManageCompetition = function(userId, competitionId, role) {
  let cannotManageReason = getCannotManageCompetitionReason(userId, competitionId, role);
  if(cannotManageReason) {
    throw cannotManageReason;
  }
};

throwIfNotLoggedIn = function(userId) {
  if(!userId) {
    throw new Meteor.Error(401, "Must log in");
  }
};

canRemoveRound = function(userId, roundId) {
  check(roundId, String);
  let round = Rounds.findOne(roundId);
  if(!round) {
    throw new Meteor.Error(404, "Unrecognized round id");
  }
  if(getCannotManageCompetitionReason(userId, round.competitionId, 'manageEvents')) {
    return false;
  }

  // Only let the user remove the last round for an event.
  return round.isLast();
};

canAddRound = function(userId, competitionId, eventCode) {
  if(!competitionId) {
    return false;
  }
  check(competitionId, String);
  if(getCannotManageCompetitionReason(userId, competitionId, 'manageEvents')) {
    return false;
  }
  if(!wca.eventByCode[eventCode]) {
    throw new Meteor.Error(404, "Unrecognized event code");
  }

  let rounds = Rounds.find({
    competitionId: competitionId,
    eventCode: eventCode
  }, {
    fields: { _id: 1 }
  });
  let nthRound = rounds.count();
  return nthRound < wca.MAX_ROUNDS_PER_EVENT;
};

function onlyAllowedFields(fields, allowedFields) {
  return _.difference(fields, allowedFields).length === 0;
}

if(Meteor.isServer) {

  Competitions.allow({
    update: function(userId, competition, fields, modifier) {
      if(getCannotManageCompetitionReason(userId, competition._id, 'manageCompetitionMetadata')) {
        return false;
      }
      let allowedFields = [
        'competitionName',
        'organizers',

        'startDate',
        'numberOfDays',
        'calendarStartMinutes',
        'calendarEndMinutes',
        'registrationOpenDate',
        'registrationCloseDate',
        'registrationAskAboutGuests',
        'registrationEnforceAttendanceLimit',
        'registrationParticipantLimitCount',
        'registrationAttendeeLimitCount',
        'updatedAt',
        'createdAt',
        'location',
      ];

      if(isSiteAdmin(userId)) {
        allowedFields.push('listed', 'wcaCompetitionId');
      }

      return onlyAllowedFields(fields, allowedFields);
    },
  });

  Rounds.allow({
    update: function(userId, round, fields, modifier) {
      if(getCannotManageCompetitionReason(userId, round.competitionId, 'manageEvents')) {
        return false;
      }
      let allowedFields = [
        'formatCode',
        'softCutoff',
        'timeLimit',
        'size',

        'status',

        'updatedAt',
        'createdAt',
      ];

      return onlyAllowedFields(fields, allowedFields);
    },
    fetch: [ 'competitionId' ],
  });

  ScheduleEvents.allow({
    update: function(userId, scheduleEvent, fields, modifier) {
      if(getCannotManageCompetitionReason(userId, scheduleEvent.competitionId, 'manageSchedule')) {
        return false;
      }
      let allowedFields = [
        'nthDay',
        'startMinutes',
        'durationMinutes',
        'title',
      ];
      return onlyAllowedFields(fields, allowedFields);
    },
  });
}
