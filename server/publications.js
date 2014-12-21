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

function findUsers(criteria) {
  return Meteor.users.find({
    // https://github.com/jfly/gjcomps/issues/71
    //_id: {
    //  $in: _.pluck(registrations, "userId")
    //}
  }, {
    fields: {
      _id: 1,
      "profile.name": 1,
    }
  });
}

Meteor.publish('competitionUsers', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Registrations.find({ competitionId: competitionId }),
    findUsers({}),
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

Meteor.publish('competitionResults', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Results.find({ competitionId: competitionId }),
    // TODO - perhaps we should denormalize our data so everything we
    // need is in Results?
    //  https://github.com/jfly/gjcomps/issues/71#issuecomment-67763004
    findUsers({}),
  ];
});

Meteor.publish('competitorResults', function(competitionUrlId, competitorName) {
  check(competitionUrlId, String);
  check(competitorName, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }

  // TODO - what about multiple users with the same name?
  //  https://github.com/jfly/gjcomps/issues/83
  var user = Meteor.users.findOne({
    'profile.name': competitorName,
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!user) {
    return [];
  }
  return [
    Results.find({ competitionId: competitionId, userId: user._id, }),
    // TODO - perhaps we should denormalize our data so everything we
    // need is in Results?
    //  https://github.com/jfly/gjcomps/issues/71#issuecomment-67763004
    findUsers({ _id: user._id, }),
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
  return [
    Results.find({ roundId: round._id, }),
    // TODO - ideally we'd denormalize our data so that we wouldn't
    // need to publish the Users collection as well.
    findUsers({}),
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
