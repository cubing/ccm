getCannotManageCompetitionReason = function(userId, competitionId) {
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

  if(!user.siteAdmin) {
    // If the user is not a siteAdmin, then they must be an organizer
    // in order to manage =)
    let registration = Registrations.findOne({
      competitionId: competitionId,
      userId: userId,
    }, {
      fields: { organizer: 1 }
    });
    if(!registration || !registration.organizer) {
      return new Meteor.Error(403, "Not an organizer for this competition");
    }
  }

  return false;
};

getCannotRegisterReasons = function(competitionId) {
  let reasonText; // re-usable

  let competition = Competitions.findOne(competitionId);
  if(!competition.registrationOpenDate || !competition.registrationCloseDate) {
    // open / close dates not yet set
    return ["Competition registration is not open."];
  }

  let now = moment();
  let open = moment(competition.registrationOpenDate);
  let close = moment(competition.registrationCloseDate);

  if(now.isAfter(close)) {
    return ["Competition registration is now closed!"];
  }
  if(now.isBefore(open)) {
    reasonText = "Competition registration is not yet open!";
    let openStr = formatMomentDateTime(open);
    reasonText += " Registration is set to open" +
                  " <strong>" + open.fromNow() + "</strong>" +
                  " on " + openStr + ".";
    return [reasonText];
  }

  let reasons = [];
  // Check to make sure profile has appropriate data
  let user = Meteor.user();
  reasonText = "You need to complete your user profile to register!";
  if(!user.profile) {
    reasons.push(reasonText);
  } else {
    if(!user.profile.name) {
      reasons.push(reasonText + " Please add your name to your profile.");
    }
    if(!user.profile.dob) {
      reasons.push(reasonText + " Please provide a birthdate in your profile.");
    }
    if(!user.profile.countryId) {
      reasons.push(reasonText + " Please specify a country in your profile.");
    }
    if(!user.profile.gender) {
      reasons.push(reasonText + " Please specify your gender in your profile.");
    }
  }
  if(!user.emails[0].verified) {
    reasons.push("Please confirm your email address.");
  }

  // Registration should close upon hitting capacity;
  // Users already registered should still be able to edit registrations
  if(!Registrations.findOne({userId: Meteor.userId(), competitionId: competitionId})) {
    // participant capacity limit
    let numParticipants;
    if(competition.registrationParticipantLimitCount) {
      numParticipants = Registrations.find({competitionId: competitionId}, {}).count();
      if(numParticipants >= competition.registrationParticipantLimitCount) {
        reasons.push("Registration has reached the maximum number of allowed participants.");
      }
    }
    // total venue capacity limit
    if(competition.registrationAttendeeLimitCount) {
      let registrationGuestData = Registrations.find({competitionId: competitionId}, {fields: {guestCount: 1}});
      numParticipants = registrationGuestData.count();
      let guestTotalCount = 0;
      registrationGuestData.forEach(obj => {
        guestTotalCount += obj.guestCount > 0 ? obj.guestCount : 0;
      });
      if(numParticipants + guestTotalCount >= competition.registrationAttendeeLimitCount) {
        reasons.push("Registration has reached the maximum number of allowed competitors and guests.");
      }
    }
  }

  if(reasons.length > 0) {
    return reasons;
  }

  return false;
};

throwIfCannotManageCompetition = function(userId, competitionId) {
  let cannotManageReason = getCannotManageCompetitionReason(userId, competitionId);
  if(cannotManageReason) {
    throw cannotManageReason;
  }
};

canRemoveRound = function(userId, roundId) {
  check(roundId, String);
  let round = Rounds.findOne(roundId);
  if(!round) {
    throw new Meteor.Error(404, "Unrecognized round id");
  }
  throwIfCannotManageCompetition(userId, round.competitionId);

  // Only let the user remove the last round for an event.
  return round.isLast();
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
      if(getCannotManageCompetitionReason(userId, competition._id)) {
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
      if(getCannotManageCompetitionReason(userId, round.competitionId)) {
        return false;
      }
      let allowedFields = [
        'formatCode',
        'softCutoff',
        'hardCutoff',
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
      if(getCannotManageCompetitionReason(userId, scheduleEvent.competitionId)) {
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

  RoundProgresses.allow({
    update: function(userId, progress, fields, modifier) {
      if(getCannotManageCompetitionReason(userId, progress.competitionId)) {
        return false;
      }
      let allowedFields = [
        'done',
        'total',
      ];
      return onlyAllowedFields(fields, allowedFields);
    },
  });

  Results.allow({
    update: function(userId, result, fields, modifier) {
      if(getCannotManageCompetitionReason(userId, result.competitionId)) {
        return false;
      }
      let allowedFields = [
        'solves',

        'updatedAt',
        'createdAt',
      ];
      return onlyAllowedFields(fields, allowedFields);
    },
    fetch: [ 'competitionId' ],
  });

  Registrations.allow({
    insert: function(userId, registration) {
      return Registrations.allowOperation(userId, registration, []);
    },
    update: function(userId, registration, fields, modifier) {
      return Registrations.allowOperation(userId, registration, fields);
    },
    remove: function(userId, registration) {
      return Registrations.allowOperation(userId, registration, []);
    },
  });

  Registrations.allowOperation = function(userId, registration, fields) {
    if(!getCannotManageCompetitionReason(userId, registration.competitionId)) {
      // If you're allowed to manage the competition, you can change anyone's registration.
      return true;
    }
    if(getCannotRegisterReasons(registration.competitionId)) {
      return false;
    }
    // can only edit entries with own user id
    if(registration.userId != userId) {
      return false;
    }
    let allowedFields = [
      'userId',
      'competitionId',
      'uniqueName',
      'registeredEvents',
      'guestCount',
      'comments',

      'updatedAt',
      'createdAt',
    ];
    return onlyAllowedFields(fields, allowedFields);
  };
}
