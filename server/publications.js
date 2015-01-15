Meteor.publish(null, function() {
  if(!this.userId) {
    return [];
  }
  return Meteor.users.find({
    _id: this.userId,
  }, {
    fields: {
      emails: 1,
      profile: 1,
      siteAdmin: 1,
    }
  });
});

var getCompetitions = function() {
  return Competitions.find(
    {},
    { fields: { wcaCompetitionId: 1, competitionName: 1, organizers: 1, listed: 1 } }
  );
};
Meteor.publish('competitions', function() {
  return getCompetitions();
});

HTTP.publish({collection: Competitions}, function(data) {
  return getCompetitions();
});

function competitionUrlIdToId(competitionUrlId) {
  var competition = Competitions.findOne({
    $or: [
      { _id: competitionUrlId },
      { wcaCompetitionId: competitionUrlId },
    ]
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!competition) {
    return null;
  }
  return competition._id;
}

Meteor.publish('competition', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Competitions.find({ _id: competitionId }),
    Rounds.find({ competitionId: competitionId }),
  ];
});

Meteor.publish('competitionUsers', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Registrations.find({ competitionId: competitionId }),
  ];
});

Meteor.publish('myCompetitionRegistration', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  var userId = this.userId;
  if(!competitionId || !userId) {
    return [];
  }
  return [
    Registrations.find({ competitionId: competitionId, userId: userId })
  ];
});

Meteor.publish('competitionRegistrationGuestCounts', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Registrations.find({competitionId: competitionId}, {guestCount: 1})
  ];
});

Meteor.publish('competitorResults', function(competitionUrlId, competitorUniqueName) {
  check(competitionUrlId, String);
  check(competitorUniqueName, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  var registration = Registrations.findOne({
    competitionId: competitionId,
    uniqueName: competitorUniqueName,
  });
  if(!registration) {
    return [];
  }
  return [
    Registrations.find({competitionId: competitionId, uniqueName: competitorUniqueName, }),
    Meteor.users.find({
      _id: registration.userId,
    }, {
      fields: {
        _id: 1,
        'profile.name': 1,
      }
    }),

    // TODO - does this need a db index?
    Results.find({ competitionId: competitionId, userId: registration.userId, }),
  ];
});

Meteor.publish('roundResults', function(competitionUrlId, eventCode, nthRound) {
  check(competitionUrlId, String);
  check(eventCode, String);
  check(nthRound, Number);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  var round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: eventCode,
    nthRound: nthRound,
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!round) {
    return [];
  }
  return [
    Results.find({ roundId: round._id, }),
  ];
});

Meteor.publish('competitionScrambles', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  if(getCannotManageCompetitionReason(this.userId, competitionId)) {
    return [];
  }

  return [
    Groups.find({ competitionId: competitionId })
  ];
});
